import Phaser from "phaser";

export const TILE = 48;

// Rich color palette
export const P = {
  // Floor — warm wood planks
  plank1: 0x7a5c3e,
  plank2: 0x6d5236,
  plank3: 0x8a6a48,
  plankLine: 0x5a422e,
  // Walls
  wall: 0x2a2a40,
  wallDark: 0x1e1e32,
  wallAccent: 0x343450,
  baseboard: 0x4a3a2a,
  // Furniture - desks
  desk: 0x5c4535,
  deskTop: 0x6d553f,
  deskHighlight: 0x7d6549,
  deskLeg: 0x4a3728,
  // Monitor
  monitor: 0x1a1a2e,
  monitorBezel: 0x333344,
  monitorScreen: 0x00d4ff,
  monitorScreenAlt: 0x00ff88,
  // Chair
  chair: 0x2c3e50,
  chairSeat: 0x3a5068,
  chairHighlight: 0x4a6078,
  // Plants
  plant: 0x2d6a4f,
  plantLight: 0x3d8a6f,
  plantDark: 0x1d5a3f,
  plantPot: 0x8b5e3c,
  plantPotHighlight: 0xa67048,
  // Window
  window: 0x87ceeb,
  windowLight: 0xb0e0f0,
  windowFrame: 0x5a5a7a,
  // Rug
  rug: 0x6b2737,
  rugLight: 0x7b3747,
  rugBorder: 0x8b4757,
  rugPattern: 0x5b1727,
  // Bookshelf
  bookshelf: 0x6b4c2a,
  bookshelfDark: 0x5b3c1a,
  book1: 0xe74c3c,
  book2: 0x3498db,
  book3: 0x2ecc71,
  book4: 0xf1c40f,
  book5: 0x9b59b6,
  book6: 0xe67e22,
  // Coffee machine
  coffee: 0x5d4037,
  coffeeHighlight: 0x7d6057,
  coffeeMetal: 0x9e9e9e,
  // Whiteboard
  whiteboard: 0xecf0f1,
  whiteboardFrame: 0x8a9aaa,
  // Lighting
  ceilingLight: 0xf0e68c,
  lampGlow: 0xfff8e1,
};

export function drawDeskGraphics(g: Phaser.GameObjects.Graphics) {
  const dw = TILE * 2;
  const cx = TILE; // center

  g.fillStyle(0x000000, 0.12);
  g.fillRect(3, 10, dw, TILE - 6);
  g.fillStyle(P.deskLeg, 1);
  g.fillRect(4, 10, 4, TILE - 8);
  g.fillRect(dw - 8, 10, 4, TILE - 8);
  g.fillStyle(P.desk, 1);
  g.fillRect(0, 6, dw, TILE - 10);
  g.fillStyle(P.deskTop, 1);
  g.fillRect(0, 0, dw, 8);
  g.fillStyle(P.deskHighlight, 0.5);
  g.fillRect(2, 1, dw - 4, 3);

  // Monitor
  g.fillStyle(P.monitorBezel, 1);
  g.fillRect(cx - 15, -24, 30, 22);
  g.fillStyle(P.monitor, 1);
  g.fillRect(cx - 13, -22, 26, 16);
  const screenColors = [0x00d4ff, 0x00ff88, 0xff6b9d, 0xffd93d];
  for (let i = 0; i < 5; i++) {
    const lineW = 6 + ((i * 7 + 3) % 14);
    g.fillStyle(screenColors[i % screenColors.length], 0.7);
    g.fillRect(cx - 11, -20 + i * 3, lineW, 1.5);
  }
  g.fillStyle(P.monitorScreen, 0.08);
  g.fillCircle(cx, -14, 20);
  g.fillStyle(P.monitorBezel, 1);
  g.fillRect(cx - 3, -2, 6, 3);
  g.fillRect(cx - 6, 0, 12, 2);

  // Keyboard
  g.fillStyle(0x555555, 1);
  g.fillRect(cx - 10, 2, 20, 5);
  g.fillStyle(0x666666, 1);
  g.fillRect(cx - 9, 3, 18, 3);
  g.fillStyle(0x777777, 0.6);
  for (let i = 0; i < 5; i++) {
    g.fillRect(cx - 8 + i * 4, 3.5, 2, 1);
  }

  // Mouse
  g.fillStyle(0x555555, 1);
  g.fillRect(cx + 14, 3, 5, 4);
  g.fillStyle(0x666666, 1);
  g.fillRect(cx + 14, 3, 5, 2);

  // Coffee mug
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(6, 1, 6, 5);
  g.fillStyle(0x8b4513, 0.4);
  g.fillRect(7, 2, 4, 2);

  // Chair
  g.fillStyle(0x000000, 0.1);
  g.fillRect(cx - 9, TILE + 4, 20, 16);
  g.fillStyle(P.chair, 1);
  g.fillRect(cx - 10, TILE, 20, 18);
  g.fillStyle(P.chairHighlight, 0.4);
  g.fillRect(cx - 8, TILE + 2, 16, 6);
  g.fillStyle(P.chairSeat, 1);
  g.fillRect(cx - 10, TILE - 3, 20, 6);
  g.fillStyle(P.chairHighlight, 0.3);
  g.fillRect(cx - 8, TILE - 2, 16, 3);
  g.fillStyle(0x333333, 0.6);
  g.fillCircle(cx - 8, TILE + 18, 2);
  g.fillCircle(cx + 8, TILE + 18, 2);
  g.fillCircle(cx, TILE + 19, 2);
}

