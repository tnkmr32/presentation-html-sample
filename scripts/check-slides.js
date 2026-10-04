// 各プロダクトのビルド済み products/<name>/dist/index.html と content/images/*.svg、
// 共通の src/style.css を対象に、固定の合格基準
// (.claude/rules/slide-acceptance-criteria.md)のうち機械的に判定できる項目を検査する。
//
//   node scripts/check-slides.js [product...]          結果を Markdown で標準出力に出す
//                                                      (product 省略時は全プロダクト)
//   node scripts/check-slides.js [product...] --json   結果を JSON で出す
//   node scripts/check-slides.js contrast <前景色> <背景色>   コントラスト比を計算する
//
// error が1件でもあれば終了コード 1 を返す。warning は人(検証エージェント)が判断する。

const fs = require("fs");
const path = require("path");

const { ROOT, resolveProducts } = require("./products");

const STYLE_CSS = path.join(ROOT, "src", "style.css");

// 分量の目安(超えたら warning)。値の根拠は slide-acceptance-criteria.md を参照。
const LIMITS = {
  bulletsPerSlide: 6,
  charsPerSlide: 250,
  tableRows: 7,
  tableCols: 5,
};

// 本文中の画像の表示上限(1280×720 での px)。src/style.css の .slide--content .body img
// (max-width: 100% = 本文幅 約1100px、max-height: 35vh = 252px)に合わせる。
// 値の根拠は .claude/rules/slide-authoring.md「画像」を参照。テンプレートを変えたら更新する。
const IMG_MAX = { width: 1100, height: 252 };
const MIN_EFFECTIVE_FONT_PX = 16;

// ---------- color utilities ----------

const NAMED_COLORS = { white: "#ffffff", black: "#000000", transparent: null, none: null };

function parseColor(value) {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v in NAMED_COLORS) return NAMED_COLORS[v];
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return "#" + m[1].split("").map((c) => c + c).join("");
  m = v.match(/^#([0-9a-f]{6})$/);
  if (m) return v;
  m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (m) {
    if (m[4] !== undefined && parseFloat(m[4]) < 1) return null; // 半透明は判定対象外
    return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  }
  return null;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ---------- result collection ----------

const results = [];

function report(level, criterion, target, message) {
  results.push({ level, criterion, target, message });
}

// ---------- CSS ----------

function parseCssRules(css) {
  const rules = [];
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}@]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(body))) {
    const decls = {};
    for (const d of m[2].split(";")) {
      const i = d.indexOf(":");
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
    rules.push({ selector: m[1].trim().replace(/\s+/g, " "), decls });
  }
  return rules;
}

function checkCss() {
  if (!fs.existsSync(STYLE_CSS)) {
    report("error", "F-1.4.3", "src/style.css", "style.css が見つからない");
    return;
  }
  const rules = parseCssRules(fs.readFileSync(STYLE_CSS, "utf8"));
  const vars = {};
  for (const r of rules) {
    if (r.selector === ":root") {
      for (const [k, v] of Object.entries(r.decls)) if (k.startsWith("--")) vars[k] = v;
    }
  }
  const resolve = (v) => {
    if (!v) return null;
    const m = v.match(/var\((--[\w-]+)\)/);
    return parseColor(m ? vars[m[1]] : v);
  };
  const paper = resolve("var(--paper)") || "#ffffff";

  for (const r of rules) {
    if (r.selector === ":root" || !r.decls.color) continue;
    // 文字は常にスライドの紙色の上に描画される(html/body の背景 --stage は見えない)。
    // 自身で単色の背景を持つ要素(コード・表見出し等)だけはその背景で判定する。
    const fg = resolve(r.decls.color);
    const bgDecl = r.decls["background-color"] || r.decls.background;
    const bg = r.selector.startsWith("html") ? paper : resolve(bgDecl) || paper;
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    const target = `${r.selector} (${fg} on ${bg})`;
    if (ratio < 4.5) report("error", "F-1.4.3", target, `コントラスト比 ${ratio.toFixed(2)}:1 < 4.5:1`);
  }

  // タイトルスライドはグラデーション背景のため、暗い側(--surface)でも検査する。
  const softBg = resolve("var(--surface)");
  const inkSoft = resolve("var(--ink-soft)");
  if (softBg && inkSoft) {
    const ratio = contrastRatio(inkSoft, softBg);
    if (ratio < 4.5) {
      report("error", "F-1.4.3", `.slide--title .subtitle (${inkSoft} on ${softBg})`, `コントラスト比 ${ratio.toFixed(2)}:1 < 4.5:1`);
    }
  }
}

// ---------- HTML ----------

function stripTags(html) {
  return html
    .replace(/<pre[\s\S]*?<\/pre>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, "x")
    .replace(/\s+/g, "");
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[2] !== undefined ? m[2] : m[3]) : null;
}

