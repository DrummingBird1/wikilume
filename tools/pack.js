// Builds store-ready zips (no dependencies):   node tools/pack.js
//   dist/wikifree-<version>-chrome.zip   Chrome Web Store, also installable in Edge and other Chromium browsers
//   dist/wikifree-<version>-firefox.zip  Firefox (adds browser_specific_settings; untested, see README)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const DIRS = ['icons', 'popup', 'src'];

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

function dosDateTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** Minimal zip writer: deflate, UTF-8 names, forward slashes (what the stores expect). */
function makeZip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  const { time, date } = dosDateTime(new Date());
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    locals.push(lh, nameBuf, comp);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(time, 12);
    ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, nameBuf);

    offset += lh.length + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) out.push(...walk(rel));
    else if (!/^(\.DS_Store|Thumbs\.db|desktop\.ini)$/.test(e.name)) out.push(rel);
  }
  return out.sort();
}

function build(variant, manifestObj) {
  const entries = [{ name: 'manifest.json', data: Buffer.from(JSON.stringify(manifestObj, null, 2) + '\n', 'utf8') }];
  for (const d of DIRS) for (const rel of walk(d)) entries.push({ name: rel, data: fs.readFileSync(path.join(root, rel)) });
  const zip = makeZip(entries);
  const outDir = path.join(root, 'dist');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `wikifree-${manifest.version}-${variant}.zip`);
  fs.writeFileSync(file, zip);
  console.log(`${path.relative(root, file)}  ${entries.length} files, ${(zip.length / 1024).toFixed(1)} KB`);
}

build('chrome', manifest);

// Firefox needs an add-on id (also required for storage.sync) and, on recent versions, a data-collection declaration.
// The id below is a placeholder: use one you control before submitting to addons.mozilla.org.
build('firefox', {
  ...manifest,
  browser_specific_settings: {
    gecko: {
      id: 'wikifree@wikifree.invalid',
      strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] },
    },
  },
});
