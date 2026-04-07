// ─── Telegram Channel ─────────────────────────────────────────────
// Connects to Telegram via a bot token using Telegraf.
// Listens for messages via long-polling and sends replies via the Bot API.

const BaseChannel = require("./base-channel");

function loadTelegraf() {
  try {
    return require("telegraf");
  } catch (err) {
    throw new Error(
      `telegraf is not installed. Run: npm install telegraf\n${err.message}`,
    );
  }
}

class TelegramChannel extends BaseChannel {
  static get metadata() {
    return {
      type: "telegram",
      label: "Telegram",
      color: "cyan",
      description:
        "Connects to Telegram via a bot token. Create a bot with @BotFather to get started.",
      fields: [
        {
          key: "botToken",
          label: "Bot Token",
          type: "password",
          placeholder: "123456:ABC-DEF...",
          hint: "Get this from @BotFather on Telegram.",
          required: true,
        },
        {
          key: "allowedChatIds",
          label: "Allowed Chat IDs",
          type: "text",
          placeholder: "123456789, -987654321",
          hint: "Comma-separated chat IDs to listen to. Leave blank to respond to all chats.",
          required: false,
          isList: true,
        },
        {
          key: "respondOnlyWhenMentioned",
          label: "Respond only when @mentioned",
          type: "boolean",
          hint: "In group chats, only respond when the bot is @mentioned.",
          required: false,
        },
      ],
    };
  }

  constructor(id, name, config = {}) {
    super(id, "telegram", name, config);

    this.botToken = config.botToken || "";
    this.allowedChatIds = new Set(
      (Array.isArray(config.allowedChatIds) ? config.allowedChatIds : [])
        .map((id) => String(id).trim())
        .filter(Boolean),
    );
    this.respondOnlyWhenMentioned = config.respondOnlyWhenMentioned || false;

    /** @type {import('telegraf').Telegraf | null} */
    this._bot = null;

    /** @type {string | null} Bot's @username — set after launch */
    this._botUsername = null;

    /** @type {number | null} Bot's numeric user ID */
    this._botUserId = null;
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  async connect() {
    if (!this.botToken) {
      throw new Error("Telegram channel requires a botToken in its config");
    }

    const { Telegraf } = loadTelegraf();

    this._bot = new Telegraf(this.botToken);

    // Resolve bot identity
    const me = await this._bot.telegram.getMe();
    this._botUsername = me.username || null;
    this._botUserId = me.id;

    console.log(`[Telegram] Connected as @${this._botUsername} (${this._botUserId})`);

    // Register message handler
    this._bot.on("message", (ctx) => {
      this._handleUpdate(ctx).catch((err) => {
        console.error(`[Telegram] Handler error: ${err.message}`);
      });
    });

    // Start long-polling — don't await, it runs in the background
    this._bot.launch().catch((err) => {
      if (this.status !== "disconnected") {
        console.error(`[Telegram] Launch error: ${err.message}`);
        this.status = "error";
        this.errorMessage = err.message;
      }
    });

    this.status = "connected";
    this.errorMessage = null;
  }

  async disconnect() {
    if (this._bot) {
      try {
        this._bot.stop("disconnect");
      } catch {
        /* ignore */
      }
      this._bot = null;
    }
    this._botUsername = null;
    this._botUserId = null;
    await super.disconnect();
  }

  // ─── Outbound messaging ───────────────────────────────────────

  /**
   * Send a message to a Telegram chat.
   *
   * @param {string} conversationId - Telegram chat ID (numeric string), or
   *                                  "CHAT_ID:REPLY_TO_MSG_ID" to quote-reply.
   * @param {string} content        - Message text (plain text or HTML)
   */
  async sendMessage(conversationId, content) {
    if (!this._bot) {
      throw new Error("Telegram channel is not connected");
    }

    let chatId = conversationId;
    let replyToMessageId = undefined;

    if (conversationId.includes(":")) {
      const parts = conversationId.split(":");
      chatId = parts[0];
      replyToMessageId = parseInt(parts[1], 10) || undefined;
    }

    // Telegram has a 4096-char limit per message; split if needed.
    const chunks = splitMessage(content, 4096);
    for (const chunk of chunks) {
      await this._bot.telegram.sendMessage(chatId, chunk, {
        ...(replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {}),
      });
    }
  }

  // ─── Inbound message handler ──────────────────────────────────

  async _handleUpdate(ctx) {
    const msg = ctx.message;
    if (!msg) return;

    // Ignore messages from the bot itself
    if (msg.from?.id === this._botUserId) return;

    // Only handle text messages
    const text = msg.text?.trim();
    if (!text) return;

    const chatId = String(msg.chat.id);
    const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";

    // Filter by allowed chat IDs if configured
    if (this.allowedChatIds.size > 0 && !this.allowedChatIds.has(chatId)) {
      return;
    }

    // @mention filter (mainly useful in groups)
    if (this.respondOnlyWhenMentioned && isGroup) {
      const botUsername = this._botUsername;
      const mentioned =
        (msg.entities || []).some(
          (e) =>
            e.type === "mention" &&
            text.slice(e.offset, e.offset + e.length) === `@${botUsername}`,
        ) || text.includes(`@${botUsername}`);
      if (!mentioned) return;
    }

    // Strip @mention prefix if present (common in groups)
    const cleanText = this._botUsername
      ? text.replace(new RegExp(`^@${this._botUsername}\\s*`, "i"), "").trim()
      : text;

    if (!cleanText) return;

    // conversationId: "CHAT_ID:REPLY_MSG_ID" so replies quote the triggering message
    const conversationId = `${chatId}:${msg.message_id}`;

    const senderName =
      [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
      msg.from?.username ||
      String(msg.from?.id || "unknown");

    const inboundMsg = {
      channelId: this.id,
      direction: "inbound",
      conversationId,
      sender: senderName,
      content: cleanText,
      metadata: {
        telegramChatId: chatId,
        messageId: msg.message_id,
        chatType: msg.chat.type,
        username: msg.from?.username || null,
      },
      timestamp: msg.date * 1000,
    };

    this._emitInbound(inboundMsg);
  }
}

/**
 * Split a long string into chunks no longer than `limit` chars,
 * preferring to break at newlines or spaces.
 */
function splitMessage(text, limit) {
  if (text.length <= limit) return [text];
  const chunks = [];
  while (text.length > 0) {
    if (text.length <= limit) { chunks.push(text); break; }
    let cut = text.lastIndexOf("\n", limit);
    if (cut <= 0) cut = text.lastIndexOf(" ", limit);
    if (cut <= 0) cut = limit;
    chunks.push(text.slice(0, cut));
    text = text.slice(cut).trimStart();
  }
  return chunks;
}

module.exports = TelegramChannel;
