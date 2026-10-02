const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");
const { ROOT, resolveProducts } = require("./scripts/products");

// Markdown 内の単一改行もスライド上で改行(<br>)として表示する。
marked.setOptions({ breaks: true });

const SRC_DIR = path.join(ROOT, "src");

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// コードブロックの外側にある独立した `---` 行(区切り線)でテキストを分割する。
function splitSections(body) {
  const lines = body.split("\n");
  const sections = [];
  let current = [];
  let fenceChar = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      fenceChar = fenceChar === marker ? null : fenceChar === null ? marker : fenceChar;
      current.push(line);
      continue;
    }
    if (fenceChar === null && /^-{3,}\s*$/.test(line.trim())) {
      sections.push(current.join("\n"));
      current = [];
      continue;
    }
    current.push(line);
  }
  sections.push(current.join("\n"));

  return sections.map((s) => s.trim()).filter(Boolean);
}

// products/<name>/content/slides.md 1ファイルから構成を組み立てる:
//   - 先頭の `#` (h1) -> タイトルスライド
//   - h1 と最初の区切り線 `---` の間のテキスト -> サブタイトル
//   - 区切り線 `---` で分割した各セクション -> 本文スライド1枚
//   - 各本文セクション先頭の `##` (h2) -> そのスライドのタイトル(目次にも使う)
function loadDeck(slidesFile) {
  const label = path.relative(ROOT, slidesFile);
  if (!fs.existsSync(slidesFile)) {
    throw new Error(`Slide file not found: ${label}`);
  }

  const raw = fs.readFileSync(slidesFile, "utf8");
  const { data, content } = matter(raw);
  const sections = splitSections(content.trim());

  if (sections.length === 0) {
    throw new Error(`${label}: no content found`);
  }

  const [titleSection, ...bodySections] = sections;
  const titleMatch = titleSection.match(/^#\s+(.+?)\s*(?:\n|$)/);
  if (!titleMatch) {
    throw new Error(`${label}: document must start with a "# タイトル" heading`);
  }
  const title = titleMatch[1].trim();
  // h1 と最初の区切り線の間に書かれたテキストをサブタイトルとして扱う。
  const subtitle = titleSection.slice(titleMatch[0].length).trim();

  const contentSlides = bodySections.map((section) => {
    const headingMatch = section.match(/^##\s+(.+?)\s*(?:\n|$)/);
    const heading = headingMatch ? headingMatch[1].trim() : "";
    const body = headingMatch ? section.slice(headingMatch[0].length).trim() : section;
    return { title: heading, body };
  });

  return {
    title,
    subtitle,
    author: data.author || "",
    date: data.date,
    contentSlides,
  };
}

function formatDate(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return value;
}

function renderTitleSlide(deck) {
  const meta = [deck.author, formatDate(deck.date)].filter(Boolean);
  return `
    <section class="slide slide--title">
      <h1>${escapeHtml(deck.title)}</h1>
      ${deck.subtitle ? `<p class="subtitle">${deck.subtitle.split(/\s*\n\s*/).map(escapeHtml).join("<br>")}</p>` : ""}
      ${meta.length ? `<div class="meta">${meta.map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>` : ""}
    </section>`;
}

function renderTocSlide(contentSlides) {
  const items = contentSlides.map((s) => s.title).filter(Boolean);
  return `
    <section class="slide slide--toc">
      <h1>目次</h1>
      <ol>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n        ")}
      </ol>
    </section>`;
}

function renderContentSlide(slide) {
  return `
    <section class="slide slide--content">
      <header><h1>${escapeHtml(slide.title)}</h1></header>
      <div class="body">${marked.parse(slide.body || "")}</div>
    </section>`;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function buildHtml(deck) {
  const slidesHtml = [
    renderTitleSlide(deck),
    ...(deck.contentSlides.length ? [renderTocSlide(deck.contentSlides)] : []),
    ...deck.contentSlides.map(renderContentSlide),
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(deck.title)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="deck">
${slidesHtml}
</div>
<div class="deck-nav">
  <span><span data-current>1</span> / <span data-total>1</span></span>
</div>
<script src="deck.js"></script>
</body>
</html>
`;
}

function buildProduct(product) {
  const { distDir } = product;
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const deck = loadDeck(product.slidesFile);
  const html = buildHtml(deck);
  const slideCount = 1 + (deck.contentSlides.length ? 1 : 0) + deck.contentSlides.length;

  fs.writeFileSync(path.join(distDir, "index.html"), html);
  fs.copyFileSync(path.join(SRC_DIR, "style.css"), path.join(distDir, "style.css"));
  fs.copyFileSync(path.join(SRC_DIR, "deck.js"), path.join(distDir, "deck.js"));
  copyDir(product.imagesDir, path.join(distDir, "images"));

  console.log(`[${product.name}] Built ${slideCount} slides -> ${path.relative(ROOT, distDir)}/index.html`);
}

// node build.js [product...]  引数を省略すると products/ 配下をすべてビルドする。
function main() {
  for (const product of resolveProducts(process.argv.slice(2))) {
    buildProduct(product);
  }
}

main();
