/**
 * Procedural chibi character sprite generator v2.
 * Draws smooth, detailed characters using canvas 2D API at 48×48 resolution.
 * Each character has 4 animation states × 2 frames = 8 frames.
 */

export const FRAME_PX = 48;
export type AnimState = "idle" | "walk" | "type" | "think";

export interface CharacterPalette {
  skin: number;
  shirt: number;
  shirtDark: number;
  hair: number;
  pants: number;
  shoes: number;
  white: number;
  eye: number;
  mouth: number;
  hairStyle: number;
  glasses: boolean;
  eyeColor: number;
}

const SKIN_TONES = [
  0xffe0bd, 0xf5c8a0, 0xd4a574, 0xc68642, 0x8d5524, 0xfce4c0, 0xb87840,
];
const HAIR_COLORS = [
  0x2c1810, 0x8b4513, 0xd4a020, 0xc0392b, 0x1a1a2e, 0xe8e0d8, 0x4a2060,
  0x1a6030,
];
const PANTS_COLORS = [
  0x2c3e50, 0x1a1a2e, 0x3d2b1f, 0x2d3436, 0x192a56, 0x4a3728,
];
const SHOE_COLORS = [0x1a1a2e, 0x2c1810, 0x4a3728, 0x333333, 0x8b0000];
const EYE_COLORS = [0x3b5998, 0x2d6a4f, 0x8b4513, 0x4a4a4a, 0x1a6030, 0x6b3fa0];
const HAIR_STYLE_COUNT = 8; // 5 original + 3 new

export function buildPalette(
  shirtColor: number,
  index: number,
): CharacterPalette {
  const skinIdx = index % SKIN_TONES.length;
  const hairIdx = (index * 3 + 1) % HAIR_COLORS.length;
  const r = (shirtColor >> 16) & 0xff;
  const g = (shirtColor >> 8) & 0xff;
  const b = shirtColor & 0xff;
  const dark =
    (Math.max(0, r - 40) << 16) |
    (Math.max(0, g - 40) << 8) |
    Math.max(0, b - 40);

  return {
    skin: SKIN_TONES[skinIdx],
    shirt: shirtColor,
    shirtDark: dark,
    hair: HAIR_COLORS[hairIdx],
    pants: PANTS_COLORS[index % PANTS_COLORS.length],
    shoes: SHOE_COLORS[index % SHOE_COLORS.length],
    white: 0xffffff,
    eye: 0x1a1a2e,
    mouth: 0xc0392b,
    hairStyle: index % HAIR_STYLE_COUNT,
    glasses: index % 3 === 1, // every 3rd agent gets glasses
    eyeColor: EYE_COLORS[index % EYE_COLORS.length],
  };
}