export function drawPlantGraphics(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(0x000000, 0.1);
  g.fillCircle(24, 42, 12);
  g.fillStyle(P.plantPot, 1);
  g.fillRect(10, 26, 28, 18);
  g.fillStyle(P.plantPotHighlight, 1);
  g.fillRect(8, 24, 32, 4);
  g.fillStyle(P.plantPotHighlight, 0.3);
  g.fillRect(12, 28, 6, 14);
  g.fillStyle(0x000000, 0.1);
  g.fillRect(28, 28, 8, 14);
  g.fillStyle(0x3d2b1f, 1);
  g.fillRect(12, 24, 24, 3);
  g.fillStyle(P.plantDark, 1);
  g.fillCircle(24, 18, 13);
  g.fillCircle(15, 22, 9);
  g.fillCircle(33, 22, 9);
  g.fillStyle(P.plant, 1);
  g.fillCircle(24, 14, 12);
  g.fillCircle(16, 20, 8);
  g.fillCircle(32, 20, 8);
  g.fillStyle(P.plantLight, 1);
  g.fillCircle(22, 10, 6);
  g.fillCircle(14, 17, 4);
  g.fillCircle(30, 16, 5);
  g.fillStyle(0x4daa7f, 0.4);
  g.fillCircle(20, 8, 3);
}

export function drawWhiteboardGraphics(g: Phaser.GameObjects.Graphics) {
  const bw = TILE * 2;
  const bh = TILE - 4;
  g.fillStyle(0x000000, 0.15);
  g.fillRect(2, 2, bw, bh);
  g.fillStyle(P.whiteboardFrame, 1);
  g.fillRect(0, 0, bw, bh);
  g.fillStyle(P.whiteboard, 1);
  g.fillRect(4, 4, bw - 8, bh - 8);
  g.fillStyle(0xffffff, 0.15);
  g.fillRect(4, 4, bw / 2 - 6, bh / 2 - 6);
  const noteColors = [0xfff176, 0x80cbc4, 0xef9a9a, 0x90caf9];
  for (let i = 0; i < 4; i++) {
    const nx = 8 + (i % 2) * 42;
    const ny = 8 + Math.floor(i / 2) * 14;
    g.fillStyle(noteColors[i], 0.85);
    g.fillRect(nx, ny, 36, 10);
    g.fillStyle(0x333333, 0.4);
    g.fillRect(nx + 3, ny + 3, 20 + i * 3, 1.5);
    g.fillRect(nx + 3, ny + 6, 12 + i * 5, 1.5);
  }
  g.fillStyle(0x999999, 1);
  g.fillRect(20, bh - 2, bw - 40, 3);
  const markerColors = [0xe74c3c, 0x2ecc71, 0x3498db, 0x1a1a2e];
  for (let i = 0; i < 4; i++) {
    g.fillStyle(markerColors[i], 1);
    g.fillRect(24 + i * 12, bh - 3, 8, 2);
  }
}

export function drawBookshelfGraphics(g: Phaser.GameObjects.Graphics) {
  const sw = TILE * 2;
  const sh = TILE;
  g.fillStyle(0x000000, 0.1);
  g.fillRect(3, 3, sw, sh);
  g.fillStyle(P.bookshelf, 1);
  g.fillRect(0, 0, sw, sh);
  g.fillStyle(P.bookshelfDark, 1);
  g.fillRect(0, 0, 3, sh);
  g.fillRect(sw - 3, 0, 3, sh);
  g.fillStyle(P.bookshelfDark, 1);
  g.fillRect(3, sh / 2 - 1, sw - 6, 3);
  g.fillStyle(0xffffff, 0.08);
  g.fillRect(0, 0, sw, 2);
  const books1 = [P.book1, P.book2, P.book3, P.book4, P.book5, P.book6];
  for (let i = 0; i < 6; i++) {
    const bh = sh / 2 - 6 + (i % 3) * 2;
    const bx = 5 + i * 14;
    g.fillStyle(books1[i], 1);
    g.fillRect(bx, sh / 2 - bh - 1, 10, bh);
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(bx, sh / 2 - bh - 1, 3, bh);
  }
  const books2 = [P.book4, P.book1, P.book5, P.book2, P.book6, P.book3];
  for (let i = 0; i < 6; i++) {
    const bh = sh / 2 - 6 + ((i + 1) % 3) * 2;
    const bx = 5 + i * 14;
    g.fillStyle(books2[i], 1);
    g.fillRect(bx, sh - bh - 2, 10, bh);
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(bx, sh - bh - 2, 3, bh);
  }
}

