#!/usr/bin/env node
/**
 * Generates the bundled "outworked-default" asset pack.
 * Creates pixel-art PNGs for background, furniture, and employee sprites.
 * Output goes to public/assets/outworked-default/
 *
 * Usage: node scripts/generate-default-pack.js
 * Requires: npm install canvas (dev dependency)
 */

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "public", "assets", "outworked-default");
const TILE = 48;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function savePng(canvas, filePath) {
  const buf = canvas.toBuffer("image/png");
  fs.writeFileSync(filePath, buf);
  console.log(`  wrote ${path.relative(OUT, filePath)} (${buf.length} bytes)`);
}

// ─── Color helpers ───
function hex(n) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

// ─── Background: cozy office floor + walls ───
function generateBackground() {
  const cols = 16, rows = 10;
  const w = cols * TILE, h = rows * TILE;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  // Wood floor
  const planks = [0x7a5c3e, 0x6d5236, 0x8a6a48, 0x7a5c3e, 0x6d5236];
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = hex(planks[r % planks.length]);
    ctx.fillRect(0, r * TILE, w, TILE);
    // Plank lines
    ctx.strokeStyle = "rgba(90,66,46,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, r * TILE);
    ctx.lineTo(w, r * TILE);
    ctx.stroke();
    // Vertical joints
    const offset = (r % 2) * (TILE * 1.5);
    ctx.strokeStyle = "rgba(90,66,46,0.2)";
    for (let x = offset; x < w; x += TILE * 3) {
      ctx.beginPath();
      ctx.moveTo(x, r * TILE);
      ctx.lineTo(x, (r + 1) * TILE);
      ctx.stroke();
    }
  }

  // Wall (top 1.5 tiles)
  const wallH = TILE * 1.5;
  ctx.fillStyle = hex(0x2a2a40);
  ctx.fillRect(0, 0, w, wallH);
  ctx.fillStyle = hex(0x1e1e32);
  ctx.fillRect(0, 0, w, 6);
  // Baseboard
  ctx.fillStyle = hex(0x4a3a2a);
  ctx.fillRect(0, wallH - 5, w, 5);

  // Windows
  const winCount = 4;
  for (let i = 0; i < winCount; i++) {
    const wx = Math.floor((i + 0.5) * (cols / winCount)) * TILE + 4;
    const wy = 10;
    const ww = TILE - 8;
    const wh = wallH - 24;
    ctx.fillStyle = hex(0x87ceeb);
    ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = hex(0x5a5a7a);
    ctx.lineWidth = 2;
    ctx.strokeRect(wx, wy, ww, wh);
    // Cross frame
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh * 0.4);
    ctx.lineTo(wx + ww, wy + wh * 0.4);
    ctx.stroke();
  }

  // Center rug
  const rugW = 8, rugH = 4;
  const rugX = Math.floor((cols - rugW) / 2) * TILE;
  const rugY = Math.floor((rows - rugH) / 2) * TILE;
  ctx.fillStyle = hex(0x6b2737);
  ctx.fillRect(rugX, rugY, rugW * TILE, rugH * TILE);
  ctx.strokeStyle = hex(0x8b4757);
  ctx.lineWidth = 3;
  ctx.strokeRect(rugX + 4, rugY + 4, rugW * TILE - 8, rugH * TILE - 8);

  savePng(canvas, path.join(OUT, "background.png"));
}

