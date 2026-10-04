---
author: 発表者名
date: 2026-09-30
---

# プレゼンテーションタイトル

サブタイトルをここに入力

---

## はじめに

このスライドは **タイトル + 本文** パターンのサンプルです。Markdown の記法がそのまま使えます。

- 見出し・段落・箇条書きに対応
- 画像は `images/xxx.png` の形式で参照
- コードブロックや強調も利用可能

![サンプル画像](images/sample.svg)

---

## 詳細説明

複数の段落やコードブロックも記述できます。

```js
console.log("Hello, presentation!");
```

1. `products/<name>/content/slides.md` に `##` 見出しと `---` を使ってスライドを追加
2. 画像は `products/<name>/content/images/` に配置
3. `npm run build -- <name>` を実行すると `products/<name>/dist/` に出力されます

---

## 1つのファイルから複数スライド

`---` だけの行で区切ると、1つの Markdown ファイルから
複数のスライドを作成できます。

| 項目 | 説明 |
| --- | --- |
| 分割 | `---` 単独行 |
| 見出し | 各セクション先頭の `## 見出し` がタイトルと目次になる |

---

## カラーパレット: アクセントカラー(ティールと青)

面のアクセントはティール、文字のアクセントは青にし、ほかはモノトーンにします。

| 名前 | 色 | 用途 | 背景とのコントラスト比 |
| --- | --- | --- | --- |
| アクセント | <span class="swatch" style="background: var(--accent)"></span>`#00B5C8` | 図形・グラフの主系列 | 2.28:1(文字には使わない) |
| アクセント(文字用) | <span class="swatch" style="background: var(--accent-strong)"></span>`#3335E3` | **強調文字**・細線 | 6.98:1 |

<small>コントラスト比の基準(文字 4.5:1、図形 3:1)の出典: WCAG 2.2 日本語訳 [[1]](#ref-1)</small>

---

## カラーパレット: 背景色と文字色(モノトーン)

| 名前 | 色 | 用途 | 背景とのコントラスト比 |
| --- | --- | --- | --- |
| 文字 | <span class="swatch" style="background: var(--ink)"></span>`#222222` | 本文・見出し | 14.59:1 |
| 補足文字 | <span class="swatch" style="background: var(--ink-soft)"></span>`#5C5C5C` | 補足・メタ情報・表の見出し行 | 6.13:1 |
| 背景 | <span class="swatch" style="background: var(--paper)"></span>`#F5F5F5` | スライドの背景(真っ白より少し暗い) | — |
| 面 | <span class="swatch" style="background: var(--surface)"></span>`#EBEBEB` | 表の縞・インラインコード・タイトルの背景 | — |
| 罫線 | <span class="swatch" style="background: var(--line)"></span>`#D6D6D6` | 罫線・区切り線 | — |
| 外側の背景 | <span class="swatch" style="background: var(--stage)"></span>`#111111` | スライドの外側 | — |

---

## 参考文献

1. <span id="ref-1"></span>[Web Content Accessibility Guidelines (WCAG) 2.2 日本語訳(WAIC)](https://waic.jp/translations/WCAG22/)(2026年10月取得)
