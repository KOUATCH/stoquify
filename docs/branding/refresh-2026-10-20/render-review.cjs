// Renders the shipped SVG assets into review boards; no app or browser is started.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const base = path.resolve(__dirname, "../../../public/brand");
const read = name => fs.readFileSync(path.join(base, name), "utf8");
const place = (source, x, y, width, height) => source.replace(/<svg[^>]*>/, `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${source.match(/viewBox="([^"]+)"/)[1]}">`).replace(/<title>.*?<\/title>/g, "");
const text = (x, y, size, fill, value, weight = 400) => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${value}</text>`;
const start = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

async function main() {
  const light = read("stoquify-logo-light.svg");
  const dark = read("stoquify-logo-dark.svg");
  const black = read("stoquify-logo-black.svg");
  const icon = read("stoquify-mark.svg");
  const flat = read("stoquify-symbol-flat.svg");
  let board = start(1200, 880) + `<rect width="1200" height="880" fill="#f6f8fc"/>`;
  board += text(64, 65, 14, "#536575", "STOQUIFY  /  CONNECT", 700);
  board += text(64, 110, 31, "#132028", "Three parts. One business.", 700);
  board += text(64, 143, 16, "#536575", "Dimensional vector identity in the established product-blue palette.");
  board += `<rect x="40" y="180" width="1120" height="280" rx="20" fill="#ffffff"/>`;
  board += place(light, 220, 228, 760, 174);
  board += text(64, 433, 12, "#536575", "PRIMARY SIGNATURE / OUTLINED LETTERING");
  board += `<rect x="40" y="480" width="550" height="220" rx="20" fill="#132028"/>`;
  board += place(dark, 86, 524, 460, 105);
  board += text(64, 674, 12, "#b8c7d4", "DARK SURFACES");
  board += `<rect x="610" y="480" width="550" height="220" rx="20" fill="#ffffff"/>`;
  board += place(black, 656, 524, 460, 105);
  board += text(634, 674, 12, "#536575", "ONE-COLOR SIGNATURE");
  board += text(64, 746, 12, "#536575", "SMALL-SIZE ASSETS / ACTUAL PIXELS");
  [16, 24, 32, 48].forEach((size, i) => {
    board += place(icon, 64 + i * 92, 790 - size / 2, size, size);
    board += text(64 + i * 92, 842, 12, "#536575", `${size} px`);
  });
  board += place(flat, 500, 758, 70, 70) + text(590, 798, 14, "#536575", "Flat silhouette for compact use");
  ["#2f7df6", "#5796ff", "#1d4ed8"].forEach((color, i) => {
    board += `<rect x="${920 + i * 72}" y="764" width="48" height="48" rx="12" fill="${color}"/>`;
  });
  board += text(906, 842, 12, "#536575", "BRAND / LIGHT / DEPTH") + "</svg>";
  fs.writeFileSync(path.join(__dirname, "previews/identity-board.svg"), board);
  await sharp(Buffer.from(board)).png().toFile(path.join(__dirname, "previews/identity-board.png"));

  const before = fs.readFileSync(path.join(__dirname, "before-wordmark.svg"), "utf8");
  const comparison = start(1200, 380) + `<rect width="1200" height="380" fill="#fff"/><path d="M600 40V340" stroke="#dce3eb"/>`
    + text(48, 65, 14, "#536575", "BEFORE / EXISTING ASSET", 700)
    + text(648, 65, 14, "#536575", "AFTER / CONNECT", 700)
    + place(before, 50, 125, 500, 135) + place(light, 650, 135, 500, 114)
    + text(48, 320, 15, "#536575", "Decorated q, mixed accents, font-dependent lettering")
    + text(648, 320, 15, "#536575", "Three connected units, brand blues, vector lettering") + "</svg>";
  fs.writeFileSync(path.join(__dirname, "previews/before-after.svg"), comparison);
  await sharp(Buffer.from(comparison)).png().toFile(path.join(__dirname, "previews/before-after.png"));
  console.log("Rendered identity board and before/after comparison from final SVG assets.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
