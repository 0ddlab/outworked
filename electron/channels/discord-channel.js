// ─── Discord Channel ──────────────────────────────────────────────
// Connects to Discord via gateway (WebSocket) using discord.js.
// Listens for messages and sends replies via the REST API.

const BaseChannel = require("./base-channel");

// discord.js is loaded lazily so that missing the package doesn't crash
// the entire channel registry at startup.
function loadDiscordJs() {
  try {
    return require("discord.js");
  } catch (err) {
    throw new Error(
      `discord.js is not installed. Run: npm install discord.js\n${err.message}`,
    );
  }
}

class DiscordChannel extends BaseChannel {
  static get metadata() {
    return {
      type: "discord",
      label: "Discord",
      color: "indigo",
      description:
        "Connects to Discord via gateway WebSocket. Requires a bot token with Message Content intent enabled in the Discord Developer Portal.",
      fields: [
        {
          key: "botToken",
          label: "Bot Token",
          type: "password",
          placeholder: "MTQ5MD...",
          hint: "Found in Discord Developer Portal → Your App → Bot → Token.",
          required: true,
        },
        {
          key: "channelIds",
          label: "Channel IDs to Monitor",
          type: "text",
          placeholder: "123456789012345678, 987654321098765432",
          hint: "Comma-separated Discord channel IDs. Leave blank to respond in any channel the bot can see.",
          required: false,
          isList: true,
        },
        {
          key: "respondOnlyWhenMentioned",
          label: "Respond only when @mentioned",
          type: "boolean",
          hint: "When enabled, the bot only acts on messages that @mention it.",
          required: false,
        },
      ],
    };
  }

  constructor(id, name, config = {}) {
    super(id, "discord", name, config);

    this.botToken = config.botToken || "";
    this.channelIds = Array.isArray(config.channelIds)
      ? config.channelIds
      : [];
    this.respondOnlyWhenMentioned = config.respondOnlyWhenMentioned || false;

    /** @type {import('discord.js').Client | null} */
    this._client = null;

    /** @type {string | null} Bot's own user ID — set after login */
    this._botUserId = null;
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  async connect() {
    if (!this.botToken) {
      throw new Error("Discord channel requires a botToken in its config");
    }

    const { Client, GatewayIntentBits, Partials } = loadDiscordJs();

    // MessageContent is a privileged intent — must be enabled in the Discord
    // Developer Portal under Bot → Privileged Gateway Intents → Message Content Intent.
    // Without it, message.content will be empty in guild channels.
    this._client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    this._client.on("messageCreate", (message) => {
      this._handleMessage(message);
    });

    this._client.on("error", (err) => {
      console.error(`[Discord] Client error: ${err.message}`);
      this.status = "error";
      this.errorMessage = err.message;
    });

    this._client.on("disconnect", () => {
      console.warn("[Discord] Client disconnected");
      if (this.status !== "disconnected") {
        this.status = "error";
        this.errorMessage = "Disconnected from Discord gateway";
      }
    });

    try {
      await this._client.login(this.botToken);
    } catch (err) {
      if (err.message?.toLowerCase().includes("disallowed intents")) {
        throw new Error(
          "Discord Message Content intent is not enabled. Go to discord.com/developers → Your App → Bot → Privileged Gateway Intents → turn on Message Content Intent.",
        );
      }
      throw err;
    }

    this._botUserId = this._client.user?.id || null;
    this.status = "connected";
    this.errorMessage = null;

    console.log(
      `[Discord] Connected as ${this._client.user?.tag} (${this._botUserId})`,
    );
  }

  async disconnect() {
    if (this._client) {
      try {
        this._client.destroy();
      } catch {
        /* ignore */
      }
      this._client = null;
    }
    this._botUserId = null;
    await super.disconnect();
  }

  // ─── Outbound messaging ───────────────────────────────────────

  /**
   * Send a message to a Discord channel or thread.
   *
   * @param {string} conversationId - Discord channel ID, or "CHANNEL_ID:THREAD_ID"
   *                                  to reply in a thread / forum post.
   * @param {string} content        - Message text (plain text or Discord markdown)
   */
  async sendMessage(conversationId, content) {
    if (!this._client) {
      throw new Error("Discord channel is not connected");
    }

    // Support thread replies: "CHANNEL_ID:THREAD_ID"
    let channelId = conversationId;
    let threadId = null;

    if (conversationId.includes(":")) {
      const parts = conversationId.split(":");
      channelId = parts[0];
      threadId = parts[1];
    }

    const target = threadId
      ? await this._client.channels.fetch(threadId).catch(() => null) ||
        await this._client.channels.fetch(channelId)
      : await this._client.channels.fetch(channelId);

    if (!target) {
      throw new Error(`Discord channel/thread ${conversationId} not found`);
    }

    // Discord has a 2000-char limit per message; split if needed.
    const chunks = splitMessage(content, 2000);
    for (const chunk of chunks) {
      await target.send(chunk);
    }
  }

  // ─── Inbound message handler ──────────────────────────────────

  _handleMessage(message) {
    // Ignore messages from the bot itself.
    if (message.author.id === this._botUserId) return;

    // Ignore system messages.
    if (message.author.bot) return;

    // Filter by monitored channel IDs if configured.
    if (
      this.channelIds.length > 0 &&
      !this.channelIds.includes(message.channelId) &&
      !this.channelIds.includes(message.channel?.parentId)
    ) {
      return;
    }

    const text = message.content.trim();
    if (!text) return;

    // @mention filter.
    if (this.respondOnlyWhenMentioned && this._botUserId) {
      const mentioned =
        message.mentions.users.has(this._botUserId) ||
        text.includes(`<@${this._botUserId}>`) ||
        text.includes(`<@!${this._botUserId}>`);
      if (!mentioned) return;
    }

    // Build conversationId — use "CHANNEL:THREAD" for threads/forum posts so
    // sendMessage can reply into the correct thread.
    const isThread =
      message.channel?.isThread?.() ||
      message.channel?.type === 11 || // PUBLIC_THREAD
      message.channel?.type === 12;   // PRIVATE_THREAD

    const conversationId = isThread
      ? `${message.channel.parentId}:${message.channelId}`
      : message.channelId;

    const inboundMsg = {
      channelId: this.id,
      direction: "inbound",
      conversationId,
      sender: `${message.author.username}#${message.author.discriminator || "0"}`,
      content: text,
      metadata: {
        discordChannelId: message.channelId,
        messageId: message.id,
        guildId: message.guildId || null,
        threadId: isThread ? message.channelId : null,
      },
      timestamp: message.createdTimestamp,
    };

    this._emitInbound(inboundMsg);
  }
}

/**
 * Split a long string into chunks no longer than `limit` characters,
 * preferring to break at newlines or spaces.
 *
 * @param {string} text
 * @param {number} limit
 * @returns {string[]}
 */
function splitMessage(text, limit) {
  if (text.length <= limit) return [text];
  const chunks = [];
  while (text.length > 0) {
    if (text.length <= limit) {
      chunks.push(text);
      break;
    }
    let cut = text.lastIndexOf("\n", limit);
    if (cut <= 0) cut = text.lastIndexOf(" ", limit);
    if (cut <= 0) cut = limit;
    chunks.push(text.slice(0, cut));
    text = text.slice(cut).trimStart();
  }
  return chunks;
}

module.exports = DiscordChannel;
