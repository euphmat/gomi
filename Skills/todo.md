# バトル info 画面整理 + 新規タブ追加

戦闘画面の Info タブから一部表示を削除し、既存3タブをコンパクト化した上で Pet・Medal の2タブを新設する。Pet タブでは捕獲情報＋餌やり機能、Medal タブではメダル情報＋鋳造/ランクアップ機能を戦闘中に利用可能にする。

## Proposed Changes

### 1. Info タブ情報削除

#### [MODIFY] [battle-ui.js](file:///Users/euphmat/Desktop/gomi/js/pages/battle/battle-ui.js)

`renderInfoTabHtml()` (L387-452) の「4. Capture & Medal Info」セクションを丸ごと削除する。

**削除対象:**
- 討伐数（L406-413）
- 捕獲率（L414-421）
- 伝説出現率（L422-429）
- 伝説捕獲率（L430-437）
- メダル/未取得（L441-451）

これにより、Info タブは「1. Stats/Rewards」「2. Actions | Drops」の2パネル構成になり、Bottom Panel（L511-514）も削除。

---

### 2. タブ UI のコンパクト化 + 新規タブ追加

#### [MODIFY] [index.js](file:///Users/euphmat/Desktop/gomi/js/pages/battle/index.js)

**2a. HTML テンプレート変更** (L704-708)
- 既存3タブ（Skill, Item, Info）のラベルを日本語化済み（スキル, アイテム, インフォ）だが、フォントサイズや padding を縮小してコンパクトに
- 新規タブボタン2個を追加: `#tab-btn-pet`（Pet）, `#tab-btn-medal`（Medal）
- `flex-1` → 固定幅ではなく均等分配を維持しつつ padding/gap を縮小
- `py-2` → `py-1.5`, `text-[11px]` → `text-[10px]`, `gap-1.5` → `gap-1` 等

**2b. 要素参照追加** (L67-70)
```js
tabBtnPet: container.querySelector('#tab-btn-pet'),
tabBtnMedal: container.querySelector('#tab-btn-medal'),
```

**2c. タブクリックハンドラ拡張** (L406-416)
- `pet`, `medal` の2つを配列に追加

**2d. `updateTabStyles()` 拡張** (L542-558)
- tabs 配列に `{ btn: this.elements.tabBtnPet, id: 'pet', icon: 'pets', label: 'Pet' }`, `{ btn: this.elements.tabBtnMedal, id: 'medal', icon: 'military_tech', label: 'Medal' }` を追加
- スタイルのパディングを全体的に縮小（`py-2` → `py-1.5` 等）

**2e. `renderTabContent()` 拡張** (L560-568)
```js
else if (this.currentTab === 'pet') this.renderPetTab();
else if (this.currentTab === 'medal') this.renderMedalTab();
```

**2f. 新メソッド追加:**
- `renderPetTab()` — Pet タブ用（後述の battle-pet-tab.js を呼び出す）
- `renderMedalTab()` — Medal タブ用（後述の battle-medal-tab.js を呼び出す）

**2g. `tab-content` の `rounded-tr-xl` を削除** — 5タブ構成になるため、tab-content の右上丸みが不自然になる。`rounded-b-xl` のみに変更。

---

### 3. Pet タブ（新規ファイル）

#### [NEW] [battle-pet-tab.js](file:///Users/euphmat/Desktop/gomi/js/pages/battle/battle-pet-tab.js)

**概要:** 選択中のモンスターに対して、捕獲/伝説関連の情報表示 ＋ 餌やり機能を提供。

**`renderBattlePetTabHtml(targetEntity, monsterKills, ranchData, currentDungeonId)` を export:**