// ---- color helpers ----
function hex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}
function lighten(c: number, amt: number): string {
  const r = Math.min(255, ((c >> 16) & 0xff) + amt);
  const g = Math.min(255, ((c >> 8) & 0xff) + amt);
  const b = Math.min(255, (c & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

// ---- geometry helpers ----
function rrect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- character dimensions ----
const CX = 24;
const HEAD_CY = 14;
const HEAD_R = 11;
const BODY_TOP = 25;
const BODY_H = 11;
const BODY_W = 14;
const SHOULDER_Y = 27;
const LEG_W = 5;
const LEG_H = 7;
const SHOE_H = 3;

// ---- frame specifications ----
interface FrameSpec {
  dy: number;
  blink: boolean;
  mouthOpen: boolean;
  lh: [number, number]; // left hand position
  rh: [number, number]; // right hand position
  lf: [number, number]; // left foot position
  rf: [number, number]; // right foot position
}

const SPECS: Record<string, FrameSpec> = {
  idle_0: {
    dy: 0,
    blink: false,
    mouthOpen: false,
    lh: [14, 36],
    rh: [34, 36],
    lf: [20, 44],
    rf: [28, 44],
  },
  idle_1: {
    dy: -1,
    blink: true,
    mouthOpen: false,
    lh: [14, 35],
    rh: [34, 35],
    lf: [20, 44],
    rf: [28, 44],
  },
  walk_0: {
    dy: -1,
    blink: false,
    mouthOpen: false,
    lh: [18, 32],
    rh: [30, 38],
    lf: [18, 44],
    rf: [30, 44],
  },
  walk_1: {
    dy: 0,
    blink: false,
    mouthOpen: false,
    lh: [18, 38],
    rh: [30, 32],
    lf: [22, 44],
    rf: [26, 44],
  },
  type_0: {
    dy: 0,
    blink: false,
    mouthOpen: false,
    lh: [18, 34],
    rh: [30, 34],
    lf: [20, 44],
    rf: [28, 44],
  },
  type_1: {
    dy: 0,
    blink: false,
    mouthOpen: false,
    lh: [16, 35],
    rh: [32, 33],
    lf: [20, 44],
    rf: [28, 44],
  },
  think_0: {
    dy: 0,
    blink: false,
    mouthOpen: false,
    lh: [14, 36],
    rh: [28, 22],
    lf: [20, 44],
    rf: [28, 44],
  },
  think_1: {
    dy: -1,
    blink: false,
    mouthOpen: true,
    lh: [14, 35],
    rh: [28, 21],
    lf: [20, 44],
    rf: [28, 44],
  },
};

// ---- drawing functions ----

function drawLeg(
  ctx: CanvasRenderingContext2D,
  p: CharacterPalette,
  cx: number,
  topY: number,
) {
  // Pants
  ctx.fillStyle = hex(p.pants);
  rrect(ctx, cx - LEG_W / 2, topY, LEG_W, LEG_H, 1);
  ctx.fill();
  // Pants highlight
  ctx.fillStyle = lighten(p.pants, 15);
  ctx.fillRect(cx - LEG_W / 2 + 1, topY + 1, 2, LEG_H - 2);
  // Shoe
  ctx.fillStyle = hex(p.shoes);
  rrect(ctx, cx - LEG_W / 2 - 1, topY + LEG_H - 1, LEG_W + 2, SHOE_H, 1.5);
  ctx.fill();
  // Shoe highlight
  ctx.fillStyle = lighten(p.shoes, 50);
  ctx.fillRect(cx - LEG_W / 2, topY + LEG_H, LEG_W, 1);
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  p: CharacterPalette,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
) {
  // Sleeve
  ctx.strokeStyle = hex(p.shirt);
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  // Sleeve highlight
  ctx.strokeStyle = lighten(p.shirt, 25);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 1);
  ctx.lineTo((sx + ex) / 2, (sy + ey) / 2 - 1);
  ctx.stroke();
  // Hand
  ctx.fillStyle = hex(p.skin);
  ctx.beginPath();
  ctx.arc(ex, ey, 3, 0, Math.PI * 2);
  ctx.fill();
  // Hand highlight
  ctx.fillStyle = lighten(p.skin, 20);
  ctx.beginPath();
  ctx.arc(ex - 0.5, ey - 0.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  p: CharacterPalette,
  dy: number,
) {
  const bx = CX - BODY_W / 2;
  const by = BODY_TOP + dy;

  // Body shadow
  ctx.fillStyle = hex(p.shirtDark);
  rrect(ctx, bx, by, BODY_W, BODY_H, 3);
  ctx.fill();

  // Body main
  ctx.fillStyle = hex(p.shirt);
  rrect(ctx, bx, by, BODY_W, BODY_H - 2, 3);
  ctx.fill();

  // Shirt highlight
  ctx.fillStyle = lighten(p.shirt, 35);
  rrect(ctx, bx + 2, by + 1, BODY_W - 4, 4, 2);
  ctx.fill();

  // Collar
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(CX - 5, by);
  ctx.lineTo(CX, by + 4);
  ctx.lineTo(CX + 5, by);
  ctx.closePath();
  ctx.fill();
  // Collar shadow
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.moveTo(CX - 4, by);
  ctx.lineTo(CX, by + 3);
  ctx.lineTo(CX + 4, by);
  ctx.closePath();
  ctx.fill();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  p: CharacterPalette,
  dy: number,
  blink: boolean,
  mouthOpen: boolean,
) {
  const cy = HEAD_CY + dy;

  // Neck
  ctx.fillStyle = hex(p.skin);
  ctx.fillRect(CX - 3, cy + HEAD_R - 3, 6, 5);

  // Head circle
  ctx.fillStyle = hex(p.skin);
  ctx.beginPath();
  ctx.arc(CX, cy, HEAD_R, 0, Math.PI * 2);
  ctx.fill();

  // Head shading gradient
  const g = ctx.createRadialGradient(CX - 4, cy - 4, 1, CX, cy, HEAD_R);
  g.addColorStop(0, "rgba(255,255,255,0.12)");
  g.addColorStop(0.7, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.06)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(CX, cy, HEAD_R, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = hex(p.skin);
  ctx.beginPath();
  ctx.ellipse(CX - HEAD_R + 1, cy + 2, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(CX + HEAD_R - 1, cy + 2, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner ear
  ctx.fillStyle = lighten(p.skin, -15);
  ctx.beginPath();
  ctx.ellipse(CX - HEAD_R + 1.5, cy + 2, 1.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(CX + HEAD_R - 1.5, cy + 2, 1.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  if (blink) {
    ctx.strokeStyle = hex(p.eye);
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(CX - 6, cy + 1);
    ctx.lineTo(CX - 2, cy + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CX + 2, cy + 1);
    ctx.lineTo(CX + 6, cy + 1);
    ctx.stroke();
  } else {
    // Eye whites
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(CX - 4, cy + 1, 3.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(CX + 4, cy + 1, 3.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Iris
    ctx.fillStyle = hex(p.eyeColor);
    ctx.beginPath();
    ctx.arc(CX - 3.5, cy + 1.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX + 4.5, cy + 1.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = hex(p.eye);
    ctx.beginPath();
    ctx.arc(CX - 3.5, cy + 1.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX + 4.5, cy + 1.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
    // Eye highlights
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(CX - 5, cy + 0.3, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX + 3, cy + 0.3, 1.1, 0, Math.PI * 2);
    ctx.fill();
    // Small secondary highlight
    ctx.beginPath();
    ctx.arc(CX - 2.5, cy + 2.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX + 5.5, cy + 2.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyebrows
  ctx.strokeStyle = hex(p.hair);
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(CX - 6, cy - 3);
  ctx.quadraticCurveTo(CX - 4, cy - 4.5, CX - 1.5, cy - 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX + 1.5, cy - 3);
  ctx.quadraticCurveTo(CX + 4, cy - 4.5, CX + 6, cy - 3);
  ctx.stroke();

  // Mouth
  if (mouthOpen) {
    ctx.fillStyle = "#8b0000";
    ctx.beginPath();
    ctx.ellipse(CX, cy + 6, 2.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tongue hint
    ctx.fillStyle = "#cc4444";
    ctx.beginPath();
    ctx.ellipse(CX, cy + 6.8, 1.5, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = hex(p.mouth);
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(CX, cy + 4.5, 2.5, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // Nose hint
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.beginPath();
  ctx.arc(CX, cy + 3.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Cheek blush
  ctx.fillStyle = "rgba(255,130,130,0.18)";
  ctx.beginPath();
  ctx.ellipse(CX - 7, cy + 3.5, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(CX + 7, cy + 3.5, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  p: CharacterPalette,
  dy: number,
  style: number,
) {
  const cy = HEAD_CY + dy;
  const r = HEAD_R;
  ctx.fillStyle = hex(p.hair);

  switch (style % HAIR_STYLE_COUNT) {
    case 0: {
      // Short neat
      ctx.beginPath();
      ctx.arc(CX, cy, r + 2, Math.PI, 0);
      ctx.lineTo(CX + r + 2, cy - 1);
      ctx.lineTo(CX - r - 2, cy - 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = lighten(p.hair, 30);
      ctx.beginPath();
      ctx.ellipse(CX - 2, cy - r, 5, 2.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 1: {
      // Side swoop
      ctx.beginPath();
      ctx.arc(CX, cy, r + 2, Math.PI - 0.1, 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(CX - 4, cy - r - 2);
      ctx.quadraticCurveTo(CX + 12, cy - r - 1, CX + r + 4, cy + 1);
      ctx.lineTo(CX + r + 1, cy - 2);
      ctx.arc(CX, cy, r + 2, -0.1, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = lighten(p.hair, 30);
      ctx.beginPath();
      ctx.ellipse(CX + 2, cy - r, 4, 2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 2: {
      // Long
      ctx.beginPath();
      ctx.arc(CX, cy, r + 2, Math.PI - 0.2, 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(CX + r + 1, cy - 2);
      ctx.lineTo(CX + r + 4, cy + 8);
      ctx.quadraticCurveTo(CX + r + 2, cy + 14, CX + r - 2, cy + 12);
      ctx.lineTo(CX + r - 2, cy - 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(CX - r - 1, cy - 2);
      ctx.lineTo(CX - r - 4, cy + 8);
      ctx.quadraticCurveTo(CX - r - 2, cy + 14, CX - r + 2, cy + 12);
      ctx.lineTo(CX - r + 2, cy - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = lighten(p.hair, 25);
      ctx.beginPath();
      ctx.ellipse(CX, cy - r, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 3: {
      // Spiky
      ctx.beginPath();
      ctx.arc(CX, cy, r + 1, Math.PI + 0.4, -0.4);
      ctx.fill();
      const spikes = [
        { x: CX - 7, y: cy - r - 6 },
        { x: CX - 2, y: cy - r - 9 },
        { x: CX + 3, y: cy - r - 7 },
        { x: CX + 8, y: cy - r - 4 },
        { x: CX - 10, y: cy - r - 2 },
      ];
      for (const s of spikes) {
        ctx.beginPath();
        ctx.moveTo(s.x - 4, cy - r + 3);
        ctx.lineTo(s.x, s.y);
        ctx.lineTo(s.x + 4, cy - r + 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = lighten(p.hair, 30);
      ctx.beginPath();
      ctx.ellipse(CX - 1, cy - r + 2, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 4: {
      // Curly poof
      const bumps = 8;
      for (let i = 0; i < bumps; i++) {
        const a = Math.PI + (i / (bumps - 1)) * Math.PI;
        const bx = CX + Math.cos(a) * (r + 3);
        const by = cy + Math.sin(a) * (r + 3);
        ctx.beginPath();
        ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = lighten(p.hair, 25);
      ctx.beginPath();
      ctx.arc(CX - 4, cy - r - 1, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 5: {
      // Top bun / updo
      // Base cap
      ctx.beginPath();
      ctx.arc(CX, cy, r + 2, Math.PI, 0);
      ctx.lineTo(CX + r + 2, cy - 1);
      ctx.lineTo(CX - r - 2, cy - 1);
      ctx.closePath();
      ctx.fill();
      // Bun on top
      ctx.beginPath();
      ctx.arc(CX, cy - r - 4, 6, 0, Math.PI * 2);
      ctx.fill();
      // Bun highlight
      ctx.fillStyle = lighten(p.hair, 30);
      ctx.beginPath();
      ctx.arc(CX - 1, cy - r - 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Hair band
      ctx.fillStyle = hex(p.shirt); // matches shirt for style
      ctx.fillRect(CX - 4, cy - r - 1, 8, 2);
      break;
    }
    case 6: {
      // Mohawk / faux hawk
      // Shaved sides
      ctx.beginPath();
      ctx.arc(CX, cy, r + 1, Math.PI + 0.3, -0.3);
      ctx.closePath();
      ctx.fill();
      // Tall center strip
      for (let i = 0; i < 5; i++) {
        const mx = CX - 6 + i * 3;
        const mh = 6 + Math.sin(i * 0.8) * 4;
        ctx.beginPath();
        ctx.moveTo(mx - 2, cy - r + 2);
        ctx.lineTo(mx, cy - r - mh);
        ctx.lineTo(mx + 2, cy - r + 2);
        ctx.closePath();
        ctx.fill();
      }
      // Highlight on tips
      ctx.fillStyle = lighten(p.hair, 40);
      for (let i = 0; i < 5; i++) {
        const mx = CX - 6 + i * 3;
        const mh = 6 + Math.sin(i * 0.8) * 4;
        ctx.beginPath();
        ctx.arc(mx, cy - r - mh + 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 7: {
      // Bob cut
      // Full cap
      ctx.beginPath();
      ctx.arc(CX, cy, r + 2.5, Math.PI - 0.1, 0.1);
      ctx.closePath();
      ctx.fill();
      // Left side bob
      ctx.beginPath();
      ctx.moveTo(CX - r - 2, cy - 2);
      ctx.quadraticCurveTo(CX - r - 4, cy + 5, CX - r - 1, cy + 8);
      ctx.quadraticCurveTo(CX - r + 4, cy + 10, CX - r + 2, cy - 2);
      ctx.closePath();
      ctx.fill();
      // Right side bob
      ctx.beginPath();
      ctx.moveTo(CX + r + 2, cy - 2);
      ctx.quadraticCurveTo(CX + r + 4, cy + 5, CX + r + 1, cy + 8);
      ctx.quadraticCurveTo(CX + r - 4, cy + 10, CX + r - 2, cy - 2);
      ctx.closePath();
      ctx.fill();
      // Front bangs
      ctx.beginPath();
      ctx.moveTo(CX - 8, cy - r + 1);
      ctx.quadraticCurveTo(CX, cy - r - 1, CX + 8, cy - r + 1);
      ctx.lineTo(CX + 6, cy - r + 5);
      ctx.quadraticCurveTo(CX, cy - r + 3, CX - 6, cy - r + 5);
      ctx.closePath();
      ctx.fill();
      // Highlight
      ctx.fillStyle = lighten(p.hair, 25);
      ctx.beginPath();
      ctx.ellipse(CX - 3, cy - r + 1, 4, 2, -0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

function drawGlasses(ctx: CanvasRenderingContext2D, dy: number) {
  const cy = HEAD_CY + dy;
  ctx.strokeStyle = "rgba(80,80,100,0.9)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";

  // Left lens
  ctx.beginPath();
  ctx.ellipse(CX - 4, cy + 1, 4.5, 3.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Right lens
  ctx.beginPath();
  ctx.ellipse(CX + 4, cy + 1, 4.5, 3.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Bridge
  ctx.beginPath();
  ctx.moveTo(CX - 0.5, cy + 0.5);
  ctx.lineTo(CX + 0.5, cy + 0.5);
  ctx.stroke();
  // Temple arms
  ctx.beginPath();
  ctx.moveTo(CX - 8.5, cy + 0.5);
  ctx.lineTo(CX - 11, cy + 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX + 8.5, cy + 0.5);
  ctx.lineTo(CX + 11, cy + 0.5);
  ctx.stroke();

  // Lens glare
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.ellipse(CX - 5, cy - 0.5, 2, 1.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(CX + 3, cy - 0.5, 2, 1.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawCharacterFrame(
  ctx: CanvasRenderingContext2D,
  p: CharacterPalette,
  spec: FrameSpec,
  offsetX: number,
  isThink: boolean,
) {
  ctx.save();
  ctx.translate(offsetX, 0);

  const dy = spec.dy;
  const lShoulderX = CX - BODY_W / 2;
  const rShoulderX = CX + BODY_W / 2;
  const sY = SHOULDER_Y + dy;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(CX, 45, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  drawLeg(ctx, p, spec.lf[0], spec.lf[1] - LEG_H - SHOE_H + 1);
  drawLeg(ctx, p, spec.rf[0], spec.rf[1] - LEG_H - SHOE_H + 1);

  // Left arm (behind body)
  drawArm(ctx, p, lShoulderX, sY, spec.lh[0], spec.lh[1] + dy);

  // Body
  drawBody(ctx, p, dy);

  // Right arm (in front if not think; for think, draw after head)
  if (!isThink) {
    drawArm(ctx, p, rShoulderX, sY, spec.rh[0], spec.rh[1] + dy);
  }

  // Head + face
  drawHead(ctx, p, dy, spec.blink, spec.mouthOpen);

  // Hair on top
  drawHair(ctx, p, dy, p.hairStyle);

  // Glasses (drawn after hair so they sit on top)
  if (p.glasses) {
    drawGlasses(ctx, dy);
  }

  // Think: draw right arm on top (hand on chin)
  if (isThink) {
    drawArm(ctx, p, rShoulderX, sY, spec.rh[0], spec.rh[1] + dy);
  }

  ctx.restore();
}

// ---- public API ----

export function generateSpriteSheet(
  palette: CharacterPalette,
): HTMLCanvasElement {
  const states: AnimState[] = ["idle", "walk", "type", "think"];
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_PX * 8;
  canvas.height = FRAME_PX;
  const ctx = canvas.getContext("2d")!;

  let fi = 0;
  for (const state of states) {
    for (let f = 0; f < 2; f++) {
      const key = `${state}_${f}`;
      const spec = SPECS[key];
      drawCharacterFrame(ctx, palette, spec, fi * FRAME_PX, state === "think");
      fi++;
    }
  }

  return canvas;
}

export function registerAgentTextures(
  scene: Phaser.Scene,
  agentId: string,
  palette: CharacterPalette,
): Record<AnimState, string> {
  const sheet = generateSpriteSheet(palette);
  const states: AnimState[] = ["idle", "walk", "type", "think"];
  const keys: Record<string, string> = {};

  let frameIdx = 0;
  for (const state of states) {
    const key = `agent_${agentId}_${state}`;
    keys[state] = key;

    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = FRAME_PX * 2;
    frameCanvas.height = FRAME_PX;
    const fctx = frameCanvas.getContext("2d")!;
    fctx.drawImage(
      sheet,
      frameIdx * FRAME_PX,
      0,
      FRAME_PX * 2,
      FRAME_PX,
      0,
      0,
      FRAME_PX * 2,
      FRAME_PX,
    );

    if (scene.anims.exists(key)) scene.anims.remove(key);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addSpriteSheet(
      key,
      frameCanvas as unknown as HTMLImageElement,
      {
        frameWidth: FRAME_PX,
        frameHeight: FRAME_PX,
      },
    );

    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 1 }),
      frameRate: state === "walk" ? 5 : state === "type" ? 6 : 2,
      repeat: -1,
    });

    frameIdx += 2;
  }

  return keys as Record<AnimState, string>;
}

/**
 * Load a user-provided PNG sprite sheet and register Phaser textures/anims
 * for a single agent. The sheet must be laid out as:
 *   [idle_0][idle_1][walk_0][walk_1][type_0][type_1][think_0][think_1]
 * Each frame is frameSize × frameSize (default 48).
 *
 * Returns the same anim-key map as registerAgentTextures so the rest of
 * OfficeScene works without changes.
 */
/**
 * Fetch a sprite sheet PNG and return it as a canvas.
 * Call this during scene init so sheets are ready before agents are created.
 */
export async function loadSpriteSheetImage(
  url: string,
): Promise<HTMLCanvasElement> {
  const res = await fetch(url);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  return canvas;
}

/** Default frame rates per animation state. */
export const DEFAULT_FRAME_RATES: Record<AnimState, number> = {
  idle: 2,
  walk: 5,
  type: 6,
  think: 2,
};

export interface SpriteSheetConfig {
  /** Frame width in pixels (default: auto-detected) */
  frameWidth?: number;
  /** Frame height in pixels (default: auto-detected) */
  frameHeight?: number;
  /** Shorthand: sets both frameWidth and frameHeight (square frames) */
  frameSize?: number;
  /** Frames per animation state (default: auto-detected from columns) */
  framesPerState?: number;
  /**
   * Map animation state → row index in the grid.
   * Default for grids (4+ rows):  { idle: 0, walk: 2, type: 1, think: 3 }
   * Default for few rows: rows are reused across states.
   */
  rows?: Partial<Record<AnimState, number>>;
  /**
   * Order of states in a horizontal strip. Each entry maps a strip position
   * to an internal state. Defaults to ["idle", "walk", "type", "think"].
   * E.g. ["idle", "idle", "walk", "think"] to skip the typing animation.
   */
  states?: AnimState[];
  /** Per-state frame rates in FPS. Defaults: idle=2, walk=5, type=6, think=2. */
  frameRates?: Partial<Record<AnimState, number>>;
}

/**
 * Auto-detect the grid layout of a sprite sheet by analysing the image
 * content. Looks for repeating transparent gutters (columns/rows of mostly
 * transparent or uniform pixels) to find frame boundaries.
 *
 * Falls back to dimension-based heuristic if content analysis fails.
 */
function detectGrid(
  w: number,
  h: number,
  imageData?: ImageData,
): { fw: number; fh: number; cols: number; rows: number } {
  // ── Content-based detection ──
  // Sample alpha channel to find columns/rows that are mostly transparent,
  // which indicate frame boundaries.
  if (imageData) {
    const { data } = imageData;
    const alphaThreshold = 10; // near-transparent
    const gutterRatio = 0.85; // 85% of pixels in a column/row must be transparent

    // Score each x-coordinate as a potential vertical frame boundary
    const vScores: number[] = [];
    for (let x = 0; x < w; x++) {
      let transparent = 0;
      for (let y = 0; y < h; y++) {
        if (data[(y * w + x) * 4 + 3] < alphaThreshold) transparent++;
      }
      vScores.push(transparent / h);
    }

    // Score each y-coordinate as a potential horizontal frame boundary
    const hScores: number[] = [];
    for (let y = 0; y < h; y++) {
      let transparent = 0;
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] < alphaThreshold) transparent++;
      }
      hScores.push(transparent / w);
    }

    // Find frame width: look for periodic vertical gutters
    const fwCandidate = findPeriod(vScores, w, gutterRatio);
    const fhCandidate = findPeriod(hScores, h, gutterRatio);

    if (fwCandidate > 0 && fhCandidate > 0) {
      return {
        fw: fwCandidate,
        fh: fhCandidate,
        cols: Math.round(w / fwCandidate),
        rows: Math.round(h / fhCandidate),
      };
    }
  }

  // ── Fallback: dimension-based heuristic ──
  let best = { fw: FRAME_PX, fh: FRAME_PX, cols: 1, rows: 1, score: Infinity };

  for (let cols = 2; cols <= 10; cols++) {
    for (let rows = 1; rows <= 10; rows++) {
      const fw = Math.floor(w / cols);
      const fh = Math.floor(h / rows);
      if (fw < 16 || fw > 128 || fh < 16 || fh > 128) continue;

      const padX = w - fw * cols;
      const padY = h - fh * rows;
      if (padX < 0 || padX > Math.max(4, fw * 0.15)) continue;
      if (padY < 0 || padY > Math.max(4, fh * 0.15)) continue;
      const padScore = (padX + padY) * 0.5;

      // Only penalise extreme ratios (>2:1)
      const ratio = Math.max(fw, fh) / Math.min(fw, fh);
      const ratioScore = ratio > 2 ? (ratio - 2) * 3 : 0;

      // Prefer common grid shapes
      const shapePenalty =
        (cols >= 3 && cols <= 8 ? 0 : 3) +
        (rows >= 3 && rows <= 7 ? 0 : 2);

      // Bonus for 4+ rows (directional sheets)
      const rowBonus = rows >= 4 ? -1.5 : 0;

      const score = padScore + ratioScore + shapePenalty + rowBonus;
      if (score < best.score) best = { fw, fh, cols, rows, score };
    }
  }

  return best;
}

/**
 * Find the most likely frame period in a 1D transparency score array.
 * Looks for a period P where positions near multiples of P have higher
 * transparency than the surrounding mid-frame regions.
 *
 * Works even when frames are tightly packed (no fully transparent gutters)
 * by looking for *relative* transparency peaks at boundaries vs midpoints.
 */
function findPeriod(
  scores: number[],
  length: number,
  _threshold: number,
): number {
  const minSize = 16;
  const maxSize = 128;
  let bestPeriod = 0;
  let bestScore = -Infinity;

  for (let period = minSize; period <= maxSize && period <= length / 2; period++) {
    const divisions = Math.round(length / period);
    if (divisions < 2 || divisions > 10) continue;

    // Measure average transparency AT boundaries vs BETWEEN them
    let boundarySum = 0;
    let boundaryCount = 0;
    let midSum = 0;
    let midCount = 0;

    for (let d = 1; d < divisions; d++) {
      const pos = Math.round(d * period);
      if (pos <= 0 || pos >= length) continue;
      // Sample a ±2px window around the boundary
      for (let offset = -2; offset <= 2; offset++) {
        const i = pos + offset;
        if (i >= 0 && i < length) {
          boundarySum += scores[i];
          boundaryCount++;
        }
      }
    }

    for (let d = 0; d < divisions; d++) {
      const mid = Math.round(d * period + period / 2);
      // Sample a ±2px window around the midpoint
      for (let offset = -2; offset <= 2; offset++) {
        const i = mid + offset;
        if (i >= 0 && i < length) {
          midSum += scores[i];
          midCount++;
        }
      }
    }

    if (boundaryCount === 0 || midCount === 0) continue;

    const avgBoundary = boundarySum / boundaryCount;
    const avgMid = midSum / midCount;

    // Boundaries should be MORE transparent than midpoints
    // (i.e. higher transparency score at edges than at centers)
    const contrast = avgBoundary - avgMid;
    if (contrast <= 0) continue; // no signal at all

    // Slight preference for more divisions (smaller frames = more animation)
    const divBonus = divisions * 0.02;

    const score = contrast + divBonus;
    if (score > bestScore) {
      bestScore = score;
      bestPeriod = period;
    }
  }

  return bestPeriod;
}

/**
 * Register Phaser textures/anims for a single agent from a pre-loaded
 * sprite sheet canvas.
 *
 * Supports arbitrary grid layouts — auto-detects frame size, columns,
 * and rows from the image dimensions. Handles non-square frames and
 * scales everything to FRAME_PX for rendering.
 *
 * Row-to-state mapping:
 *   4+ rows: row 0 = idle, row 1 = type, row 2 = walk, row 3 = think
 *   Fewer rows: rows are reused (row 0 for all if only 1 row, etc.)
 */
export function registerAgentFromSheet(
  scene: Phaser.Scene,
  agentId: string,
  sheetCanvas: HTMLCanvasElement,
  config?: SpriteSheetConfig,
): Record<AnimState, string> {
  const w = sheetCanvas.width;
  const h = sheetCanvas.height;

  // Detect or use configured frame dimensions
  // Fast path: if dimensions are exact multiples of FRAME_PX, skip detection
  const exactFit = w % FRAME_PX === 0 && h % FRAME_PX === 0;
  let grid: { fw: number; fh: number; cols: number; rows: number };
  if (config?.frameSize || config?.frameWidth || exactFit) {
    const gfw = config?.frameSize ?? config?.frameWidth ?? FRAME_PX;
    const gfh = config?.frameSize ?? config?.frameHeight ?? FRAME_PX;
    grid = { fw: gfw, fh: gfh, cols: Math.round(w / gfw), rows: Math.round(h / gfh) };
  } else {
    const ctx = sheetCanvas.getContext("2d", { willReadFrequently: true })!;
    const imageData = ctx.getImageData(0, 0, w, h);
    grid = detectGrid(w, h, imageData);
  }
  const fw = config?.frameSize ?? config?.frameWidth ?? grid.fw;
  const fh = config?.frameSize ?? config?.frameHeight ?? grid.fh;
  const cols = Math.max(1, Math.round(w / fw));
  const rowCount = Math.max(1, Math.round(h / fh));

  console.log(
    `[sprites] ${agentId}: ${w}x${h} → ${cols}x${rowCount} grid, frame ${fw}x${fh}`,
  );

  const isGrid = rowCount >= 4;
  const allStates: AnimState[] = ["idle", "walk", "type", "think"];

  // State ordering for horizontal strips — configurable via config.states
  // e.g. ["idle", "walk", "type", "think"] or ["idle", "idle", "walk", "think"]
  const stripStates: AnimState[] = config?.states ?? allStates;

  const framesPerState = config?.framesPerState ??
    (isGrid ? cols : Math.max(1, Math.floor(cols / stripStates.length)));

  // Build row map for grid sheets — clamp to available rows
  const defaultRowMap: Record<AnimState, number> =
    rowCount >= 4
      ? { idle: 0, walk: 2, type: 1, think: 3 }
      : rowCount >= 2
        ? { idle: 0, walk: 1, type: 0, think: 1 }
        : { idle: 0, walk: 0, type: 0, think: 0 };

  const rowMap: Record<AnimState, number> = { ...defaultRowMap, ...config?.rows };
  for (const s of Object.keys(rowMap) as AnimState[]) {
    rowMap[s] = Math.min(rowMap[s], rowCount - 1);
  }

  // Per-state frame rates — configurable
  const rates: Record<AnimState, number> = { ...DEFAULT_FRAME_RATES, ...config?.frameRates };

  const keys: Record<string, string> = {};

  // For strips: iterate through strip positions sequentially
  // For grids: iterate through the 4 internal states
  const registered = new Set<AnimState>();
  let stripOffset = 0;

  const stateSequence = isGrid ? allStates : stripStates;

  for (let i = 0; i < stateSequence.length; i++) {
    const state = stateSequence[i];

    if (isGrid) {
      // Grid: each state reads from its own row
      const key = `agent_${agentId}_${state}`;
      keys[state] = key;

      const row = rowMap[state];
      const srcY = row * fh;

      const stateCanvas = document.createElement("canvas");
      stateCanvas.width = FRAME_PX * framesPerState;
      stateCanvas.height = FRAME_PX;
      const sctx = stateCanvas.getContext("2d")!;
      for (let f = 0; f < framesPerState; f++) {
        sctx.drawImage(sheetCanvas, f * fw, srcY, fw, fh, f * FRAME_PX, 0, FRAME_PX, FRAME_PX);
      }

      if (scene.anims.exists(key)) scene.anims.remove(key);
      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.addSpriteSheet(key, stateCanvas as unknown as HTMLImageElement, {
        frameWidth: FRAME_PX, frameHeight: FRAME_PX,
      });
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: Math.max(0, framesPerState - 1) }),
        frameRate: rates[state],
        repeat: -1,
      });
    } else {
      // Strip: extract frames sequentially, first occurrence defines the anim
      const actualFrames = Math.min(framesPerState, Math.max(1, cols - stripOffset));

      if (!registered.has(state)) {
        // First time we see this state — register the animation
        const key = `agent_${agentId}_${state}`;
        keys[state] = key;

        const stateCanvas = document.createElement("canvas");
        stateCanvas.width = FRAME_PX * actualFrames;
        stateCanvas.height = FRAME_PX;
        const sctx = stateCanvas.getContext("2d")!;
        for (let f = 0; f < actualFrames; f++) {
          sctx.drawImage(
            sheetCanvas, (stripOffset + f) * fw, 0, fw, fh,
            f * FRAME_PX, 0, FRAME_PX, FRAME_PX,
          );
        }

        if (scene.anims.exists(key)) scene.anims.remove(key);
        if (scene.textures.exists(key)) scene.textures.remove(key);
        scene.textures.addSpriteSheet(key, stateCanvas as unknown as HTMLImageElement, {
          frameWidth: FRAME_PX, frameHeight: FRAME_PX,
        });
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(key, { start: 0, end: Math.max(0, actualFrames - 1) }),
          frameRate: rates[state],
          repeat: -1,
        });
        registered.add(state);
      }
      // Always advance the strip offset (even for duplicates — those frames are skipped)
      stripOffset += actualFrames;
    }
  }

  // Fill any missing states by copying from idle (or the first registered state)
  const fallback = keys["idle"] ?? Object.values(keys)[0];
  for (const s of allStates) {
    if (!keys[s] && fallback) keys[s] = fallback;
  }

  return keys as Record<AnimState, string>;
}