export function drawCoffeeMachineGraphics(g: Phaser.GameObjects.Graphics) {
  const x = 4,
    y = 4;
  g.fillStyle(0x000000, 0.1);
  g.fillRect(x + 2, y + 2, 34, 38);
  g.fillStyle(P.coffee, 1);
  g.fillRect(x, y, 32, 36);
  g.fillStyle(P.coffeeHighlight, 0.4);
  g.fillRect(x + 2, y + 2, 10, 32);
  g.fillStyle(0x263238, 1);
  g.fillRect(x + 4, y + 4, 24, 14);
  g.fillStyle(0x00e676, 0.6);
  g.fillRect(x + 6, y + 6, 20, 10);
  g.fillStyle(0x00e676, 0.4);
  g.fillRect(x + 8, y + 8, 8, 1.5);
  g.fillRect(x + 8, y + 11, 12, 1.5);
  g.fillStyle(P.coffeeMetal, 1);
  g.fillCircle(x + 10, y + 22, 3);
  g.fillCircle(x + 22, y + 22, 3);
  g.fillStyle(0xffffff, 0.2);
  g.fillCircle(x + 9, y + 21, 1.5);
  g.fillCircle(x + 21, y + 21, 1.5);
  g.fillStyle(P.coffeeMetal, 1);
  g.fillRect(x + 4, y + 28, 24, 6);
  g.fillStyle(0x000000, 0.1);
  g.fillRect(x + 6, y + 29, 20, 4);
  // Steam
  g.fillStyle(0xffffff, 0.08);
  g.fillCircle(x + 16, y - 4, 4);
  g.fillCircle(x + 14, y - 10, 3);
  g.fillCircle(x + 18, y - 14, 2);
}

export function drawWaterCoolerGraphics(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(0x000000, 0.1);
  g.fillRect(3, 3, 24, 44);
  g.fillStyle(0xeceff1, 1);
  g.fillRect(0, 16, 24, 30);
  g.fillStyle(0xffffff, 0.2);
  g.fillRect(2, 18, 6, 26);
  g.fillStyle(0xb3e5fc, 0.5);
  g.fillRect(4, 0, 16, 18);
  g.fillStyle(0x0288d1, 1);
  g.fillRect(6, -2, 12, 3);
  g.fillStyle(0x4fc3f7, 0.4);
  g.fillRect(5, 4, 14, 12);
  g.fillStyle(0xffffff, 0.2);
  g.fillRect(6, 2, 3, 14);
  g.fillStyle(P.coffeeMetal, 1);
  g.fillRect(8, 24, 8, 3);
  g.fillStyle(0xffffff, 0.8);
  g.fillRect(9, 30, 6, 6);
}

export function drawPrinterGraphics(g: Phaser.GameObjects.Graphics) {
  // Shadow
  g.fillStyle(0x000000, 0.1);
  g.fillRect(3, 3, 38, 30);
  // Body
  g.fillStyle(0xdde0e3, 1);
  g.fillRect(0, 0, 36, 28);
  // Top panel darker
  g.fillStyle(0xc0c4c8, 1);
  g.fillRect(0, 0, 36, 8);
  // Paper output slot
  g.fillStyle(0x333333, 1);
  g.fillRect(4, 8, 28, 3);
  // Paper sticking out
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(8, 5, 20, 6);
  // Paper lines
  g.fillStyle(0xcccccc, 0.5);
  g.fillRect(10, 7, 12, 1);
  g.fillRect(10, 9, 8, 1);
  // Control panel
  g.fillStyle(0x263238, 1);
  g.fillRect(6, 14, 14, 8);
  // LCD display
  g.fillStyle(0x00e676, 0.5);
  g.fillRect(7, 15, 12, 4);
  // Buttons
  g.fillStyle(0x4caf50, 1);
  g.fillCircle(26, 18, 3);
  g.fillStyle(0xf44336, 1);
  g.fillCircle(26, 24, 2);
  // Paper tray
  g.fillStyle(0xb0bec5, 1);
  g.fillRect(2, 26, 32, 4);
  // Highlight
  g.fillStyle(0xffffff, 0.15);
  g.fillRect(2, 1, 8, 26);
}

export function drawFilingCabinetGraphics(g: Phaser.GameObjects.Graphics) {
  // Shadow
  g.fillStyle(0x000000, 0.1);
  g.fillRect(3, 3, 26, 44);
  // Body
  g.fillStyle(0x78909c, 1);
  g.fillRect(0, 0, 24, 42);
  // Highlight edge
  g.fillStyle(0x90a4ae, 0.5);
  g.fillRect(1, 1, 4, 40);
  // Top drawer
  g.fillStyle(0x607d8b, 1);
  g.fillRect(2, 2, 20, 12);
  g.fillStyle(P.coffeeMetal, 1);
  g.fillRect(9, 7, 6, 2);
  // Middle drawer
  g.fillStyle(0x607d8b, 1);
  g.fillRect(2, 16, 20, 12);
  g.fillStyle(P.coffeeMetal, 1);
  g.fillRect(9, 21, 6, 2);
  // Bottom drawer
  g.fillStyle(0x607d8b, 1);
  g.fillRect(2, 30, 20, 10);
  g.fillStyle(P.coffeeMetal, 1);
  g.fillRect(9, 34, 6, 2);
  // Label on top drawer
  g.fillStyle(0xffffff, 0.6);
  g.fillRect(6, 3, 12, 3);
}