function checkHtml(product) {
  const distHtml = path.join(product.distDir, "index.html");
  const label = path.relative(ROOT, distHtml);
  if (!fs.existsSync(distHtml)) {
    report("error", "BUILD", label, `ビルド成果物がない。先に npm run build -- ${product.name} を実行すること`);
    return;
  }
  const html = fs.readFileSync(distHtml, "utf8");

  const lang = (html.match(/<html[^>]*\slang="([^"]*)"/) || [])[1];
  if (!lang) report("error", "F-3.1.1", "<html>", "lang 属性がない");

  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  if (!title || !title.trim()) report("error", "F-2.4.2", "<title>", "ページタイトルが空");

  const slides = html.match(/<section class="slide[\s\S]*?<\/section>/g) || [];
  if (slides.length === 0) report("error", "BUILD", label, "スライドが1枚もない");

  slides.forEach((slide, i) => {
    const no = `slide ${i + 1}`;
    const h1 = (slide.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1];
    if (!h1 || !h1.trim()) report("error", "F-2.4.6", no, "スライドタイトル(h1)が空");

    for (const img of slide.match(/<img\b[^>]*>/g) || []) {
      const src = attr(img, "src");
      const alt = attr(img, "alt");
      if (alt === null) report("error", "F-1.1.1", `${no} ${src}`, "alt 属性がない");
      else if (!alt.trim()) report("warning", "F-1.1.1", `${no} ${src}`, "alt が空(装飾画像として扱われる)。情報を持つ画像なら代替テキストが必要");
      else if (/^(画像|image|図|写真|sample)$/i.test(alt.trim())) report("error", "F-1.1.1", `${no} ${src}`, `alt "${alt}" が内容を説明していない`);
      if (src && !/^(https?:|data:)/.test(src) && !fs.existsSync(path.join(product.distDir, src))) {
        report("error", "BUILD", `${no} ${src}`, "参照先の画像ファイルが存在しない");
      }
    }

    for (const a of slide.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) || []) {
      const text = stripTags(a);
      if (!text || /^(こちら|ここ|リンク|clickhere|here|more)$/i.test(text)) {
        report("error", "F-2.4.4", no, `リンクテキスト "${text}" から目的が分からない`);
      }
    }

    for (const table of slide.match(/<table[\s\S]*?<\/table>/g) || []) {
      if (!/<th\b/.test(table)) report("error", "F-1.3.1", no, "表に見出しセル(th)がない");
      const rows = (table.match(/<tr\b/g) || []).length;
      const cols = ((table.match(/<tr\b[\s\S]*?<\/tr>/) || [""])[0].match(/<t[hd]\b/g) || []).length;
      if (rows - 1 > LIMITS.tableRows) report("warning", "F-DENSITY", no, `表のデータ行が ${rows - 1} 行(目安 ${LIMITS.tableRows} 行以内)`);
      if (cols > LIMITS.tableCols) report("warning", "F-DENSITY", no, `表の列が ${cols} 列(目安 ${LIMITS.tableCols} 列以内)`);
    }

    if (/slide--content/.test(slide)) {
      const body = (slide.match(/<div class="body">([\s\S]*)<\/div>/) || [])[1] || "";
      const bullets = (body.match(/<li\b/g) || []).length;
      if (bullets > LIMITS.bulletsPerSlide) report("warning", "F-DENSITY", no, `箇条書きが ${bullets} 項目(目安 ${LIMITS.bulletsPerSlide} 項目以内)`);
      const chars = stripTags(body.replace(/<table[\s\S]*?<\/table>/g, "")).length;
      if (chars > LIMITS.charsPerSlide) report("warning", "F-DENSITY", no, `本文が ${chars} 文字(目安 ${LIMITS.charsPerSlide} 文字以内)`);
    }
  });

  // 引用番号リンク [n](#ref-n): リンク先の id があり、参考文献リストの番号と id が一致すること(F-SOURCE)。
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const [, href] of html.matchAll(/<a\b[^>]*\shref="#([^"]+)"/g)) {
    if (!/^\d+$/.test(href) && !ids.has(href)) report("error", "F-SOURCE", `#${href}`, "ページ内リンクの参照先 id がない");
  }
  for (const [, olTag, items] of html.matchAll(/(<ol\b[^>]*>)([\s\S]*?)<\/ol>/g)) {
    const start = parseInt(attr(olTag, "start") || "1", 10);
    (items.match(/<li\b[\s\S]*?<\/li>/g) || []).forEach((li, i) => {
      const ref = (li.match(/\sid="ref-(\d+)"/) || [])[1];
      if (ref && Number(ref) !== start + i) {
        report("error", "F-SOURCE", `#ref-${ref}`, `参考文献リストの番号 ${start + i} と id が一致しない`);
      }
    });
  }

  // 点滅・自動再生するメディアは使わない(F-2.2.2 / F-2.3.1)。
  if (/<(video|audio)\b[^>]*autoplay/i.test(html) || /<marquee|<blink/i.test(html)) {
    report("error", "F-2.2.2", label, "自動再生・点滅する要素がある");
  }
}

