const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const ROOT = __dirname;
const SLIDES_DIR = path.join(ROOT, "content", "slides");
const IMAGES_DIR = path.join(ROOT, "content", "images");
const SRC_DIR = path.join(ROOT, "src");
const DIST_DIR = path.join(ROOT, "dist");

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function loadSlides() {
  const files = fs
    .readdirSync(SLIDES_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No markdown files found in ${SLIDES_DIR}`);
  }

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(SLIDES_DIR, file), "utf8");
    const { data, content } = matter(raw);
    if (!data.type) {
      throw new Error(`${file}: frontmatter must include "type" (title | toc | content)`);
    }
    return { file, data, body: content.trim() };
  });
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

function renderTitleSlide({ data }) {
  const meta = [data.author, formatDate(data.date)].filter(Boolean);
  return `
    <section class="slide slide--title">
      <h1>${escapeHtml(data.title || "")}</h1>
      ${data.subtitle ? `<p class="subtitle">${escapeHtml(data.subtitle)}</p>` : ""}
      ${meta.length ? `<div class="meta">${meta.map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>` : ""}
    </section>`;
}

function renderTocSlide({ data, body }, contentSlides) {
  const items = Array.isArray(data.items) && data.items.length
    ? data.items
    : contentSlides.map((s) => s.data.title || s.file);

  return `
    <section class="slide slide--toc">
      <h1>${escapeHtml(data.title || "目次")}</h1>
      <ol>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n        ")}
      </ol>
    </section>`;
}

function renderContentSlide({ data, body }) {
  return `
    <section class="slide slide--content">
      <header><h1>${escapeHtml(data.title || "")}</h1></header>
      <div class="body">${marked.parse(body || "")}</div>
    </section>`;
}

function renderSlide(slide, contentSlides) {
  switch (slide.data.type) {
    case "title":
      return renderTitleSlide(slide);
    case "toc":
      return renderTocSlide(slide, contentSlides);
    case "content":
      return renderContentSlide(slide);
    default:
      throw new Error(`${slide.file}: unknown type "${slide.data.type}"`);
  }
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

function buildHtml(slides, contentSlides) {
  const deckTitle = slides.find((s) => s.data.type === "title")?.data.title || "Presentation";
  const slidesHtml = slides.map((s) => renderSlide(s, contentSlides)).join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(deckTitle)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="deck">
${slidesHtml}
</div>
<div class="deck-nav">
  <button type="button" data-prev aria-label="前のスライド">&#8592;</button>
  <span><span data-current>1</span> / <span data-total>1</span></span>
  <button type="button" data-next aria-label="次のスライド">&#8594;</button>
</div>
<script src="deck.js"></script>
</body>
</html>
`;
}

function main() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const slides = loadSlides();
  const contentSlides = slides.filter((s) => s.data.type === "content");
  const html = buildHtml(slides, contentSlides);

  fs.writeFileSync(path.join(DIST_DIR, "index.html"), html);
  fs.copyFileSync(path.join(SRC_DIR, "style.css"), path.join(DIST_DIR, "style.css"));
  fs.copyFileSync(path.join(SRC_DIR, "deck.js"), path.join(DIST_DIR, "deck.js"));
  copyDir(IMAGES_DIR, path.join(DIST_DIR, "images"));

  console.log(`Built ${slides.length} slides -> ${path.relative(ROOT, DIST_DIR)}/index.html`);
}

main();