export function drawCouchGraphics(g: Phaser.GameObjects.Graphics) {
  // Shadow
  g.fillStyle(0x000000, 0.1);
  g.fillRect(3, 3, TILE * 2 - 2, 32);
  // Couch base
  g.fillStyle(0x5d4037, 1);
  g.fillRect(0, 8, TILE * 2 - 4, 24);
  // Cushions
  g.fillStyle(0x795548, 1);
  g.fillRect(2, 4, TILE - 6, 20);
  g.fillRect(TILE - 2, 4, TILE - 6, 20);
  // Cushion highlights
  g.fillStyle(0x8d6e63, 0.5);
  g.fillRect(4, 6, TILE - 10, 8);
  g.fillRect(TILE, 6, TILE - 10, 8);
  // Arm rests
  g.fillStyle(0x4e342e, 1);
  g.fillRect(-2, 2, 6, 26);
  g.fillRect(TILE * 2 - 8, 2, 6, 26);
  // Arm rest tops
  g.fillStyle(0x6d4c41, 0.6);
  g.fillRect(-1, 2, 4, 4);
  g.fillRect(TILE * 2 - 7, 2, 4, 4);
  // Back rest
  g.fillStyle(0x4e342e, 1);
  g.fillRect(0, -2, TILE * 2 - 4, 8);
  // Back cushion detail
  g.fillStyle(0x5d4037, 0.6);
  g.fillRect(4, 0, TILE * 2 - 12, 4);
  // Pillow
  g.fillStyle(0xbcaaa4, 0.8);
  g.fillRect(6, 6, 12, 10);
  g.fillStyle(0xd7ccc8, 0.4);
  g.fillRect(7, 7, 5, 4);
  // Legs
  g.fillStyle(0x3e2723, 1);
  g.fillRect(2, 28, 4, 4);
  g.fillRect(TILE * 2 - 10, 28, 4, 4);
}

export function drawStandingLampGraphics(g: Phaser.GameObjects.Graphics) {
  // Base
  g.fillStyle(0x333333, 1);
  g.fillCircle(16, 42, 8);
  g.fillStyle(0x444444, 0.5);
  g.fillCircle(14, 40, 3);
  // Pole
  g.fillStyle(0x555555, 1);
  g.fillRect(14, 4, 4, 38);
  g.fillStyle(0x666666, 0.4);
  g.fillRect(15, 4, 1.5, 38);
  // Shade
  g.fillStyle(0xfff8e1, 1);
  g.beginPath();
  g.moveTo(6, 4);
  g.lineTo(26, 4);
  g.lineTo(22, -8);
  g.lineTo(10, -8);
  g.closePath();
  g.fillPath();
  // Shade detail
  g.fillStyle(0xfff176, 0.3);
  g.beginPath();
  g.moveTo(8, 3);
  g.lineTo(14, 3);
  g.lineTo(12, -6);
  g.lineTo(11, -6);
  g.closePath();
  g.fillPath();
  // Glow
  g.fillStyle(0xfff8e1, 0.08);
  g.fillCircle(16, 0, 18);
  // Bulb hint
  g.fillStyle(0xffeb3b, 0.4);
  g.fillCircle(16, 2, 3);
}

export function drawWallClockGraphics(g: Phaser.GameObjects.Graphics) {
  const cx = 16,
    cy = 16,
    r = 14;
  // Shadow
  g.fillStyle(0x000000, 0.12);
  g.fillCircle(cx + 1, cy + 1, r + 1);
  // Frame
  g.fillStyle(0x5d4037, 1);
  g.fillCircle(cx, cy, r + 1);
  // Face
  g.fillStyle(0xfff8e1, 1);
  g.fillCircle(cx, cy, r - 1);
  // Hour markers
  g.fillStyle(0x333333, 0.8);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const mx = cx + Math.cos(angle) * (r - 4);
    const my = cy + Math.sin(angle) * (r - 4);
    g.fillCircle(mx, my, i % 3 === 0 ? 1.5 : 0.8);
  }
  // Hour hand
  g.lineStyle(2, 0x333333, 1);
  g.lineBetween(cx, cy, cx + 5, cy - 4);
  // Minute hand
  g.lineStyle(1.5, 0x555555, 1);
  g.lineBetween(cx, cy, cx - 2, cy - 9);
  // Center dot
  g.fillStyle(0xc0392b, 1);
  g.fillCircle(cx, cy, 1.5);
  // Glass reflection
  g.fillStyle(0xffffff, 0.1);
  g.fillCircle(cx - 3, cy - 3, 5);
}

