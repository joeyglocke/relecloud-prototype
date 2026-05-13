// Zips appPackage/ into appPackage/relecloud.zip so it can be sideloaded
// in Teams (Apps → Manage your apps → Upload an app → Upload a custom app).
//
// Uses only Node's built-in zlib + a tiny ZIP container writer (no external
// deps). The output is a valid Store-method zip — sufficient for Teams.

import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_PKG = join(__dirname, '..', 'appPackage');
const OUT_PATH = join(APP_PKG, 'relecloud.zip');

const FILES = ['manifest.json', 'color.png', 'outline.png'];

// CRC32 (same polynomial used in zip)
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

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

const entries = [];
let offset = 0;
const localParts = [];

for (const name of FILES) {
  const data = readFileSync(join(APP_PKG, name));
  const compressed = deflateRawSync(data);
  const useDeflate = compressed.length < data.length;
  const payload = useDeflate ? compressed : data;
  const nameBuf = Buffer.from(name, 'utf8');
  const crc = crc32(data);

  // Local file header (signature 0x04034b50)
  const local = Buffer.concat([
    u32(0x04034b50),
    u16(20), // version needed
    u16(0), // flags
    u16(useDeflate ? 8 : 0), // method (deflate / store)
    u16(0), // mod time
    u16(0), // mod date
    u32(crc),
    u32(payload.length),
    u32(data.length),
    u16(nameBuf.length),
    u16(0),
    nameBuf,
    payload,
  ]);
  localParts.push(local);

  entries.push({
    nameBuf,
    crc,
    compressedSize: payload.length,
    uncompressedSize: data.length,
    method: useDeflate ? 8 : 0,
    offset,
  });
  offset += local.length;
}

// Central directory
const centralParts = entries.map((e) =>
  Buffer.concat([
    u32(0x02014b50),
    u16(20), // version made by
    u16(20), // version needed
    u16(0), // flags
    u16(e.method),
    u16(0), // mod time
    u16(0), // mod date
    u32(e.crc),
    u32(e.compressedSize),
    u32(e.uncompressedSize),
    u16(e.nameBuf.length),
    u16(0), // extra
    u16(0), // comment
    u16(0), // disk number
    u16(0), // internal attrs
    u32(0), // external attrs
    u32(e.offset),
    e.nameBuf,
  ]),
);
const central = Buffer.concat(centralParts);

// End of central directory
const eocd = Buffer.concat([
  u32(0x06054b50),
  u16(0), // disk
  u16(0), // disk where central starts
  u16(entries.length), // entries on this disk
  u16(entries.length), // total entries
  u32(central.length),
  u32(offset), // offset of central dir
  u16(0), // comment length
]);

mkdirSync(APP_PKG, { recursive: true });
writeFileSync(OUT_PATH, Buffer.concat([...localParts, central, eocd]));
console.log(`wrote ${OUT_PATH} (${entries.length} files)`);
