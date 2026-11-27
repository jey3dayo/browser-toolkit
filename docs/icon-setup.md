---
type: guide
title: アイコン・ロゴセットアップガイド
description: Browser Toolkit の拡張機能アイコンと元画像を作成、更新、検証する手順を説明する。
resource: urn:browser-toolkit:docs:icon-setup
tags:
  - category/assets
  - audience/developer
timestamp: 2026-11-27
audience: developer
owner: browser-toolkit
---

# アイコン・ロゴセットアップガイド

Chrome 拡張機能で使用するアイコン画像を作成・差し替えするための手順書です。

## ディレクトリ構成

```
browser-toolkit/
└── images/            # 拡張機能アイコンと元画像
    ├── icon16.png     # ツールバー用（16x16、manifest.json 参照）
    ├── icon48.png     # 拡張機能管理画面・ポップアップサイドバー用（48x48）
    ├── icon128.png    # Chrome Web Store 用（128x128）
    ├── logo.png       # 各サイズ生成のベースとなる透過済み PNG
    ├── icon.svg       # ベクター素材（参考）
    └── original.png   # 加工前の元画像（参考）
```

拡張機能のパッケージ（`scripts/package-cws.mjs`）に同梱されるのは `icon16.png`、`icon48.png`、`icon128.png` の 3 ファイルです。ポップアップおよびオプションページのサイドバーブランド表示にも `images/icon48.png` を使っています。

## ロゴから透過アイコンを作成する手順

### 前提条件

ImageMagick（v7 以降）をインストールしておきます。

```bash
# macOS の場合
brew install imagemagick

# バージョン確認
magick -version
```

### 手順 1: 元画像の配置

元となる画像（JPG / PNG）を用意し、作業用の場所またはプロジェクトルートに置きます（例: `logo-source.jpg`）。作業後に不要な元画像は削除してください。

### 手順 2: 白背景を透過処理

```bash
# 白背景を透過にしてベース PNG を作成
magick logo-source.jpg -fuzz 10% -transparent white images/logo.png
```

- `-fuzz 10%`: 白色として扱う許容範囲（0〜100%、目安は 5〜15%）
- `-transparent white`: 白色を透過に変換
- JPEG は透過に対応していないため、出力は必ず PNG 形式にします

### 手順 3: 各サイズのアイコンを生成

```bash
magick images/logo.png -resize 16x16 images/icon16.png
magick images/logo.png -resize 48x48 images/icon48.png
magick images/logo.png -resize 128x128 images/icon128.png
```

### 手順 4: 生成したファイルの確認

```bash
# ファイルサイズと一覧を確認
ls -lh images/icon*.png images/logo.png

# ファイル形式を確認
file images/icon16.png

# ImageMagick で詳細確認（透過チャンネルを含む）
identify images/icon16.png
# 出力例: images/icon16.png PNG 16x16 16x16+0+0 8-bit sRGB 782B
```

確認ポイント:

- ファイル形式が PNG で、透過（RGBA）が含まれていること
- Chrome の `chrome://extensions/` で拡張機能を更新し、ツールバー（ダーク・ライト両テーマ）やポップアップのサイドバーで背景が透過されていること

## アイコン更新フロー

既存のアイコンを差し替えるときは、元画像から再生成してリロードで見た目を確認します。

```bash
# 新しいロゴからベース透過 PNG と各サイズを再生成
magick new-logo.jpg -fuzz 10% -transparent white images/logo.png
magick images/logo.png -resize 16x16 images/icon16.png
magick images/logo.png -resize 48x48 images/icon48.png
magick images/logo.png -resize 128x128 images/icon128.png
```

## トラブルシューティング

### 透過がうまくいかない

`-fuzz` の値が合っていないか、背景色が純白（`#FFFFFF`）ではない可能性があります。

```bash
# fuzz 値を広げる（10% → 15%）
magick logo.jpg -fuzz 15% -transparent white output.png

# 特定の背景色を指定する
magick logo.jpg -fuzz 10% -transparent '#FFFFFF' output.png
magick logo.jpg -fuzz 10% -transparent '#F0F0F0' output.png
```

### アイコンがぼやける

縮小時のリサイズフィルターを調整すると輪郭がはっきりします。

```bash
# ランチョス法でシャープにリサイズ
magick images/logo.png -filter Lanczos -resize 16x16 images/icon16.png

# アンシャープマスクを併用して輪郭を強調
magick images/logo.png -resize 16x16 -unsharp 0x1 images/icon16.png
```

### ファイルサイズが大きすぎる

PNG の圧縮設定を上げるか、`optipng` で最適化します。

```bash
# 高圧縮で保存
magick images/logo.png -quality 95 -define png:compression-level=9 images/icon16.png

# 既存ファイルを最適化
optipng -o7 images/icon*.png
```

## 推奨サイズとフォーマット

| 用途 | サイズ | フォーマット | 透過 | 備考 |
| --- | --- | --- | --- | --- |
| ツールバーアイコン | 16x16 | PNG | 必須 | - |
| 拡張機能管理画面・サイドバー | 48x48 | PNG | 必須 | ポップアップのサイドバーでも使用 |
| Chrome Web Store | 128x128 | PNG | 必須 | ストア掲載時に使用 |

## 参考リンク

- [Chrome 拡張機能のアイコンガイドライン](https://developer.chrome.com/docs/extensions/mv3/manifest/icons/)
- [ImageMagick 公式ドキュメント](https://imagemagick.org/script/command-line-processing.php/)
- [透過処理のベストプラクティス](https://usage.imagemagick.org/masking/)