**パネル構成:**
1. **ヘッダー部**: モンスター名 + 画像（小さめ）
2. **捕獲情報パネル**: 討伐数、捕獲率、伝説出現率、伝説捕獲率を表示（元 Info タブの Capture セクションのレイアウトを流用）
3. **餌やりパネル（条件付き表示）:**
   - `ranchData` を検索して、対象モンスターが仲間になっているか判定
   - 仲間の場合: ranch.js の `showFeedModal()` のインライン版を表示
     - 現在のレベル + EXP バー
     - 各ドロップ素材の一覧（所持数・EXP・スライダー・「与える」ボタン）
     - **餌やり実行時:** `GameDB` でインベントリ消費 → `ranch_data` 更新 → `BattleManager.ranchData` もリロード → タブ再描画
   - 未仲間の場合: 「まだ仲間になっていません」メッセージ

**餌やりロジック:** `ranch.js` の `showFeedModal()` 内のロジック（L669-824）を参考に、モーダルではなくタブ内にインラインで表示する。flying アニメーションは省略し、EXP バーのアニメーション + レベルアップ演出のみ実装。

---

### 4. Medal タブ（新規ファイル）

#### [NEW] [battle-medal-tab.js](file:///Users/euphmat/Desktop/gomi/js/pages/battle/battle-medal-tab.js)

**概要:** 選択中のモンスターに対して、メダル情報表示 ＋ 鋳造/ランクアップ機能を提供。

**`renderBattleMedalTab(targetEntity, playerMedals, currentGold, onUpdate)` を export:**
- DOM 要素を返す（innerHTML ではなく createElement ベース、medal-tab.js と同様のパターン）

**パネル構成:**
1. **メダルビジュアル**: medal-tab.js (L167-216) のメダル表示ロジックを流用。モンスター画像 + メダルフレーム + パーティクル/グロー効果
2. **現在ランク表示**: ランク名バッジ or 「メダル未所持」
3. **鋳造/ランクアップセクション（最大ランク未到達時）:**
   - 必要素材グリッド（素材名・所持数/必要数）— medal-tab.js (L264-316) のレイアウトを流用
   - ゴールドコスト表示
   - 鋳造/ランクアップボタン
   - **ボタン押下時:** 素材消費 → ゴールド消費 → `player_medals` 保存 → `BattleManager.playerMedals` 更新 → `BattleManager.currentGold` 更新 → ヘッダーゴールド表示更新 → 成功演出 → タブ再描画
4. **最大ランク到達時:** 「最高ランク到達」メッセージ（medal-tab.js L374-386 を流用）

**成功演出:** medal-tab.js の `showCraftSuccessAnimation()` をそのまま import して利用。

---

## 変更対象ファイル一覧

| 操作 | ファイル | 主な変更内容 |
|------|----------|-------------|
| MODIFY | [battle-ui.js](file:///Users/euphmat/Desktop/gomi/js/pages/battle/battle-ui.js) | Info タブ Bottom Panel 削除 |
| MODIFY | [index.js](file:///Users/euphmat/Desktop/gomi/js/pages/battle/index.js) | タブ UI コンパクト化、Pet/Medal タブ追加、renderPetTab/renderMedalTab メソッド追加 |
| NEW | [battle-pet-tab.js](file:///Users/euphmat/Desktop/gomi/js/pages/battle/battle-pet-tab.js) | Pet タブの描画ロジック（捕獲情報 + 餌やり） |
| NEW | [battle-medal-tab.js](file:///Users/euphmat/Desktop/gomi/js/pages/battle/battle-medal-tab.js) | Medal タブの描画ロジック（メダル情報 + 鋳造/ランクアップ） |

## Verification Plan

### Manual Verification
- ブラウザで戦闘画面を開き、以下を確認:
  1. 5タブ（Skill, Item, Info, Pet, Medal）が正しく表示され、全てのタブが均等にコンパクトに収まっている
  2. Info タブに討伐数・捕獲率・伝説出現率・伝説捕獲率・未取得が表示されていない
  3. Pet タブで対象モンスターの捕獲情報が正しく表示される
  4. Pet タブで仲間モンスターに対して餌やりが実行できる
  5. Medal タブで対象モンスターのメダル情報が正しく表示される
  6. Medal タブでメダルの鋳造・ランクアップが実行できる
  7. タブ切り替え時のスタイルが正しく適用される
  8. 既存の Skill/Item タブの動作に影響がない
