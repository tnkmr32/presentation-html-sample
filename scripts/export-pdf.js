// プロダクトをビルドし、ヘッドレス Chrome で 1スライド = 1ページ(16:9)の PDF に書き出す。
//
//   node scripts/export-pdf.js [product...]   (product 省略時は全プロダクト)
//
// 出力: products/<name>/dist/<name>.pdf
// PDF ではスクロールできないため、本文がスライドからはみ出しているスライドを警告する。

const { execFileSync } = require("child_process");
const path = require("path");
const { pathToFileURL } = require("url");
const puppeteer = require("puppeteer");
const { ROOT, resolveProducts } = require("./products");

// src/style.css の @page と同じサイズ。
const PAGE = { width: 1280, height: 720 };

async function exportProduct(browser, product) {
  const page = await browser.newPage();
  await page.setViewport(PAGE);
  await page.emulateMediaType("print");
  await page.goto(pathToFileURL(path.join(product.distDir, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  const overflows = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".slide"))
      .map((slide, i) => {
        const body = slide.querySelector(".body") || slide;
        const title = (slide.querySelector("h1") || {}).textContent || "";
        return { no: i + 1, title, over: body.scrollHeight - body.clientHeight };
      })
      .filter((s) => s.over > 1)
  );

  const file = path.join(product.distDir, `${product.name}.pdf`);
  await page.pdf({ path: file, printBackground: true, preferCSSPageSize: true });
  await page.close();

  console.log(`[${product.name}] PDF -> ${path.relative(ROOT, file)}`);
  for (const s of overflows) {
    console.warn(`[${product.name}] warning: slide ${s.no}「${s.title}」の本文が ${s.over}px はみ出している(PDF では切れる)`);
  }
  return overflows.length;
}

async function main() {
  const products = resolveProducts(process.argv.slice(2));
  execFileSync(process.execPath, [path.join(ROOT, "build.js"), ...products.map((p) => p.name)], { stdio: "inherit" });

  const browser = await puppeteer.launch();
  let warnings = 0;
  try {
    for (const product of products) warnings += await exportProduct(browser, product);
  } finally {
    await browser.close();
  }
  if (warnings) console.warn(`${warnings} 件のはみ出しがあります。スライドを分割するか内容を減らしてください。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
