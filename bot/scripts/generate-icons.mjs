// Tiny PNG generator for the two Teams app icons. Writes:
//   appPackage/color.png    — 192×192 Relecloud-blue tile with a small
//                              white check-mark on a cloud
//   appPackage/outline.png  — 32×32  transparent, white cloud outline
//
// Hand-rolls PNG bytes (signature + IHDR + IDAT + IEND) using only the
// standard library, so no `sharp` / `canvas` dependency is needed. Two
// pixel formats are emitted:
//   • RGB   (color type 2) for the solid color icon
//   • RGBA  (color type 6) for the transparent outline icon

import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_PKG = join(__dirname, '..', 'appPackage');
mkdirSync(APP_PKG, { recursive: true });

// ── CRC32 ───────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG chunk writer ────────────────────────────────────────────────────
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makePng(width, height, channels, pixels) {
  // pixels = Uint8Array of (width * height * channels) bytes, row-major
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(channels === 4 ? 6 : 2, 9); // color type (6 = RGBA, 2 = RGB)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Wrap each row with a filter byte (0 = None)
  const rowStride = width * channels;
  const raw = Buffer.alloc((rowStride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowStride + 1)] = 0;
    for (let x = 0; x < rowStride; x++) {
      raw[y * (rowStride + 1) + 1 + x] = pixels[y * rowStride + x];
    }
  }
  const idat = deflateSync(raw);

  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Cloud + check shape (normalized 0..1 coords) ───────────────────────
// Cloud body is built from a few overlapping circles centered roughly
// vertically. Check mark is a thick polyline rasterized with a Manhattan
// distance threshold.
const CLOUD_CIRCLES = [
  // [cx, cy, r] in 0..1 units (image normalized)
  [0.30, 0.60, 0.16],
  [0.46, 0.50, 0.20],
  [0.64, 0.50, 0.18],
  [0.78, 0.60, 0.14],
  [0.50, 0.66, 0.20],
];

const CHECK_POINTS = [
  [0.38, 0.62],
  [0.46, 0.70],
  [0.64, 0.50],
];

function inCloud(u, v) {
  for (const [cx, cy, r] of CLOUD_CIRCLES) {
    const dx = u - cx;
    const dy = v - cy;
    if (dx * dx + dy * dy <= r * r) return true;
  }
  return false;
}

function distSegment(u, v, a, b) {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(u - ax, v - ay);
  let t = ((u - ax) * dx + (v - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx;
  const py = ay + t * dy;
  return Math.hypot(u - px, v - py);
}

function onCheck(u, v, halfWidth) {
  for (let i = 0; i < CHECK_POINTS.length - 1; i++) {
    if (distSegment(u, v, CHECK_POINTS[i], CHECK_POINTS[i + 1]) <= halfWidth) {
      return true;
    }
  }
  return false;
}

// ── color.png: 192×192 RGB, solid Relecloud blue + white cloud + blue check
{
  const W = 192;
  const H = 192;
  const px = new Uint8Array(W * H * 3);
  const BG = [0x0f, 0x6c, 0xbd]; // Relecloud blue
  const CLOUD = [0xff, 0xff, 0xff];
  const CHECK = [0x0f, 0x6c, 0xbd];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const v = (y + 0.5) / H;
      let rgb = BG;
      if (inCloud(u, v)) rgb = CLOUD;
      if (onCheck(u, v, 0.022)) rgb = CHECK;
      const off = (y * W + x) * 3;
      px[off] = rgb[0];
      px[off + 1] = rgb[1];
      px[off + 2] = rgb[2];
    }
  }

  writeFileSync(join(APP_PKG, 'color.png'), makePng(W, H, 3, px));
  console.log('wrote appPackage/color.png');
}

// ── outline.png: 32×32 RGBA, transparent with white cloud outline only
{
  const W = 32;
  const H = 32;
  const px = new Uint8Array(W * H * 4); // all zeros = transparent black
  const RIM = 0.035; // outline thickness in normalized units

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const v = (y + 0.5) / H;
      // "On the outline" = inside the cloud near the edge: shortest signed
      // distance to any boundary circle is within RIM.
      let inside = false;
      let minEdgeDist = Infinity;
      for (const [cx, cy, r] of CLOUD_CIRCLES) {
        const d = Math.hypot(u - cx, v - cy) - r;
        if (d <= 0) {
          inside = true;
          minEdgeDist = Math.min(minEdgeDist, -d); // distance into cloud
        }
      }
      let alpha = 0;
      if (inside && minEdgeDist <= RIM) {
        alpha = 255;
      }
      const off = (y * W + x) * 4;
      px[off] = 0xff;
      px[off + 1] = 0xff;
      px[off + 2] = 0xff;
      px[off + 3] = alpha;
    }
  }

  writeFileSync(join(APP_PKG, 'outline.png'), makePng(W, H, 4, px));
  console.log('wrote appPackage/outline.png');
}