export function drawCoatRackGraphics(g: Phaser.GameObjects.Graphics) {
  // Base
  g.fillStyle(0x5d4037, 1);
  g.fillCircle(16, 44, 7);
  g.fillStyle(0x6d4c41, 0.5);
  g.fillCircle(14, 42, 3);
  // Pole
  g.fillStyle(0x4e342e, 1);
  g.fillRect(14, 4, 4, 40);
  g.fillStyle(0x5d4037, 0.4);
  g.fillRect(15, 4, 1.5, 40);
  // Top knob
  g.fillStyle(0x3e2723, 1);
  g.fillCircle(16, 2, 4);
  g.fillStyle(0x5d4037, 0.3);
  g.fillCircle(15, 1, 1.5);
  // Hooks
  g.lineStyle(2, 0x4e342e, 1);
  // Left hook
  g.lineBetween(14, 10, 6, 10);
  g.lineBetween(6, 10, 6, 14);
  // Right hook
  g.lineBetween(18, 10, 26, 10);
  g.lineBetween(26, 10, 26, 14);
  // Middle hooks
  g.lineBetween(14, 18, 8, 18);
  g.lineBetween(8, 18, 8, 22);
  g.lineBetween(18, 18, 24, 18);
  g.lineBetween(24, 18, 24, 22);
  // Hanging jacket
  g.fillStyle(0x37474f, 0.7);
  g.fillRect(22, 14, 8, 14);
  g.fillStyle(0x455a64, 0.4);
  g.fillRect(23, 15, 3, 12);
  // Hanging hat on left
  g.fillStyle(0x8d6e63, 0.8);
  g.fillRect(2, 12, 8, 4);
  g.fillStyle(0x6d4c41, 1);
  g.fillRect(3, 10, 6, 3);
}

export function drawSnackMachineGraphics(g: Phaser.GameObjects.Graphics) {
  // Shadow
  g.fillStyle(0x000000, 0.12);
  g.fillRect(3, 3, TILE + 4, TILE + 4);
  // Body
  g.fillStyle(0xc62828, 1);
  g.fillRect(0, 0, TILE, TILE);
  // Body highlight
  g.fillStyle(0xe53935, 0.3);
  g.fillRect(2, 2, 10, TILE - 4);
  // Glass window
  g.fillStyle(0x263238, 1);
  g.fillRect(4, 4, TILE - 16, TILE - 14);
  // Glass reflection
  g.fillStyle(0xffffff, 0.08);
  g.fillRect(5, 5, 10, TILE - 16);
  // Snack rows
  const snackColors = [0xffeb3b, 0x4caf50, 0x2196f3, 0xff9800, 0xe91e63];
  for (let row = 0; row < 3; row++) {
    // Shelf line
    g.fillStyle(P.coffeeMetal, 0.5);
    g.fillRect(5, 10 + row * 10, TILE - 18, 1);
    for (let col = 0; col < 3; col++) {
      g.fillStyle(snackColors[(row * 3 + col) % snackColors.length], 0.8);
      g.fillRect(6 + col * 9, 4 + row * 10, 7, 6);
    }
  }
  // Control panel (right side)
  g.fillStyle(0x424242, 1);
  g.fillRect(TILE - 12, 4, 10, TILE - 14);
  // Buttons
  g.fillStyle(0x76ff03, 0.6);
  g.fillRect(TILE - 10, 6, 6, 3);
  // Number pad
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0x616161, 1);
    g.fillRect(TILE - 10 + (i % 2) * 4, 12 + Math.floor(i / 2) * 5, 3, 3);
  }
  // Coin slot
  g.fillStyle(P.coffeeMetal, 1);
  g.fillRect(TILE - 9, TILE - 12, 4, 6);
  g.fillStyle(0x333333, 1);
  g.fillRect(TILE - 8, TILE - 10, 2, 3);
  // Pickup slot
  g.fillStyle(0x1a1a1a, 1);
  g.fillRect(4, TILE - 8, TILE - 16, 6);
  // "SNACKS" label
  g.fillStyle(0xffeb3b, 0.7);
  g.fillRect(8, TILE - 2, 20, 2);
}

