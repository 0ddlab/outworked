# Telegram Channel

Connect a Telegram bot to Outworked so agents can send and receive messages.

## Before You Start

You need a Telegram bot token from @BotFather.

### 1. Create a Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name and a username (must end in `bot`)
4. Copy the **token** — it looks like `123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

### 2. Add the Bot to a Chat (optional)

- For private chats: just message the bot directly
- For group chats: add the bot as a member, then send `/start`

### 3. Get Chat IDs (optional)

If you want to restrict which chats the bot listens to, you need the chat ID:
- Message the bot, then open: `https://api.telegram.org/bot<TOKEN>/getUpdates`
- Find `"chat":{"id": ...}` in the response

## Form Fields

- **Bot Token** — from @BotFather (required)
- **Allowed Chat IDs** — comma-separated. Leave blank to respond to all chats.
- **Respond only when @mentioned** — in group chats, only act when the bot is tagged
- **System Instructions** — optional prompt to shape how the agent responds

## How It Works

- Outworked uses long-polling — the bot receives updates in real time
- In private chats, every message triggers the agent
- Replies quote the original message so threads stay readable
- 4096-char limit per message — longer responses are split automatically

## Tips

- Use **Allowed Chat IDs** to lock the bot to specific chats for security
- Use **System Instructions** to give the bot a persona or constrain its behavior
- The bot must be an admin in groups to read all messages (not just commands)

<details>
<summary>Developer Notes</summary>

### Connection

- Uses Telegraf's long-polling via `bot.launch()`
- Bot identity resolved via `getMe()` on connect
- `_botUsername` used for @mention filtering in groups

### Inbound Flow

- Telegraf `message` event → `_handleUpdate()` → `_emitInbound()`
- `conversationId` is `CHAT_ID:MESSAGE_ID` so `sendMessage` can quote-reply

### Outbound Flow

- Agent calls `send_message` with the `conversationId`
- `sendMessage()` uses `telegram.sendMessage()` with `reply_parameters` if a message ID is present
- Messages over 4096 chars are split at newlines/spaces

</details>
