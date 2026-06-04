// Basit ama gecerli PNG ikonlar uretir (harici bagımlılık yok).
// Adacayi -> seftali gradyan zemin + ortada beyaz '✦' (sparkle) yildiz.
import zlib from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(size, maskable) {
  const cx = size / 2, cy = size / 2;
  const R = size * (maskable ? 0.26 : 0.32); // yildiz yaricapi
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const sage = [107, 155, 124], peach = [226, 163, 106];

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const t = y / size;
      let r = lerp(sage[0], peach[0], t);
      let g = lerp(sage[1], peach[1], t);
      let b = lerp(sage[2], peach[2], t);
      // sparkle (astroid) yildiz testi
      const nx = Math.abs((x - cx) / R);
      const ny = Math.abs((y - cy) / R);
      const d = Math.pow(nx, 0.6) + Math.pow(ny, 0.6);
      if (d <= 1) { r = 255; g = 255; b = 255; }
      else if (d <= 1.08) { // yumusak kenar
        const a = (1.08 - d) / 0.08;
        r = lerp(r, 255, a); g = lerp(g, 255, a); b = lerp(b, 255, a);
      }
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(join(OUT, "icon-192.png"), png(192, false));
writeFileSync(join(OUT, "icon-512.png"), png(512, false));
writeFileSync(join(OUT, "icon-maskable-512.png"), png(512, true));
console.log("Ikonlar uretildi: public/icons/");
