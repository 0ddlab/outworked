# Music Player

Outworked ships with a built-in music player that plays background tracks while you work.

## Adding Your Own Tracks

Drop audio files into `~/.outworked/music/` and they'll appear alongside the bundled soundtrack in the player.

### Supported Formats

- `.mp3`
- `.wav`
- `.ogg`
- `.m4a`
- `.flac`

### How It Works

- The `~/.outworked/music/` folder is created automatically on first launch
- Subfolders are scanned recursively up to 4 levels deep — organize by genre, mood, etc.
- Tracks are picked up the next time the app loads (or the track list refreshes)
- If a file has ID3 metadata (mp3), the title tag is used as the display name
- Otherwise the filename is cleaned up and used as the title (e.g. `my_cool_song.mp3` → "my cool song")
- User tracks are shuffled into the playlist alongside the built-in tracks

### Tips

- No need to restart — just relaunch or reload the app after adding new files
- Keep filenames simple; special characters are handled but clean names look better in the player

<details>
<summary>Developer Notes</summary>

### Architecture

- **Bundled tracks** live in `public/music/` and are served as relative paths (`./music/filename.mp3`)
- **User tracks** live in `~/.outworked/music/` and are served via a custom `user-music://` Electron protocol
- The `user-music` scheme is registered as privileged (stream + fetch) before `app.whenReady()`
- `protocol.handle("user-music", ...)` in `setupMusicIPC()` maps requests to the user music directory via `net.fetch`

### Key Files

- `electron/main.js` — `setupMusicIPC()`, `getBundledMusicDir()`, `getUserMusicDir()`, `readTitle()` (ID3 parser)
- `electron/preload.js` — exposes `music.listTracks()` to the renderer
- `src/components/MusicPlayer.tsx` — React player component with shuffle, play/pause, skip, mute

### Track Object Shape

```js
{
  file: "song.mp3",       // original filename
  title: "Song",          // ID3 title or cleaned filename
  src: "./music/song.mp3" // or "user-music://song.mp3" for user tracks
  user: false              // true for user-provided tracks
}
```

</details>
