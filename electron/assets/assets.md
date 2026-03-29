# Custom Asset Packs

Outworked supports custom asset packs that let you completely reskin the office. A single pack can include custom **employee sprites**, **furniture**, **backgrounds**, and **fonts** — or any combination.

## Quick Start

1. Click the grid icon in the sidebar header to open the **Assets** modal
2. Click **Import Pack...** to select a folder, or **Open Folder** to add files directly to `~/.outworked/assets/`
3. Select your pack from the list — changes apply immediately

No manifest needed for simple packs. The app auto-detects PNGs, fonts, and backgrounds.

A bundled example pack (`outworked-default`) is installed on first launch with working examples of every category.

## Directory Structure

The simplest pack is just a folder with a PNG:

```
~/.outworked/assets/
  my-pack/
    default.png          # employee sprite sheet — that's all you need!
```

A full pack with everything:

```
~/.outworked/assets/
  my-pack/
    manifest.json        # optional — everything auto-detects without it
    background.png       # replaces the office background
    myfont.ttf           # replaces the UI font
    employees/
      default.png        # sprite sheet used for all agents
      engineer.png       # role-specific sheet
      designer.png
    furniture/
      desk_wooden.png    # auto-detected as a desk
      bookshelf.png
      plant_big.png
```

PNGs can live at the top level or in `employees/`/`furniture/` subfolders. Both are scanned. If there's no file named `default.png`, the first PNG found is used as the default.

## manifest.json (Optional)

A manifest lets you set metadata and fine-tune settings. Without one, the app auto-detects everything.

```json
{
  "name": "My Pack",
  "author": "Your Name",
  "version": "1.0",
  "categories": {
    "employees": { ... },
    "furniture": { ... },
    "background": { ... },
    "font": { ... }
  }
}
```

See the bundled `outworked-default` pack for a fully documented `manifest.json` with inline `_docs` explaining every field.

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | Yes | folder name | Display name for the pack |
| `author` | No | - | Pack author |
| `version` | No | - | Pack version |
| `categories` | Yes | - | Asset categories (see sections below) |

---

## Employees — Custom Character Sprites

Replace the procedural pixel characters with your own sprite sheets.

### Employee Category Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `frameSize` | No | auto-detect | Width and height of each frame (square). Use `frameWidth`/`frameHeight` for non-square |
| `frameWidth` | No | auto-detect | Frame width in pixels |
| `frameHeight` | No | auto-detect | Frame height in pixels |
| `framesPerState` | No | auto-detect | Number of animation frames per state |
| `states` | No | `["idle","walk","type","think"]` | Order of states in horizontal strips |
| `frameRates` | No | `{idle:2, walk:5, type:6, think:2}` | FPS per animation state |
| `rows` | No | auto-detect | Map state names to row indices for grid sheets |
| `sheets` | Yes | - | Map of role names to PNG file paths |

### Sprite Sheet Layouts

The system supports two layouts:

**Horizontal Strip** (single row) — frames left-to-right in order: idle, walk, type, think:

```
[idle_0][idle_1][walk_0][walk_1][type_0][type_1][think_0][think_1]
```

With 2 frames per state and 48px frames = **384 x 48 pixels** total.

**Multi-Row Grid** — each row is one animation state:

```
Row 0: [idle_0] [idle_1] [idle_2] ...
Row 1: [type_0] [type_1] [type_2] ...
Row 2: [walk_0] [walk_1] [walk_2] ...
Row 3: [think_0][think_1][think_2] ...
```

Default row mapping (4+ rows): idle=0, type=1, walk=2, think=3. Override with the `rows` field.

### Animation States

| State | When Used | Default FPS | Suggested Motion |
|-------|-----------|------------|-----------------|
| `idle` | Standing around | 2 | Subtle breathing/blinking |
| `walk` | Moving to a desk or collaborating | 5 | Walking cycle |
| `type` | Working, speaking, or background task | 6 | Typing at keyboard |
| `think` | Thinking | 2 | Hand on chin, looking up |

### Overriding States

Change which section of the strip maps to which state:

```json
{ "states": ["walk", "idle", "type", "think"] }
```

Reuse states if your sheet has fewer than 4 animations (missing states fall back to idle):

```json
{ "states": ["idle", "walk", "walk", "idle"], "framesPerState": 3 }
```

### Overriding Frame Rates

```json
{ "frameRates": { "idle": 1, "walk": 8, "type": 4, "think": 1 } }
```

### Role-Specific Sheets

Different sprites per agent role. Agents with roles that don't match any key get the `default` sheet, or sheets are distributed randomly:

```json
{
  "sheets": {
    "default": "employees/default.png",
    "engineer": "employees/engineer.png",
    "designer": "employees/designer.png"
  }
}
```

You can also set a specific sprite per agent in the Agent Editor (Appearance section).

### Auto-Detection

If you don't set frame sizes or state mappings, the system auto-detects from the image:
- **Frame dimensions**: exact multiples of 48px use 48px frames; otherwise content analysis finds frame boundaries
- **Grid layout**: single-row images use horizontal strip mode; 4+ rows use grid mode
- **State mapping**: based on row count and layout detection

For best results, use transparent backgrounds and dimensions that are multiples of 48px.

---

## Furniture — Custom Office Items

Add custom furniture PNGs alongside or instead of the built-in items.

### Furniture Category Fields

