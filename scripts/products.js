// products/<name>/ 単位のスライド(プロダクト)の一覧とパスを扱う。
//   products/<name>/content/slides.md   スライド本文
//   products/<name>/content/images/     画像
//   products/<name>/dist/               ビルド成果物(git 管理対象外)
//   products/<name>/reports/            作成ワークフローのレポート

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT, "products");

function productPaths(name) {
  const dir = path.join(PRODUCTS_DIR, name);
  return {
    name,
    dir,
    slidesFile: path.join(dir, "content", "slides.md"),
    imagesDir: path.join(dir, "content", "images"),
    distDir: path.join(dir, "dist"),
  };
}

function listProducts() {
  if (!fs.existsSync(PRODUCTS_DIR)) return [];
  return fs
    .readdirSync(PRODUCTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(productPaths(e.name).slidesFile))
    .map((e) => e.name)
    .sort();
}

// コマンドライン引数で指定されたプロダクト(省略時は全件)を返す。
// "products/foo" や "products/foo/content" のようなパス指定も受け付ける。
function resolveProducts(args) {
  const all = listProducts();
  if (args.length === 0) {
    if (all.length === 0) throw new Error(`No products found: ${path.relative(ROOT, PRODUCTS_DIR)}/<name>/content/slides.md`);
    return all.map(productPaths);
  }
  return args.map((arg) => {
    const name = arg.replace(/\\/g, "/").replace(/^\.?\/?(products\/)?/, "").split("/")[0];
    if (!all.includes(name)) {
      throw new Error(`Unknown product "${arg}". Available: ${all.join(", ") || "(none)"}`);
    }
    return productPaths(name);
  });
}

module.exports = { ROOT, PRODUCTS_DIR, productPaths, listProducts, resolveProducts };