// ─── Furniture pieces ───
function generateFurniture() {
  ensureDir(path.join(OUT, "furniture"));

  // Desk (2x1 tiles)
  {
    const canvas = createCanvas(TILE * 2, TILE);
    const ctx = canvas.getContext("2d");
    // Table surface
    ctx.fillStyle = hex(0x6d553f);
    ctx.fillRect(0, 6, TILE * 2, TILE - 10);
    ctx.fillStyle = hex(0x7d6549);
    ctx.fillRect(0, 0, TILE * 2, 8);
    // Legs
    ctx.fillStyle = hex(0x4a3728);
    ctx.fillRect(4, 10, 4, TILE - 12);
    ctx.fillRect(TILE * 2 - 8, 10, 4, TILE - 12);
    // Monitor
    ctx.fillStyle = hex(0x333344);
    ctx.fillRect(TILE - 15, -18, 30, 22);
    ctx.fillStyle = hex(0x1a1a2e);
    ctx.fillRect(TILE - 13, -16, 26, 16);
    // Screen glow
    ctx.fillStyle = hex(0x00d4ff);
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(TILE - 11, -14 + i * 3, 10 + (i * 5 % 12), 1.5);
    }
    ctx.globalAlpha = 1;
    savePng(canvas, path.join(OUT, "furniture", "desk.png"));
  }

  // Plant (1x1 tile)
  {
    const canvas = createCanvas(TILE, TILE);
    const ctx = canvas.getContext("2d");
    // Pot
    ctx.fillStyle = hex(0x8b5e3c);
    ctx.beginPath();
    ctx.moveTo(14, 30);
    ctx.lineTo(34, 30);
    ctx.lineTo(30, 46);
    ctx.lineTo(18, 46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hex(0xa67048);
    ctx.fillRect(12, 28, 24, 4);
    // Leaves
    ctx.fillStyle = hex(0x2d6a4f);
    ctx.beginPath();
    ctx.arc(24, 18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hex(0x3d8a6f);
    ctx.beginPath();
    ctx.arc(20, 14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28, 16, 6, 0, Math.PI * 2);
    ctx.fill();
    savePng(canvas, path.join(OUT, "furniture", "plant.png"));
  }

  // Bookshelf (2x1 tiles)
  {
    const canvas = createCanvas(TILE * 2, TILE);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = hex(0x6b4c2a);
    ctx.fillRect(0, 0, TILE * 2, TILE);
    ctx.fillStyle = hex(0x5b3c1a);
    ctx.fillRect(0, TILE / 2 - 1, TILE * 2, 2);
    // Books
    const colors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22];
    for (let shelf = 0; shelf < 2; shelf++) {
      let bx = 3;
      for (let i = 0; i < 8; i++) {
        const bw = 5 + Math.floor(Math.random() * 5);
        const bh = 16 + Math.floor(Math.random() * 6);
        ctx.fillStyle = hex(colors[i % colors.length]);
        ctx.fillRect(bx, shelf * (TILE / 2) + (TILE / 2 - bh) - 1, bw, bh);
        bx += bw + 1;
      }
    }
    savePng(canvas, path.join(OUT, "furniture", "bookshelf.png"));
  }

  // Couch (2x1 tiles)
  {
    const canvas = createCanvas(TILE * 2, TILE);
    const ctx = canvas.getContext("2d");
    // Back
    ctx.fillStyle = hex(0x2c3e50);
    ctx.fillRect(4, 4, TILE * 2 - 8, 14);
    // Seat
    ctx.fillStyle = hex(0x34495e);
    ctx.fillRect(4, 18, TILE * 2 - 8, 20);
    // Cushion line
    ctx.strokeStyle = hex(0x2c3e50);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(TILE, 18);
    ctx.lineTo(TILE, 38);
    ctx.stroke();
    // Arms
    ctx.fillStyle = hex(0x243342);
    ctx.fillRect(0, 8, 6, 32);
    ctx.fillRect(TILE * 2 - 6, 8, 6, 32);
    savePng(canvas, path.join(OUT, "furniture", "couch.png"));
  }

  // Coffee machine (1x1 tile)
  {
    const canvas = createCanvas(TILE, TILE);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = hex(0x5d4037);
    ctx.fillRect(10, 8, 28, 36);
    ctx.fillStyle = hex(0x7d6057);
    ctx.fillRect(12, 10, 24, 6);
    // Cup
    ctx.fillStyle = hex(0xeeeeee);
    ctx.fillRect(18, 30, 12, 10);
    ctx.fillStyle = hex(0x8d6e63);
    ctx.fillRect(20, 32, 8, 6);
    // Light
    ctx.fillStyle = hex(0x4caf50);
    ctx.beginPath();
    ctx.arc(34, 12, 2, 0, Math.PI * 2);
    ctx.fill();
    savePng(canvas, path.join(OUT, "furniture", "coffee_machine.png"));
  }
}

