---
colors:
  primary: "#3ecf8e"
  primaryAlt: "#7bdcf7"
  danger: "#e57373"
  background: "#0f1724"
  surface: "#1b2334"
  surfaceRaised: "#232d42"
  border: "#263147"
  text: "#f6f7fb"
  textMuted: "#c8d0e5"
typography:
  body:
    fontFamily: "Segoe UI, Helvetica Neue, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  paneTitle:
    fontFamily: "Segoe UI, Helvetica Neue, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0
  fieldLabel:
    fontFamily: "Segoe UI, Helvetica Neue, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  compactLabel:
    fontFamily: "Segoe UI, Helvetica Neue, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: 0
spacing:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  xxl: 16px
rounded:
  sm: 10px
  md: 12px
  lg: 14px
  pill: 999px
components:
  popupShell:
    width: 800px
    height: 600px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: 14px
    padding: 16px
  primaryButton:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: 12px
    padding: "10px 14px"
  dangerButton:
    backgroundColor: "{colors.surfaceRaised}"
    textColor: "{colors.danger}"
    rounded: 12px
    padding: "10px 14px"
  input:
    backgroundColor: "{colors.surfaceRaised}"
    textColor: "{colors.text}"
    rounded: 12px
    padding: "10px 12px"
  compactNavigationItem:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.textMuted}"
    width: 34px
    height: 34px
    rounded: 10px
  activeNavigationItem:
    backgroundColor: "{colors.surfaceRaised}"
    textColor: "{colors.primary}"
    rounded: 10px
  sidebarBrand:
    backgroundColor: "{colors.primaryAlt}"
    textColor: "{colors.background}"
    width: 38px
    height: 38px
    rounded: 10px
  divider:
    backgroundColor: "{colors.border}"
---

# DESIGN.md

## Visual Theme & Atmosphere

Browser Toolkit は、Chrome 拡張の小さな作業面として、情報密度を高く保ちながら静かに使える UI にする。雰囲気は「暗い作業台に、必要な状態だけが緑からシアンで浮かぶ」方向を基準にする。

装飾は機能の発見性を助ける範囲に留める。派手な hero、説明カードの多用、余白を広く取りすぎる構成は避け、popup 内の限られた 800x600 の面積を操作に使う。

## Colors

Primary は成功・選択・現在位置・主要 action に使う。Dark theme では `#3ecf8e` から `#7bdcf7` への緑シアン系を使い、背景から明確に浮かせる。Light theme では primary を青寄りにしてもよいが、同じ役割で使う。

Surface は 3 層で扱う。

- Background: popup 全体の奥行き。
- Surface: card、sidebar、drawer の基準面。
- Raised surface: input、select、弱い hover、設定カード内の選択肢。

Border は強い区切りではなく、面の境界を示す細線として使う。危険操作は `danger` を使い、primary と混ぜない。

## Typography

本文は system sans を使う。UI は道具なので、装飾的な display face は使わない。

階層はサイズ差より weight と配置で作る。pane title は 15-18px、field label と hint は 12-13px を基本にする。compact navigation と drawer menu は 12-14px の範囲で、letter spacing は 0 を基準にする。

長い説明文は 48ch 程度を上限にし、カード内で横幅いっぱいに伸ばさない。

Uppercase や広い letter spacing は、短い eyebrow または技術的な micro-label だけに限定する。通常の pane title、button、drawer item、settings label では使わない。

## Layout & Spacing

Popup は 800x600 の固定作業面として扱う。外側 body を伸ばさず、長い pane は `.content-body` 内でスクロールさせる。

右側の navigation rail は 58px を基準にする。主要 pane は compact icon rail に集約し、設定などの補助項目は下部に分離する。rail item は 34px の icon area と 44px 以上の hit area を持つ。

Content body は 14-18px 程度の内側余白を基準にする。設定フォームや管理系 pane では、カード間 gap は 14-16px、カード内 gap は 10-14px を基準にし、情報を過度に分散させない。

Grid は `minmax(0, 1fr)` を使い、長い text・input・select が横 overflow を起こさないようにする。複数選択肢は `repeat(auto-fit, minmax(..., 1fr))` で自然に折り返す。

## Elevation

Elevation は少なく使う。大きい shadow は popup shell、drawer、toast、popover のように前後関係が必要な面に限る。通常の設定カードや pane card は border と subtle background で十分に区切る。

Drawer は右から出る作業メニューとして、scrim と弱い shadow で背景から分離する。drawer 内の item はカード化せず、list row として扱う。

Accent gradient は brand icon、primary button、surface overview のように「入口」または「主要 action」を示す面に限定する。通常 card、list item、settings section の背景には広げない。

## Shapes

通常 UI の radius は 10-14px を使う。カードは 14px、input/button/select は 10-12px、icon rail は 10px を基準にする。Pill は badge や chip のような短い状態表示だけに使う。

角丸を大きくしすぎてカードが浮きすぎる状態は避ける。Popup はツールなので、丸みは手触りを出すための控えめな処理に留める。

## Components

### Buttons

Primary button は green-to-cyan の強い action に使う。保存や実行のような主要 action は primary、補助 action は ghost、削除は danger に分ける。

Button row は狭い popup 内で折り返し可能にする。設定フォーム内の複数 primary action は同じ高さ・同じ列幅で並べ、danger action は右寄せにして誤操作を避ける。

### Inputs And Selects

Input、textarea、select は raised surface 上に置き、border と radius で一貫させる。token/API key のような横長 input は full width を基本にし、右端 icon button は 28px 程度に抑える。

Select popup、popover、tooltip は content より前面に出るが、色と radius は input 系と揃える。

### Settings Cards

Settings card は、overview、provider、token、model、prompt、theme などの意味単位で分ける。カードは濃い面と細い border を使い、shadow は原則使わない。

Provider/theme の選択肢は同じ component family として扱う。選択中は primary tint と indicator で示し、色だけに依存しない。

### Navigation Rail And Drawer

Rail は icon-only を基本にし、tooltip で名称を補う。Active state は淡い primary tint と細い vertical indicator で示す。現在位置を強いカード風にしすぎない。

Drawer は title を持たない compact menu として扱う。上部に close、中央に主要 pane、下部に設定を置く。Drawer item は icon + label の 1 行 row で、active row は primary tint にする。

Navigation の selected state は、色だけではなく indicator、ARIA state、または icon/text emphasis を併用する。

### Overlay And Toast

Content script 上の overlay/toast は popup と同じ token を使う。Shadow DOM 内でも surface、text、accent、radius、shadow の役割を変えない。

## Storybook Reference

Design system の参照 Story は `Design System/Reference` と `Popup/Components/*` を優先して確認する。Reference Story は production UI を置き換えるものではなく、token、state、density、scroll behavior を固定して drift を早期に見つけるための基準面である。

Reference Story には最低限、button、input/select、selection controls、navigation rail/drawer、popup shell、settings card の state matrix を置く。Dark/light/auto theme は Storybook toolbar で確認できる状態を保つ。

## Do's and Don'ts

Do:

- 800x600 の制約を先に考え、重要操作を viewport 内に密に収める。
- 長い pane は内側スクロールにする。
- Shared component の state は hover、focus-visible、active/selected、disabled を揃える。
- Icon-only control には label または tooltip を用意する。
- Storybook reference を UI 変更の前後で確認する。

Don't:

- 設定画面を landing page のような広い hero と説明カードで膨らませない。
- Card inside card を装飾目的で重ねない。
- Active state を色だけで示さない。
- `DESIGN.md` に一時的な画面固有例外や review 手順を書かない。
- 未定義 primitive token や raw color を新しく増やさない。
