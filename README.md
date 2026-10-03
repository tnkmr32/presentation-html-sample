# presentation-html-sample

Markdown と画像ファイルでコンテンツを管理する、HTML + CSS 製のプレゼンテーションです。
1つのリポジトリで複数のスライド(デッキ)を `products/<スライド名>/` 単位で管理します。
各デッキの `content/slides.md` を `npm run build` でビルドすると、そのデッキの
`dist/` に `index.html`(CSS/JS/画像込み)が生成されます。

## セットアップ

```sh
npm ci
```

## ビルド

```sh
npm run build              # products/ 配下の全デッキをビルド
npm run build -- <name>    # 指定したデッキだけビルド(複数指定可)
```

`products/<name>/dist/index.html` を開くと発表できます。ローカルサーバーで確認する場合は
`npm run serve` を実行し、`http://localhost:3000/<name>/dist/` を開いてください。

## 新しいスライドを追加する

`products/` の下にデッキ用のディレクトリ(名前は英小文字のケバブケース推奨)を作り、
`content/slides.md` を置きます。

```sh
mkdir -p products/my-talk/content/images
$EDITOR products/my-talk/content/slides.md
npm run build -- my-talk
```

既存のデッキをひな形にする場合は `cp -R products/sample/content products/my-talk/` などで
コピーしてください。

## コンテンツの追加・編集

### スライド (`products/<name>/content/slides.md`)

1つの Markdown ファイルの見出しと区切り線からスライド構成を自動的に組み立てます。
`type` のようなフロントマターの指定は不要です。

- 先頭の `#`(h1)見出し … タイトルスライドになります
- h1 と最初の `---` の間に書いたテキスト … タイトルスライドのサブタイトルに
  なります(省略可)
- `##`(h2)見出しで始まるセクション … 本文スライドになり、その見出しが
  スライドタイトルとして使われます。同時に、全セクションの見出しを集めた
  目次スライドが自動生成され、タイトルスライドの直後に挿入されます
- 独立した `---` 行(区切り線) … 本文スライドの区切りです。コードブロック内の
  `---` や、表の区切り行(`| --- | --- |`)は分割対象になりません

発表者名・日付だけは見出しで表現できないため、ファイル先頭の
YAML フロントマターで指定します(省略可)。

````markdown
---
author: 発表者名
date: 2026-09-30
---

# プレゼンテーションタイトル

サブタイトル

---

## 1枚目のセクション見出し

本文をここに記述します。

- 箇条書き1
- 箇条書き2

![説明](images/sample.png)

---

## 2枚目のセクション見出し

複数の段落やコードブロックも記述できます。

```js
console.log("Hello, presentation!");
```
````

### 画像 (`products/<name>/content/images/`)

同じデッキの `content/images/` に配置し、Markdown からは常に `images/ファイル名` の形式で
参照してください(ビルド時にそのデッキの `dist/images/` へそのままコピーされます)。

## ナビゲーション操作

- `→` / `↓` / `Space` / `PageDown`: 次のスライド
- `←` / `↑` / `PageUp`: 前のスライド
- URL の `#3` のようなハッシュで直接特定スライドを開けます

## PDF 書き出し

```sh
npm run pdf -- <name>    # 指定したデッキを PDF に書き出す(省略時は全デッキ)
```

ビルドしてからヘッドレス Chrome(puppeteer)で開き、`products/<name>/dist/<name>.pdf` に
1 スライド = 1 ページ(1280×720px、16:9)の PDF を出力します。PDF ではスクロールできないため、
本文がスライドからはみ出しているスライドがあると警告を表示します。

ブラウザで `products/<name>/dist/index.html` を開き、印刷ダイアログから「PDFに保存」を
選んでも同じレイアウトで出力できます(「背景のグラフィック」を有効にしてください)。

## ディレクトリ構成

```
products/
  <name>/            … 1デッキ分(複数置ける)
    content/
      slides.md      … スライド本文 (Markdown 1ファイル)
      images/        … 画像素材
    reports/         … /create-slides のレポート
    dist/            … ビルド成果物 (git管理対象外)
src/                 … 全デッキ共通のテンプレート
  style.css          … スライドの見た目 (3パターン共通スタイル)
  deck.js            … スライド送り用スクリプト
build.js             … products/<name>/content/ を products/<name>/dist/ にビルドするスクリプト
scripts/
  products.js        … デッキの一覧・パス解決
  check-slides.js    … 合格基準の自動チェック (npm run check)
  export-pdf.js      … PDF 書き出し (npm run pdf)
```

## Claude Code でスライドを作る(計画 → 作成 → 検証ループ)

Claude Code で `/create-slides <テーマ・目的・対象者・データなど>` を実行すると、
3つのサブエージェントが次のループでスライドを作成します。新規なら
`products/<name>/` を新しく作り、既存デッキの作り直しならそのデッキを対象にします。

1. **計画**(`slide-planner`): テーマ・ストーリー・スライド構成・必要なデータ・
   このラン固有の合格基準を定義
2. **作成**(`slide-creator`): `products/<name>/content/` の `slides.md` と `images/` を作成し、
   `npm run build -- <name>` / `npm run check -- <name>` でセルフチェック
3. **検証**(`slide-verifier`): 固定の合格基準(WCAG 2.2 AA ほか)と計画で定義した
   可変の合格基準で評価。不合格なら指摘を添えて計画からやり直す(最大3周)
4. **振り返り**(`slide-retrospective`): 合格してループが終わったあとに1回だけ実行。
   検証で出た課題のうち計画・作成で防げたものを分析し、ループ設計
   (agents / rules / skills)への対策案を `retrospective.md` に記載(反映はユーザーが判断)

各ステップのレポートは `products/<name>/reports/<YYYYMMDD>-<slug>/iter-<N>/` に、
振り返りレポートはその1つ上の `retrospective.md` に Markdown で残ります。

| 種類 | 場所 |
| --- | --- |
| スキル(ループ制御・レポートのテンプレート) | `.claude/skills/create-slides/` |
| サブエージェント | `.claude/agents/slide-{planner,creator,verifier,retrospective}.md` |
| ワークフローのルール | `.claude/rules/slide-workflow.md` |
| 固定の合格基準 | `.claude/rules/slide-acceptance-criteria.md` |
| スライドの記述ルール | `.claude/rules/slide-authoring.md` |
| 自動チェック | `scripts/check-slides.js`(`npm run check -- <name>`) |

`npm run check -- <name>`(省略時は全デッキ)はビルド済みの `products/<name>/dist/index.html`・
`src/style.css`・そのデッキの SVG 画像を対象に、
コントラスト比、画像の alt、見出し、リンクテキスト、表の見出しセル、1スライドの
分量などを検査します(error があれば終了コード 1)。コントラスト比だけを調べる場合:

```sh
node scripts/check-slides.js contrast '#5b6472' '#ffffff'
```