export function drawCactusGraphics(g: Phaser.GameObjects.Graphics) {
  // Small terracotta pot
  g.fillStyle(0x000000, 0.08);
  g.fillCircle(16, 40, 8);
  g.fillStyle(0xbf6a3a, 1);
  g.fillRect(8, 30, 16, 14);
  g.fillStyle(0xd4844a, 1);
  g.fillRect(6, 28, 20, 4);
  g.fillStyle(0xd4844a, 0.3);
  g.fillRect(10, 32, 4, 10);
  // Soil
  g.fillStyle(0x3d2b1f, 1);
  g.fillRect(9, 28, 14, 3);
  // Main cactus body
  g.fillStyle(0x2d8a4e, 1);
  g.fillRoundedRect(12, 8, 8, 22, 3);
  // Cactus highlight
  g.fillStyle(0x3daa6e, 0.5);
  g.fillRect(13, 10, 3, 18);
  // Left arm
  g.fillStyle(0x2d8a4e, 1);
  g.fillRect(6, 14, 6, 5);
  g.fillRect(6, 10, 5, 6);
  g.fillStyle(0x3daa6e, 0.4);
  g.fillRect(7, 11, 2, 4);
  // Right arm
  g.fillStyle(0x2d8a4e, 1);
  g.fillRect(20, 18, 6, 5);
  g.fillRect(22, 14, 5, 6);
  g.fillStyle(0x3daa6e, 0.4);
  g.fillRect(23, 15, 2, 4);
  // Spines (tiny dots)
  g.fillStyle(0xc8e6c9, 0.5);
  const spinePositions = [
    [14, 10],
    [18, 12],
    [14, 16],
    [18, 20],
    [14, 24],
    [7, 12],
    [24, 16],
    [8, 16],
    [23, 20],
  ];
  for (const [sx, sy] of spinePositions) {
    g.fillCircle(sx, sy, 0.6);
  }
  // Flower on top
  g.fillStyle(0xff4081, 0.9);
  g.fillCircle(16, 7, 3);
  g.fillStyle(0xff80ab, 0.6);
  g.fillCircle(15, 6, 1.5);
  g.fillStyle(0xffeb3b, 1);
  g.fillCircle(16, 7, 1);
}

export function drawTvGraphics(g: Phaser.GameObjects.Graphics) {
  const tw = TILE * 2 - 8;
  // Shadow
  g.fillStyle(0x000000, 0.12);
  g.fillRect(3, 3, tw, 30);
  // Bezel
  g.fillStyle(0x1a1a2e, 1);
  g.fillRect(0, 0, tw, 28);
  // Screen
  g.fillStyle(0x0a0a1a, 1);
  g.fillRect(3, 3, tw - 6, 20);
  // Screen content — chart/dashboard
  g.fillStyle(0x00d4ff, 0.5);
  g.fillRect(6, 6, 20, 1.5);
  g.fillRect(6, 9, 14, 1.5);
  // Bar chart
  const bars = [8, 14, 10, 16, 12, 18, 6];
  for (let i = 0; i < bars.length; i++) {
    g.fillStyle(i % 2 === 0 ? 0x00d4ff : 0x00ff88, 0.6);
    g.fillRect(6 + i * 10, 22 - bars[i], 7, bars[i]);
  }
  // Screen glow
  g.fillStyle(0x00d4ff, 0.05);
  g.fillCircle(tw / 2, 13, 20);
  // Stand
  g.fillStyle(0x333344, 1);
  g.fillRect(tw / 2 - 3, 28, 6, 4);
  g.fillRect(tw / 2 - 10, 31, 20, 3);
  // Power LED
  g.fillStyle(0x00ff00, 0.8);
  g.fillCircle(tw - 6, 25, 1);
}

export function drawPingPongGraphics(g: Phaser.GameObjects.Graphics) {
  const tw = TILE * 2;
  // Shadow
  g.fillStyle(0x000000, 0.1);
  g.fillRect(4, 4, tw - 4, TILE - 4);
  // Table top
  g.fillStyle(0x1b5e20, 1);
  g.fillRect(0, 4, tw - 4, TILE - 12);
  // Table border
  g.lineStyle(2, 0xffffff, 0.8);
  g.strokeRect(1, 5, tw - 6, TILE - 14);
  // Center line
  g.lineStyle(1.5, 0xffffff, 0.8);
  g.lineBetween(tw / 2 - 2, 5, tw / 2 - 2, TILE - 9);
  // Net
  g.fillStyle(0x888888, 0.6);
  g.fillRect(tw / 2 - 3, 2, 2, TILE - 10);
  // Net posts
  g.fillStyle(0x666666, 1);
  g.fillRect(tw / 2 - 4, 4, 4, 3);
  g.fillRect(tw / 2 - 4, TILE - 11, 4, 3);
  // Legs
  g.fillStyle(0x333333, 1);
  g.fillRect(4, TILE - 8, 3, 8);
  g.fillRect(tw - 11, TILE - 8, 3, 8);
  g.fillRect(4, TILE - 4, 3, 4);
  g.fillRect(tw - 11, TILE - 4, 3, 4);
  // Ball
  g.fillStyle(0xff8f00, 1);
  g.fillCircle(tw / 2 + 12, 16, 2.5);
  g.fillStyle(0xffffff, 0.3);
  g.fillCircle(tw / 2 + 11, 15, 1);
  // Paddle
  g.fillStyle(0xc62828, 1);
  g.fillCircle(15, 20, 5);
  g.fillStyle(0x5d4037, 1);
  g.fillRect(13, 24, 4, 8);
}

