# Windows Setup Guide

Outworked runs natively on Windows 10/11 (x64). This guide covers setup from scratch.

---

## Prerequisites

### Required

- **Node.js 20+** — [nodejs.org](https://nodejs.org/) (LTS recommended)
- **Git** — [git-scm.com](https://git-scm.com/) (includes Git Bash, which Claude Code needs)
- **Claude Code** — installed and authenticated (`npm install -g @anthropic-ai/claude-code`, then `claude` to log in)

### Required for building the .exe installer

- **Developer Mode** — required so electron-builder can extract its toolchain (which contains macOS symlinks that Windows otherwise blocks). One-time toggle:

  **Settings > System > For developers > Developer Mode > On**

  Without this, the NSIS build will fail with a symlink privilege error. If you can't enable Developer Mode, you can run the build from an Administrator terminal instead.

### Optional

- **Visual Studio Build Tools** with "Desktop development with C++" — only needed if `better-sqlite3` fails to compile during `npm install`. Most users won't need this because the postinstall uses prebuilt binaries.

---

## Quick Start

```bash
git clone https://github.com/outworked/outworked.git
cd outworked
npm install
npm run electron:dev
```

If `npm install` fails on `better-sqlite3`, run:

```bash
npx electron-rebuild -f -w better-sqlite3
```

---

## Building the Installer

```bash
npm run electron:build
```

This produces `dist/Outworked Setup X.X.X.exe` — a standard NSIS installer that:

- Lets the user choose the install directory
- Creates a desktop shortcut
- Registers an uninstaller in Add/Remove Programs

### Build prerequisites

- Developer Mode enabled (see above), **or** run from an Administrator terminal
- All `npm install` dependencies in place

### Build troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot create symbolic link` / exit status 2 | Developer Mode is off | Enable Developer Mode in Windows Settings, or run as Administrator |
| `better-sqlite3` compile failure | Missing C++ build tools | Install VS Build Tools with "Desktop development with C++" workload |
| `EINVAL` when spawning Claude Code | SDK found `.cmd` wrapper instead of `cli.js` | Reinstall Claude Code: `npm install -g @anthropic-ai/claude-code` |

---

## Platform Differences from macOS

### Channels

| Channel | macOS | Windows |
|---------|-------|---------|
| iMessage | Yes | No (macOS-only, hidden on Windows) |
| Discord | Yes | Yes |
| Telegram | Yes | Yes |
| Slack | Yes | Yes |

iMessage is automatically hidden in the UI on Windows. Discord and Telegram are the recommended replacements for personal messaging.

### Shell

- Agents run shell commands via `cmd.exe` on Windows (macOS uses `/bin/zsh`)
- Claude Code itself uses Git Bash internally — Outworked auto-detects the Git Bash path
- Standard commands like `ls`, `cat`, `grep` work through Claude Code's own shell

### File paths

- All paths use `path.join()` internally, so forward/back slashes are handled correctly
- User data lives at `%USERPROFILE%\.outworked\` (e.g., `C:\Users\you\.outworked\`)
- Music: `%USERPROFILE%\.outworked\music\`
- Asset packs: `%USERPROFILE%\.outworked\assets\`
- Database: `%USERPROFILE%\.outworked\outworked.db`

### Cloudflare tunneling

- The Windows binary (`cloudflared-windows-amd64.exe`) is downloaded automatically on first use
- Stored at `%USERPROFILE%\.outworked\cloudflared.exe`

---

## Setting Up Discord

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create a new application and go to **Bot**
3. Click **Reset Token** and copy the token
4. Under **Privileged Gateway Intents**, enable **Message Content Intent**
5. Under **OAuth2 > URL Generator**, check `bot` scope with Read Messages, Send Messages, and Read Message History permissions
6. Use the generated URL to invite the bot to your server
7. In Outworked, go to **Channels > + Add Channel > Discord** and paste the token

See [`electron/channels/discord-channel.md`](electron/channels/discord-channel.md) for full details.

## Setting Up Telegram

1. Open Telegram and message **@BotFather**
2. Send `/newbot`, pick a name and username
3. Copy the bot token
4. In Outworked, go to **Channels > + Add Channel > Telegram** and paste the token

See [`electron/channels/telegram-channel.md`](electron/channels/telegram-channel.md) for full details.

---

## Known Limitations

- **No iMessage** — macOS-only (requires AppleScript and the Messages database)
- **No WhatsApp** — `whatsapp-web.js` is fragile and violates WhatsApp's ToS; skipped intentionally
- **Code signing** — the .exe is not signed, so Windows Defender SmartScreen will show a warning on first run. Users can click "More info > Run anyway". Signing requires a code signing certificate.
- **Auto-updater** — `electron-updater` is configured but requires Windows release assets on GitHub to function. The first Windows release will enable this.

---

## Development

### Dev mode

```bash
npm run electron:dev
```

Opens the app with hot-reload for the React frontend. Electron main process changes require a restart.

### Verbose logging

```bash
VERBOSE_LOGGING=true npm run electron:dev
```

### Project structure (Windows-relevant files)

```
electron/
├── main.js           # Platform detection, shell spawning (cmd.exe on Windows)
├── sdk-bridge.js     # Claude Code SDK bridge (cli.js path, Git Bash detection)
├── channels/
│   ├── index.js      # Auto-discovery with platform filtering
│   ├── discord-channel.js
│   ├── telegram-channel.js
│   ├── slack-channel.js
│   └── imessage-channel.js  # Filtered out on Windows (platforms: ["darwin"])
└── mcp/
    └── mcp-server.js # Cloudflared download (Windows binary), 'where' instead of 'which'

electron-builder.yml  # NSIS target config, icon.ico
build/icon.ico        # Windows application icon
```
