# presentation-html-sample

Markdown と画像ファイルでコンテンツを管理する、HTML + CSS 製のプレゼンテーションです。
`content/slides/` の Markdown を `npm run build` でビルドすると、`dist/` に単一の
`index.html`(CSS/JS/画像込み)が生成されます。

## セットアップ

```sh
npm install
```

## ビルド

```sh
npm run build
```

`dist/index.html` を開くと発表できます。ローカルサーバーで確認する場合:

```sh
npm run serve
```

## コンテンツの追加・編集

### スライド (`content/slides/*.md`)

ファイル名の昇順でスライドの順序が決まります(`01-`, `02-`, ... のように連番を推奨)。
各ファイルの先頭に YAML フロントマターで `type` を指定します。

#### 1. タイトルスライド (`type: title`)

```markdown
---
type: title
title: プレゼンテーションタイトル
subtitle: サブタイトル
author: 発表者名
date: 2026-09-30
---
```

#### 2. 目次スライド (`type: toc`)

`type: content` のスライドのタイトルから自動生成されます(手動で本文を書く必要はありません)。
順番を上書きしたい場合のみ `items` を指定してください。

```markdown
---
type: toc
title: 目次
# items:            # 省略時は content スライドのタイトルを自動収集
#   - はじめに
#   - 詳細説明
---
```

#### 3. タイトル + 本文スライド (`type: content`)

本文は通常の Markdown(見出し・箇条書き・コードブロック・画像など)がそのまま使えます。

```markdown
---
type: content
title: セクション見出し
---

本文をここに記述します。

- 箇条書き1
- 箇条書き2

![説明](images/sample.png)
```

### 画像 (`content/images/`)

`content/images/` に配置し、Markdown からは常に `images/ファイル名` の形式で参照してください
(ビルド時に `dist/images/` へそのままコピーされます)。

## ナビゲーション操作

- `→` / `Space` / `PageDown`: 次のスライド
- `←` / `PageUp`: 前のスライド
- 画面右下のボタンでも操作可能
- URL の `#3` のようなハッシュで直接特定スライドを開けます

## PDF 書き出し

`dist/index.html` をブラウザで開き、印刷ダイアログから「PDFに保存」を選択してください。
印刷用 CSS により 1 スライド = 1 ページで出力されます。

## ディレクトリ構成

```
content/
  slides/   … スライド本文 (Markdown)
  images/   … 画像素材
src/
  style.css … スライドの見た目 (3パターン共通スタイル)
  deck.js   … スライド送り用スクリプト
build.js    … content/ を dist/ にビルドするスクリプト
dist/       … ビルド成果物 (git管理対象外)
```
