# サマリー: 青森、説明のいらない3日間

- 対象スライド: `products/aomori-trip-plan/`(新規)
- ラン ID: 20261003-aomori-trip-plan
- 最終判定: **合格**(2周)

## 周回ごとの結果

| 周回 | 判定 | 主な指摘 | レポート |
| --- | --- | --- | --- |
| iter-1 | 不合格 | R-1: #2 のルート図がテンプレートの画像高さ上限(35vh)で約0.42倍に縮小され、図内文字が実効 8〜10px で判読不能(V-2 不合格) | [3-verify.md](iter-1/3-verify.md) |
| iter-2 | 合格 | 指摘 0 件。ルート図を viewBox 1050×252・文字 18px 以上で作り直し、等倍表示で解消 | [3-verify.md](iter-2/3-verify.md) |

## 振り返り

- レポート: [retrospective.md](retrospective.md)
- 課題 9 件のうち、計画・作成で防げたもの 7 件
- 優先度「高」の対策案(未反映、ユーザー判断待ち)
  - K-1: 図の計画時に「SVG の font-size × 表示倍率 ≥ 16px」を必須化(表示倍率 = min(1, 1100/viewBox幅, 252/viewBox高さ))。`slide-authoring.md`・`slide-planner.md`・計画テンプレートに反映
  - K-2: 作成エージェントのセルフチェックに 1280×720 の実表示確認(画像倍率の実測、見出し・表セルの折り返し確認)を追加。`slide-creator.md`・作成テンプレートに反映

## 成果物

- 本文: `products/aomori-trip-plan/content/slides.md`
- 画像: `products/aomori-trip-plan/content/images/route-overview.svg`(3日間のルート模式図)
- スライド枚数: 19枚(タイトル1、目次1、セクション扉5、本文12)
- PDF: `products/aomori-trip-plan/dist/aomori-trip-plan.pdf`

## 仮定(ブリーフの未確定事項)

- 日程: 2026年10月31日(土)〜11月2日(月)(日曜の館鼻岸壁朝市に合わせる)
- 移動: 東京⇄八戸・新青森は新幹線、2日目昼〜3日目はレンタカー(新青森で貸出・返却)
- スライド上では「想定」「候補」と明示済み

## 残っている推奨事項

- #10 の表で一部セルが折り返している
- #2 の出典行が2行に折り返している
- `route-overview.svg` に `<title>` がない
