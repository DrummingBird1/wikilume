// Generates icons/icon{16,32,48,128}.png (no dependencies). Run: node tools/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

// signed distance helpers (in unit square coordinates 0..1)
const sdRoundRect = (x, y, r) => {
  const qx = Math.abs(x - 0.5) - (0.5 - r);
  const qy = Math.abs(y - 0.5) - (0.5 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const sdSegment = (px, py, ax, ay, bx, by) => {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
};

// "W" polyline in unit coordinates (matches the in-page logo)
const W = [[7, 10], [11.5, 22], [16, 13], [20.5, 22], [25, 10]].map(([x, y]) => [x / 32, y / 32]);
const STROKE = 1.35 / 32; // half of the 2.6 stroke width, in unit coords

function render(size) {
  const SS = 4; // supersampling
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          if (sdRoundRect(u, v, 0.25) > 0) continue; // outside the tile
          // gradient #6366f1 -> #14b8a6 along the diagonal
          const k = (u + v) / 2;
          let cr = 0x63 + (0x14 - 0x63) * k, cg = 0x66 + (0xb8 - 0x66) * k, cb = 0xf1 + (0xa6 - 0xf1) * k;
          let d = Infinity;
          for (let i = 0; i < W.length - 1; i++) d = Math.min(d, sdSegment(u, v, W[i][0], W[i][1], W[i + 1][0], W[i + 1][1]));
          if (d <= STROKE) { cr = cg = cb = 255; }
          r += cr; g += cg; b += cb; a += 255;
        }
      }
      const n = SS * SS;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const cov = a / (255 * n);
      raw[o] = cov ? Math.round(r / (cov * n)) : 0;
      raw[o + 1] = cov ? Math.round(g / (cov * n)) : 0;
      raw[o + 2] = cov ? Math.round(b / (cov * n)) : 0;
      raw[o + 3] = Math.round(cov * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });
for (const s of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(out, `icon${s}.png`), render(s));
  console.log('wrote icon' + s + '.png');
}
