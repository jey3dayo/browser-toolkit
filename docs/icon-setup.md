---
type: guide
title: アイコン・ロゴセットアップガイド
description: Browser Toolkit の拡張機能アイコンとロゴを作成、更新、検証する手順を説明する。
resource: urn:browser-toolkit:docs:icon-setup
tags:
  - category/assets
  - audience/developer
timestamp: 2026-06-29
audience: developer
owner: browser-toolkit
---

# アイコン・ロゴセットアップガイド

Chrome 拡張機能で使用するアイコンとロゴを作成・更新するための手順書です。

## ディレクトリ構成

```
browser-toolkit/
└── images/            # ロゴ・拡張機能アイコン
    ├── icon16.png     # ツールバー用（16x16）
    ├── icon48.png     # 拡張機能管理画面用（48x48）
    ├── icon128.png    # Chrome ウェブストア用（128x128）
    └── logo.png       # ポップアップヘッダーロゴ（透過 PNG）
```

## ロゴから透過アイコンを作成する手順

### 前提条件

ImageMagick（v7 以降）がインストールされている必要があります。

```bash
# macOS の場合
brew install imagemagick

# バージョン確認
magick -version
```

### 手順 1: 元ロゴの配置

1. 元となるロゴ画像（JPG / PNG）を用意します。
2. プロジェクトルートに配置します（例: `logo-source.jpg`）。

### 手順 2: 白背景を透過処理

```bash
# 白背景を透過にして PNG として保存
magick logo-source.jpg -fuzz 10% -transparent white images/logo.png
```

#### オプションの説明

- `-fuzz 10%`: 白色として扱う許容範囲（0〜100%。値が大きいほど広い範囲を透過します）
- `-transparent white`: 白色を透過に変換します

#### 注意点

- JPEG は透過に対応していないため、出力は必ず PNG 形式にしてください。
- `-fuzz` の適切な値は元画像によって変わります（目安は 5〜15% です）。

### 手順 3: 各サイズのアイコンを生成

```bash
# 16x16 アイコン
magick images/logo.png -fuzz 10% -transparent white -resize 16x16 images/icon16.png

# 48x48 アイコン
magick images/logo.png -fuzz 10% -transparent white -resize 48x48 images/icon48.png

# 128x128 アイコン
magick images/logo.png -fuzz 10% -transparent white -resize 128x128 images/icon128.png
```

### 手順 4: 生成したファイルの確認

```bash
# ファイルサイズと一覧を確認
ls -lh images/icon*.png images/logo.png

# ファイル形式を確認
file images/icon16.png

# ImageMagick で詳細確認（透過チャンネルを含む）
identify images/icon16.png
# 出力例: images/icon16.png PNG 16x16 16x16+0+0 8-bit sRGB 3329B
```

#### 確認ポイント

- ファイル形式が PNG であること
- 透過（RGBA）が含まれていること
- ファイルサイズが妥当であること（目安: 16x16 は 1〜5KB、48x48 は 5〜10KB、128x128 は 15〜30KB）

## アイコン更新フロー

既存のアイコンを差し替えるときは、次の手順で更新します。

```bash
# バックアップを作成（推奨）
cp -r images/ images_backup/

# 新しいロゴから再生成
magick new-logo.jpg -fuzz 10% -transparent white images/logo.png
magick images/logo.png -resize 16x16 images/icon16.png
magick images/logo.png -resize 48x48 images/icon48.png
magick images/logo.png -resize 128x128 images/icon128.png

# Chrome の chrome://extensions/ で「更新」ボタンをクリックして反映を確認
```

## トラブルシューティング

### 透過がうまくいかない

`-fuzz` の値が合っていないか、背景色が純白（`#FFFFFF`）ではない可能性があります。

```bash
# fuzz 値を広げる（10% → 15%）
magick logo.jpg -fuzz 15% -transparent white output.png

# 特定の RGB 値を指定する
magick logo.jpg -fuzz 10% -transparent '#FFFFFF' output.png

# 背景色が薄いグレーの場合
magick logo.jpg -fuzz 10% -transparent '#F0F0F0' output.png
```

### アイコンがぼやける

縮小時のリサイズフィルターを調整すると輪郭がはっきりします。

```bash
# ランチョス法でシャープにリサイズ
magick images/logo.png -filter Lanczos -resize 16x16 images/icon16.png

# アンシャープマスクを併用してさらに輪郭を強調
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
| ツールバーアイコン | 16x16 | PNG | 必須 | Retina ディスプレイ向けに 32x32 の用意も推奨 |
| 拡張機能管理画面 | 48x48 | PNG | 必須 | - |
| Chrome ウェブストア | 128x128 | PNG | 必須 | ストア掲載時に使用 |
| ポップアップロゴ | 任意 | PNG | 推奨 | 横長を推奨（例: 432x66） |

## 参考リンク

- [Chrome 拡張機能のアイコンガイドライン](https://developer.chrome.com/docs/extensions/mv3/manifest/icons/)
- [ImageMagick 公式ドキュメント](https://imagemagick.org/script/command-line-processing.php/)
- [透過処理のベストプラクティス](https://usage.imagemagick.org/masking/)

## 更新履歴

- 2024-12-11: 初版作成（ImageMagick を使った透過アイコン生成手順、`logo.jpg` 1024x1024 からの各サイズ生成手順を記録）