// ─── Employee sprite sheets (4 directions × frames) ───
function generateEmployees() {
  ensureDir(path.join(OUT, "employees"));

  const characters = [
    { name: "default", skin: 0xffe0bd, shirt: 0x6366f1, hair: 0x2c1810, pants: 0x2c3e50 },
    { name: "engineer", skin: 0xd4a574, shirt: 0x22c55e, hair: 0x1a1a2e, pants: 0x1a1a2e },
    { name: "designer", skin: 0xf5c8a0, shirt: 0xec4899, hair: 0xd4a020, pants: 0x3d2b1f },
    { name: "manager", skin: 0xc68642, shirt: 0xeab308, hair: 0x8b4513, pants: 0x192a56 },
  ];

  for (const char of characters) {
    // 4 states × 2 frames = 8 columns, 1 row
    const cols = 8;
    const canvas = createCanvas(cols * TILE, TILE);
    const ctx = canvas.getContext("2d");

    for (let frame = 0; frame < cols; frame++) {
      const ox = frame * TILE;
      const bounce = frame % 2 === 1 ? -1 : 0;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(ox + 24, ox === 0 ? 42 : 42, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = hex(char.shirt);
      ctx.fillRect(ox + 17, 24 + bounce, 14, 11);

      // Head
      ctx.fillStyle = hex(char.skin);
      ctx.beginPath();
      ctx.arc(ox + 24, 14 + bounce, 10, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = hex(char.hair);
      ctx.beginPath();
      ctx.arc(ox + 24, 11 + bounce, 10, Math.PI, Math.PI * 2);
      ctx.fill();

      // Eyes
      const blink = frame % 4 === 1;
      ctx.fillStyle = "#1a1a2e";
      if (blink) {
        ctx.fillRect(ox + 20, 13 + bounce, 3, 1);
        ctx.fillRect(ox + 25, 13 + bounce, 3, 1);
      } else {
        ctx.fillRect(ox + 20, 12 + bounce, 3, 3);
        ctx.fillRect(ox + 25, 12 + bounce, 3, 3);
      }

      // Legs
      ctx.fillStyle = hex(char.pants);
      ctx.fillRect(ox + 19, 35 + bounce, 4, 7);
      ctx.fillRect(ox + 25, 35 + bounce, 4, 7);

      // Shoes
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(ox + 18, 42, 5, 3);
      ctx.fillRect(ox + 25, 42, 5, 3);

      // Arms variation per state
      const state = Math.floor(frame / 2); // 0=idle, 1=walk, 2=type, 3=think
      ctx.fillStyle = hex(char.skin);
      if (state === 0) {
        // Idle — arms at sides
        ctx.fillRect(ox + 13, 26 + bounce, 4, 8);
        ctx.fillRect(ox + 31, 26 + bounce, 4, 8);
      } else if (state === 1) {
        // Walk — arms swinging
        const swing = frame % 2 === 0 ? -2 : 2;
        ctx.fillRect(ox + 13, 26 + bounce + swing, 4, 8);
        ctx.fillRect(ox + 31, 26 + bounce - swing, 4, 8);
      } else if (state === 2) {
        // Type — arms forward
        ctx.fillRect(ox + 15, 28 + bounce, 4, 6);
        ctx.fillRect(ox + 29, 28 + bounce, 4, 6);
      } else {
        // Think — hand on chin
        ctx.fillRect(ox + 13, 26 + bounce, 4, 8);
        ctx.fillRect(ox + 27, 18 + bounce, 4, 6);
      }
    }

    savePng(canvas, path.join(OUT, "employees", `${char.name}.png`));
  }
}

// ─── Manifest ───
function generateManifest() {
  const manifest = {
    name: "Outworked Default",
    author: "Outworked",
    version: "1.0",

    _docs: {
      overview: "This is an example asset pack. Copy this folder to create your own!",
      employees: {
        how_it_works: "Each sheet is a horizontal PNG strip of animation frames, read left-to-right.",
        frame_order: "Frames are grouped by state. Default order: idle, walk, type, think.",
        example_8_frames: "[idle_0][idle_1][walk_0][walk_1][type_0][type_1][think_0][think_1]",
        framesPerState: "Number of frames per animation state (e.g. 2 means 2 idle + 2 walk + 2 type + 2 think = 8 total).",
        states: "Optional. Override the order of states in the strip. E.g. ['walk', 'idle', 'type', 'think']. Missing states fall back to idle.",
        states_reuse: "Reuse a state for multiple positions: ['idle', 'walk', 'walk', 'idle'] if your sheet only has 2 unique animations.",
        frameRates: "Optional. Per-state FPS: { idle: 2, walk: 5, type: 6, think: 2 }. Override any or all.",
        grid_sheets: "Multi-row sheets are also supported. Each row = one state. Set 'rows' to map states to row indices.",
        rows_example: "{ 'idle': 0, 'walk': 1, 'type': 2, 'think': 3 }",
        sheets: "Map of role name -> PNG file. 'default' is used when no role matches. Agents are assigned sheets by role name, or distributed randomly if no match.",
        frameSize: "Optional. Width & height of each frame in pixels. Auto-detected if omitted.",
        frameWidth_frameHeight: "Optional. Use instead of frameSize for non-square frames.",
      },
      furniture: {
        how_it_works: "Each item is a single PNG image (not a sprite sheet).",
        sizing: "Images are scaled to fit the tile grid (48px per tile). Dimensions auto-detected, or set tilesWide/tilesTall.",
        desk_detection: "Items named 'desk', 'desk_*', or 'desk-*' are auto-detected as desks. Or set 'desk': true.",
        desks: "Desk items are work stations where agents sit when working.",
      },
      background: {
        how_it_works: "A single PNG that replaces the entire office floor, walls, and windows.",
        modes: "'cover' (default) scales to fill maintaining aspect ratio. 'stretch' distorts to fit. 'tile' repeats the image.",
        recommended_size: "768x480 or larger for best quality (matches default 16x10 tile grid).",
      },
      font: {
        how_it_works: "A .ttf, .woff, .woff2, or .otf font file that replaces the default pixel font in the UI.",
        auto_detect: "Drop a font file in the pack root — it's auto-detected. Or set 'file' and optional 'name' in manifest.",
        name: "Optional. The font-family name for the @font-face rule. Defaults to 'CustomPixelFont'.",
      },
    },

    categories: {
      employees: {
        framesPerState: 2,
        _state_order: "idle, walk, type, think (left-to-right in the strip)",
        sheets: {
          default: "employees/default.png",
          engineer: "employees/engineer.png",
          designer: "employees/designer.png",
          manager: "employees/manager.png",
        },
      },
      furniture: {
        items: {
          desk: { file: "furniture/desk.png", desk: true, tilesWide: 2, tilesTall: 1 },
          plant: { file: "furniture/plant.png" },
          bookshelf: { file: "furniture/bookshelf.png", tilesWide: 2, tilesTall: 1 },
          couch: { file: "furniture/couch.png", tilesWide: 2, tilesTall: 1 },
          coffee_machine: { file: "furniture/coffee_machine.png" },
        },
      },
      background: {
        file: "background.png",
        mode: "stretch",
      },
      font: {
        file: "Merriweather.ttf",
        name: "Merriweather",
      },
    },
  };

  const manifestPath = path.join(OUT, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("  wrote manifest.json");
}

// ─── Main ───
console.log("Generating default asset pack...");
ensureDir(OUT);
generateBackground();
generateFurniture();
generateEmployees();
generateManifest();
console.log("Done! Pack written to public/assets/outworked-default/");
