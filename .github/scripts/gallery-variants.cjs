// Уменьшенные копии картинок из галерей для srcset (см. _includes/gallery.html).
//
// Скриншот 920×2000 показывается в галерее шириной около 230 CSS-пикселей,
// поэтому телефону хватает копии на 480 или 720 пикселей. Копии кладутся рядом
// с оригиналом: appstore_1.webp → appstore_1@480w.webp. В репозиторий они не
// попадают (.gitignore): их делает GitHub Actions перед сборкой Jekyll, а
// gallery.html добавляет в srcset только те копии, что нашлись среди файлов
// сайта, так что без них (обычный jekyll serve) всё работает по-старому.
//
// Берутся строки галерей с указанным размером (файл|alt|ШxВ): без размера
// gallery.html не может посчитать sizes. Ширины — в _data/gallery_variants.json.
//
// Запуск: SHARP_DIR=<папка, куда установлен sharp> node .github/scripts/gallery-variants.cjs

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const sharp = require(process.env.SHARP_DIR
  ? path.join(path.resolve(process.env.SHARP_DIR), 'node_modules', 'sharp')
  : 'sharp');
const { widths } = JSON.parse(fs.readFileSync(path.join(root, '_data', 'gallery_variants.json'), 'utf8'));

const postsDir = path.join(root, 'blog', '_posts');
const CAPTURE = /{%-?\s*capture\s+\w+\s*-?%}([\s\S]*?){%-?\s*endcapture\s*-?%}/g;
const LINE = /^\s*([^\s|]+\.(?:webp|png|jpe?g))\s*\|[^|]*\|\s*\d+\s*x\s*\d+\s*$/i;

function sources() {
  const files = new Set();
  for (const name of fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(postsDir, name), 'utf8');
    const post = name.replace(/\.md$/, '');
    for (const [, block] of text.matchAll(CAPTURE)) {
      for (const line of block.split('\n')) {
        const m = line.match(LINE);
        if (!m) continue;
        // Как в gallery.html: путь со слешем — от корня сайта, иначе папка поста
        const rel = m[1].includes('/') ? m[1] : `/blog/img/${post}/${m[1]}`;
        files.add(path.join(root, rel));
      }
    }
  }
  return [...files];
}

(async () => {
  let made = 0, skipped = 0;
  for (const src of sources()) {
    if (!fs.existsSync(src)) {
      console.warn(`нет файла: ${path.relative(root, src)}`);
      continue;
    }
    const { width } = await sharp(src).metadata();
    const base = src.replace(/\.[^.]+$/, '');
    const srcTime = fs.statSync(src).mtimeMs;
    for (const w of widths) {
      if (w >= width) continue;
      const out = `${base}@${w}w.webp`;
      if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= srcTime) { skipped++; continue; }
      await sharp(src).resize({ width: w }).webp({ quality: 80, effort: 5 }).toFile(out);
      made++;
    }
  }
  console.log(`копий сделано: ${made}, уже были: ${skipped}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