export function drawTrashCanGraphics(g: Phaser.GameObjects.Graphics) {
  // Shadow
  g.fillStyle(0x000000, 0.08);
  g.fillCircle(14, 40, 8);
  // Body
  g.fillStyle(0x607d8b, 1);
  g.fillRect(4, 12, 20, 28);
  // Slight taper
  g.fillStyle(0x546e7a, 1);
  g.fillRect(5, 14, 18, 24);
  // Rim
  g.fillStyle(0x78909c, 1);
  g.fillRect(3, 10, 22, 4);
  // Highlight
  g.fillStyle(0x90a4ae, 0.4);
  g.fillRect(6, 14, 4, 22);
  // Lid slightly ajar
  g.fillStyle(0x78909c, 1);
  g.fillRect(2, 8, 24, 3);
  g.fillStyle(0x90a4ae, 0.5);
  g.fillRect(3, 8, 22, 1.5);
  // Handle on lid
  g.fillStyle(0x546e7a, 1);
  g.fillRect(11, 5, 6, 4);
  g.fillStyle(0x78909c, 0.6);
  g.fillRect(12, 6, 4, 2);
  // Trash peeking out
  g.fillStyle(0xfdd835, 0.4);
  g.fillRect(8, 9, 5, 3);
  g.fillStyle(0xffffff, 0.3);
  g.fillRect(15, 8, 4, 3);
}

export function drawServerRackGraphics(g: Phaser.GameObjects.Graphics) {
  // Shadow
  g.fillStyle(0x000000, 0.12);
  g.fillRect(3, 3, 30, TILE + 4);
  // Body
  g.fillStyle(0x263238, 1);
  g.fillRect(0, 0, 28, TILE);
  // Front panel
  g.fillStyle(0x37474f, 1);
  g.fillRect(2, 2, 24, TILE - 4);
  // Server units (4 rows)
  for (let i = 0; i < 4; i++) {
    const sy = 4 + i * 10;
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(3, sy, 22, 8);
    // Drive bays
    g.fillStyle(0x455a64, 0.6);
    for (let j = 0; j < 3; j++) {
      g.fillRect(4 + j * 7, sy + 1, 5, 6);
    }
    // Status LEDs
    g.fillStyle(i < 3 ? 0x00e676 : 0xff5722, 0.9);
    g.fillCircle(23, sy + 4, 1.2);
  }
  // Ventilation at top
  g.fillStyle(0x1a1a2e, 0.5);
  for (let i = 0; i < 4; i++) {
    g.fillRect(6 + i * 5, TILE - 6, 3, 3);
  }
  // Highlight edge
  g.fillStyle(0x546e7a, 0.3);
  g.fillRect(1, 1, 3, TILE - 2);
}

export function drawFireExtinguisherGraphics(g: Phaser.GameObjects.Graphics) {
  // Wall bracket
  g.fillStyle(0x555555, 1);
  g.fillRect(10, 8, 12, 4);
  g.fillRect(10, 28, 12, 4);
  // Body
  g.fillStyle(0xc62828, 1);
  g.fillRoundedRect(10, 10, 12, 28, 3);
  // Body highlight
  g.fillStyle(0xe53935, 0.4);
  g.fillRect(11, 12, 4, 24);
  // Label
  g.fillStyle(0xffffff, 0.8);
  g.fillRect(12, 20, 8, 6);
  g.fillStyle(0xc62828, 0.5);
  g.fillRect(13, 21, 6, 1.5);
  g.fillRect(13, 23, 4, 1.5);
  // Top valve
  g.fillStyle(0x333333, 1);
  g.fillRect(12, 6, 8, 6);
  // Handle
  g.fillStyle(0x222222, 1);
  g.fillRect(20, 6, 6, 3);
  g.fillRect(23, 6, 3, 8);
  // Nozzle/hose
  g.fillStyle(0x111111, 1);
  g.fillRect(8, 8, 4, 2);
  g.fillRect(5, 8, 4, 14);
  g.fillRect(4, 20, 4, 3);
  // Pressure gauge
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(16, 9, 2.5);
  g.fillStyle(0x00e676, 0.6);
  g.fillCircle(16, 9, 1.5);
}

export function drawUmbrellaStandGraphics(g: Phaser.GameObjects.Graphics) {
  // Shadow
  g.fillStyle(0x000000, 0.08);
  g.fillCircle(16, 42, 7);
  // Stand body (cylinder)
  g.fillStyle(0x5d4037, 1);
  g.fillRect(8, 22, 16, 22);
  // Rim
  g.fillStyle(0x6d4c41, 1);
  g.fillRect(6, 20, 20, 4);
  // Highlight
  g.fillStyle(0x8d6e63, 0.4);
  g.fillRect(10, 24, 4, 18);
  // Umbrella 1 — blue
  g.fillStyle(0x1565c0, 1);
  g.fillRect(11, 4, 3, 18);
  g.fillStyle(0x1976d2, 1);
  g.beginPath();
  g.moveTo(6, 6);
  g.lineTo(12, 2);
  g.lineTo(18, 6);
  g.closePath();
  g.fillPath();
  // Handle
  g.fillStyle(0x5d4037, 1);
  g.fillRect(10, 4, 2, 3);
  // Umbrella 2 — red (behind)
  g.fillStyle(0xc62828, 0.7);
  g.fillRect(17, 6, 2, 16);
  g.fillStyle(0xe53935, 0.6);
  g.beginPath();
  g.moveTo(13, 8);
  g.lineTo(18, 4);
  g.lineTo(23, 8);
  g.closePath();
  g.fillPath();
}