// ---------- SVG images ----------

function checkSvgs(product) {
  if (!fs.existsSync(product.imagesDir)) return;
  for (const file of fs.readdirSync(product.imagesDir).filter((f) => f.endsWith(".svg"))) {
    const target = path.relative(ROOT, path.join(product.imagesDir, file));
    const svg = fs.readFileSync(path.join(product.imagesDir, file), "utf8");

    if (/<script\b/i.test(svg)) report("error", "SAFETY", target, "SVG に script が含まれている");
    if (/<animate|<set\b|@keyframes/i.test(svg)) report("warning", "F-2.3.1", target, "アニメーションを含む。点滅(1秒に3回超)がないか目視確認すること");

    // 背景: 全面を覆う rect(width が 100% か viewBox の幅と一致)の fill。なければ白(スライドの紙色)。
    const viewBox = (svg.match(/viewBox="[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)"/) || []).slice(1);
    const viewBoxWidth = viewBox[0] || null;
    const bgRect = (svg.match(/<rect\b[^>]*>/g) || []).find((r) => {
      const w = attr(r, "width");
      return w === "100%" || (viewBoxWidth && w === viewBoxWidth);
    });
    const bg = parseColor(bgRect && attr(bgRect, "fill")) || "#ffffff";

    // 表示倍率: テンプレートの表示上限に収めるための縮小率。文字の大きさは倍率を掛けた実効サイズで判定する。
    const scale = viewBox.length
      ? Math.min(1, IMG_MAX.width / parseFloat(viewBox[0]), IMG_MAX.height / parseFloat(viewBox[1]))
      : 1;
    let minSize = Infinity;

    for (const text of svg.match(/<text\b[^>]*>/g) || []) {
      const style = attr(text, "style") || "";
      const fill = parseColor(attr(text, "fill") || (style.match(/fill:\s*([^;]+)/) || [])[1]) || "#000000";
      const size = parseFloat(attr(text, "font-size") || (style.match(/font-size:\s*([\d.]+)/) || [])[1] || "16") * scale;
      minSize = Math.min(minSize, size);
      const bold = /bold|[6-9]00/.test(attr(text, "font-weight") || style);
      const large = size >= 24 || (bold && size >= 18.66);
      const min = large ? 3 : 4.5;
      const ratio = contrastRatio(fill, bg);
      if (ratio < min) {
        report("error", "F-1.4.3", `${target} <text fill=${fill}> on ${bg}`, `コントラスト比 ${ratio.toFixed(2)}:1 < ${min}:1(実効 ${size.toFixed(1)}px)`);
      }
    }
    if (minSize < MIN_EFFECTIVE_FONT_PX) {
      report(
        "error",
        "F-LEGIBLE",
        target,
        `最小の文字が実効 ${minSize.toFixed(1)}px < ${MIN_EFFECTIVE_FONT_PX}px(viewBox ${viewBox.join("×")}、表示倍率 ${scale.toFixed(2)})`
      );
    }
  }
}

// ---------- output ----------

function printMarkdown() {
  const errors = results.filter((r) => r.level === "error");
  const warnings = results.filter((r) => r.level === "warning");
  console.log(`# check-slides 結果\n`);
  console.log(`- error: ${errors.length}`);
  console.log(`- warning: ${warnings.length}\n`);
  if (results.length) {
    console.log("| level | 基準 | 対象 | 内容 |");
    console.log("| --- | --- | --- | --- |");
    for (const r of results) {
      console.log(`| ${r.level} | ${r.criterion} | ${r.target.replace(/\|/g, "\\|")} | ${r.message.replace(/\|/g, "\\|")} |`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "contrast") {
    const [fg, bg] = [parseColor(args[1]), parseColor(args[2])];
    if (!fg || !bg) {
      console.error("usage: node scripts/check-slides.js contrast <#rrggbb> <#rrggbb>");
      process.exit(2);
    }
    const ratio = contrastRatio(fg, bg);
    console.log(`${fg} on ${bg}: ${ratio.toFixed(2)}:1 (通常文字 ${ratio >= 4.5 ? "OK" : "NG"} / 大きい文字・図形 ${ratio >= 3 ? "OK" : "NG"})`);
    return;
  }

  checkCss();
  for (const product of resolveProducts(args.filter((a) => !a.startsWith("--")))) {
    const before = results.length;
    checkHtml(product);
    checkSvgs(product);
    // スライド番号だけでは区別できないため、プロダクト名を対象に付ける。
    for (const r of results.slice(before)) r.target = `[${product.name}] ${r.target}`;
  }

  if (args.includes("--json")) console.log(JSON.stringify(results, null, 2));
  else printMarkdown();

  process.exitCode = results.some((r) => r.level === "error") ? 1 : 0;
}

main();