```json
{
  "furniture": {
    "items": {
      "wooden_desk": { "file": "furniture/desk.png", "desk": true },
      "bookshelf": { "file": "furniture/bookshelf.png", "tilesWide": 2 },
      "tall_plant": { "file": "furniture/plant.png", "tilesWide": 1, "tilesTall": 2 }
    }
  }
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `file` | Yes | - | Relative path to PNG |
| `desk` | No | auto-detect | If true, agents sit here when working |
| `tilesWide` | No | auto-detect | Width in tiles (48px each) |
| `tilesTall` | No | auto-detect | Height in tiles (48px each) |

Without a manifest, all PNGs in a `furniture/` subfolder are auto-detected.

### Desk Detection

Items are auto-detected as desks if the filename is `desk`, or starts with `desk_` or `desk-`. Or set `"desk": true` in the manifest.

### Managing Furniture

- Open the **Assets** modal → **Furniture** tab to add or remove items
- Both custom pack items and built-in procedural furniture can be added
- **Long press** any furniture in the office to enter edit mode (move, rotate, delete)
- Furniture layout persists across restarts

### Tile Sizing

- Images at tile scale (dimensions ≥ 72px) are divided by 48px to determine tile count
- Smaller pixel art is sized by aspect ratio: wide → 2x1, tall → 1x2, square → 1x1 or 2x2
- For best results, use dimensions that are multiples of 48px
- Override with `tilesWide` and `tilesTall` in the manifest

---

## Background — Custom Office Scene

Replace the default office floor, walls, rug, and windows with a custom image.

### Background Fields

```json
{
  "background": {
    "file": "background.png",
    "mode": "cover"
  }
}
```

Or just drop a `background.png` (or `bg.png`) into your pack folder — no manifest needed.

| Mode | Description |
|------|-------------|
| `cover` | Scale to fill maintaining aspect ratio (default) |
| `stretch` | Stretch to exact office dimensions |
| `tile` | Repeat the image across the office |

### Tips

- The office grid is typically 16x10 tiles (768x480 pixels)
- For `cover` mode, use images at least 768x480 for best quality
- For `tile` mode, use small seamless textures (e.g. 48x48 or 96x96)

---

## Font — Custom UI Font

Replace the default UI font with your own.

### Font Fields

```json
{
  "font": {
    "file": "myfont.ttf",
    "name": "My Custom Font"
  }
}
```

Or just drop a `.ttf`, `.woff`, `.woff2`, or `.otf` file into your pack folder.

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `file` | Yes | - | Relative path to the font file |
| `name` | No | `"CustomPixelFont"` | Font family name |

The font replaces all UI text using the pixel font style (headers, buttons, labels). Changes take effect immediately when switching packs.

---

## Managing Packs

### In the App

Click the **grid icon** in the sidebar header (next to "AI Agent HQ") to open the Assets modal:

- **Packs tab** — Select the active pack. Click **Import Pack...** to copy a pack from anywhere on your machine, or **Open Folder** to open `~/.outworked/assets/` in Finder.
- **Furniture tab** — Add built-in or custom furniture items to the office. Remove items you've added.
- **Info tab** — This documentation.

Switching packs applies all changes immediately — no restart needed.

### Sharing Packs

Packs are self-contained folders. To share one, just zip the folder and send it. To install, unzip into `~/.outworked/assets/` or use **Import Pack**.

### Bundled Pack

The `outworked-default` pack is installed automatically on first launch. It includes example employees, furniture, a background, and a font, with a fully documented `manifest.json` you can use as a template.

<details>
<summary>Developer Notes</summary>

### Architecture

- **Asset packs** live in `~/.outworked/assets/` — each subfolder with a valid `manifest.json` (or auto-detected PNGs) is a pack
- **Assets** are served to the renderer via a custom `user-assets://` Electron protocol
- The protocol is registered as privileged (`supportFetchAPI`) before `app.whenReady()`
- CSP directives include `user-assets:` for `connect-src`, `img-src`, and `font-src`
- Pack switching is instant via the `asset-pack-changed` window event
- Furniture changes use `furniture-add` / `furniture-remove` custom events

### Key Files

| File | Purpose |
|------|---------|
| `electron/main.js` | `setupAssetsIPC()` — protocol, scanning, import, active pack setting |
| `electron/preload.js` | IPC bridge for `assets.*` methods |
| `electron/assets/assets.md` | This documentation |
| `src/lib/assetPack.ts` | Types, renderer API, font loader, helpers |
| `src/phaser/SpriteGen.ts` | `registerAgentFromSheet()`, grid detection, sprite loading |
| `src/phaser/FurnitureGen.ts` | Procedural furniture drawing functions |
| `src/phaser/OfficeScene.ts` | Pack loading, furniture management, background rendering |
| `src/components/AssetsModal.tsx` | Pack picker, furniture manager, info tab |
| `scripts/generate-default-pack.js` | Generates the bundled default pack |

### IPC Channels

| Channel | Description |
|---------|-------------|
| `assets:listPacks` | Scan and return all available packs |
| `assets:getActivePack` | Get active pack ID from settings |
| `assets:setActivePack` | Set active pack ID |
| `assets:importPack` | Open folder picker, copy to assets dir |
| `assets:openFolder` | Open assets dir in native file manager |
| `assets:getReadme` | Return this documentation as markdown |

</details>