export function drawMiniFridgeGraphics(g: Phaser.GameObjects.Graphics) {
  // Shadow
  g.fillStyle(0x000000, 0.1);
  g.fillRect(3, 3, 28, 38);
  // Body
  g.fillStyle(0xeceff1, 1);
  g.fillRect(0, 0, 26, 36);
  // Door panel
  g.fillStyle(0xe0e0e0, 1);
  g.fillRect(2, 2, 22, 32);
  // Door handle
  g.fillStyle(0xbdbdbd, 1);
  g.fillRect(20, 10, 3, 10);
  g.fillStyle(0xffffff, 0.3);
  g.fillRect(20, 11, 1.5, 8);
  // Door seal line
  g.lineStyle(1, 0xbdbdbd, 0.5);
  g.lineBetween(2, 16, 22, 16);
  // Top section (freezer)
  g.fillStyle(0xbbdefb, 0.3);
  g.fillRect(3, 3, 20, 12);
  // Bottom section
  g.fillStyle(0xffffff, 0.1);
  g.fillRect(3, 18, 20, 14);
  // Brand logo dot
  g.fillStyle(0x1976d2, 0.6);
  g.fillCircle(13, 28, 2);
  // Highlight
  g.fillStyle(0xffffff, 0.15);
  g.fillRect(3, 3, 5, 30);
  // Feet
  g.fillStyle(0x616161, 1);
  g.fillRect(2, 36, 4, 2);
  g.fillRect(20, 36, 4, 2);
}

export function drawFanGraphics(g: Phaser.GameObjects.Graphics) {
  // Base
  g.fillStyle(0x455a64, 1);
  g.fillRect(6, 34, 20, 6);
  g.fillStyle(0x546e7a, 0.5);
  g.fillRect(8, 34, 16, 3);
  // Neck
  g.fillStyle(0x607d8b, 1);
  g.fillRect(14, 18, 4, 16);
  // Cage circle
  g.lineStyle(1.5, 0x78909c, 1);
  g.strokeCircle(16, 12, 12);
  // Cage grill lines
  g.lineStyle(0.8, 0x90a4ae, 0.5);
  for (let i = -10; i <= 10; i += 4) {
    const dx = Math.sqrt(144 - i * i);
    g.lineBetween(16 + i, 12 - dx, 16 + i, 12 + dx);
  }
  // Center hub
  g.fillStyle(0x455a64, 1);
  g.fillCircle(16, 12, 3);
  g.fillStyle(0x546e7a, 0.5);
  g.fillCircle(15, 11, 1.2);
  // Blades (3 blades)
  g.fillStyle(0xb0bec5, 0.6);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 - Math.PI / 6;
    const bx = 16 + Math.cos(angle) * 8;
    const by = 12 + Math.sin(angle) * 8;
    g.beginPath();
    g.moveTo(16, 12);
    g.lineTo(bx - Math.sin(angle) * 3, by + Math.cos(angle) * 3);
    g.lineTo(bx + Math.sin(angle) * 3, by - Math.cos(angle) * 3);
    g.closePath();
    g.fillPath();
  }
  // Speed button
  g.fillStyle(0x00e676, 0.7);
  g.fillCircle(16, 38, 2);
}

export function drawBuiltinFurniture(
  type: string,
  g: Phaser.GameObjects.Graphics,
): void {
  switch (type) {
    case "desk":
      drawDeskGraphics(g);
      break;
    case "plant":
      drawPlantGraphics(g);
      break;
    case "whiteboard":
      drawWhiteboardGraphics(g);
      break;
    case "bookshelf":
      drawBookshelfGraphics(g);
      break;
    case "coffee-machine":
      drawCoffeeMachineGraphics(g);
      break;
    case "water-cooler":
      drawWaterCoolerGraphics(g);
      break;
    case "printer":
      drawPrinterGraphics(g);
      break;
    case "filing-cabinet":
      drawFilingCabinetGraphics(g);
      break;
    case "couch":
      drawCouchGraphics(g);
      break;
    case "standing-lamp":
      drawStandingLampGraphics(g);
      break;
    case "wall-clock":
      drawWallClockGraphics(g);
      break;
    case "coat-rack":
      drawCoatRackGraphics(g);
      break;
    case "snack-machine":
      drawSnackMachineGraphics(g);
      break;
    case "cactus":
      drawCactusGraphics(g);
      break;
    case "tv":
      drawTvGraphics(g);
      break;
    case "ping-pong":
      drawPingPongGraphics(g);
      break;
    case "trash-can":
      drawTrashCanGraphics(g);
      break;
    case "server-rack":
      drawServerRackGraphics(g);
      break;
    case "fire-extinguisher":
      drawFireExtinguisherGraphics(g);
      break;
    case "umbrella-stand":
      drawUmbrellaStandGraphics(g);
      break;
    case "mini-fridge":
      drawMiniFridgeGraphics(g);
      break;
    case "fan":
      drawFanGraphics(g);
      break;
  }
}
