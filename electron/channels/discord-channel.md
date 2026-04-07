# Discord Channel

Connect a Discord server to Outworked so the agent can monitor channels and reply to messages.

## Before You Start

You'll need a Discord bot with the Message Content intent enabled.

### 1. Create a Discord App & Bot

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to **Bot** in the left sidebar
4. Click **Reset Token**, copy the token — keep it secret

### 2. Enable Message Content Intent

Still on the **Bot** page, scroll to **Privileged Gateway Intents** and enable:

- **Message Content Intent** ← required to read message text

Click **Save Changes**.

### 3. Invite the Bot to Your Server

1. Go to **OAuth2 → URL Generator**
2. Under **Scopes**, check `bot`
3. Under **Bot Permissions**, check:
   - `Read Messages/View Channels`
   - `Send Messages`
   - `Read Message History`
4. Copy the generated URL, open it in your browser, and invite the bot to your server

### 4. Get Channel IDs

In Discord, enable Developer Mode:
**User Settings → Advanced → Developer Mode**

Then right-click any channel → **Copy Channel ID**.

## Form Fields

- **Channel Name** — a display name for this channel in Outworked (defaults to "Discord")
- **Bot Token** — your bot token from the Developer Portal (required)
- **Channel IDs to Monitor** — comma-separated Discord channel IDs. Leave blank to respond in any channel the bot can see.
- **Respond only when @mentioned** — when checked, the bot only acts on messages that @mention it
- **System Instructions** — optional prompt that tells the agent how to respond on this channel

## How It Works

- Once connected, Outworked opens a persistent WebSocket (gateway) connection to Discord
- Messages arrive in real time — no polling delay
- Thread replies are supported — use `CHANNEL_ID:THREAD_ID` as the conversationId
- DMs to the bot are also supported

## Tips

- Leave **Channel IDs** blank and use **@mention only** mode to let the bot respond anywhere it's invited but only when called
- Use **System Instructions** to set tone and format, e.g. "Keep replies under 3 sentences"
- Discord has a 2000-character message limit — longer replies are automatically split

<details>
<summary>Developer Notes</summary>

### Registration

- Generates an ID like `discord-1711500000000`
- Calls `channel:register` IPC → `channel-manager.js`
- Creates a `DiscordChannel` instance, wires up the inbound handler, saves config to SQLite

### Connection

- Calls `channel:connect` IPC → `DiscordChannel.connect()` (`discord-channel.js`)
- Creates a discord.js `Client` with Guilds, GuildMessages, MessageContent, DirectMessages intents
- Logs in via WebSocket gateway — real-time event-driven (no polling)

### Inbound Message Flow

- `messageCreate` event fires → `_handleMessage()` → `_emitInbound()`
- Channel manager persists to SQLite, pushes to renderer via `channel:inbound` IPC
- Trigger engine evaluates — if no trigger matches, fires a default prompt to the boss agent

### Outbound Message Flow

- Agent calls `send_message` tool with `channelId` and `conversationId`
- Channel manager → `DiscordChannel.sendMessage()` → `channel.send()`
- Threads: `conversationId` of `CHANNEL_ID:THREAD_ID` routes to the thread

### Key Implementation Details

- **Thread support:** Forum posts and thread channels get a `conversationId` of `PARENT_CHANNEL_ID:THREAD_ID`
- **Message splitting:** Messages over 2000 chars are split at newlines or spaces
- **Self-filtering:** Bot's own messages are ignored by checking `message.author.id === _botUserId`
- **Bot filtering:** Messages from other bots are ignored

</details>
