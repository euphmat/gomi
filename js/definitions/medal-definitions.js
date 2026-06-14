/**
 * このファイルはメダル鋳造システムで使用するメダルのランク定義をまとめたファイルです。
 * 
 * メダルランク定義ファイル
 * 
 * 各メダルランクの名前、討伐数ボーナス、必要素材数、ゴールド倍率を定義します。
 * killBonus は「通常の+1を除いた追加ボーナス分」です。
 * 例: ブロンズ(killBonus=1) → 討伐時 +1(通常) +1(ボーナス) = 合計+2
 */

export const MEDAL_RANKS = [
  { id: 'bronze',  name: 'ブロンズメダル',     killBonus: 1,   totalKillCount: 2,   materialQty: 100,   goldMultiplier: 1000,    rewardMultiplier: 2.0,   color: '#CD7F32', image: './assets/medal/bronze_medal.webp'  },
  { id: 'silver',  name: 'シルバーメダル',     killBonus: 3,   totalKillCount: 4,   materialQty: 500,   goldMultiplier: 5000,    rewardMultiplier: 4.0,   color: '#C0C0C0', image: './assets/medal/silver_medal.webp'  },
  { id: 'gold',    name: 'ゴールドメダル',     killBonus: 7,   totalKillCount: 8,   materialQty: 1000,  goldMultiplier: 10000,   rewardMultiplier: 8.0,   color: '#FFD700', image: './assets/medal/gold_medal.webp'    },
  { id: 'diamond', name: 'ダイアモンドメダル', killBonus: 15,  totalKillCount: 16,  materialQty: 3000,  goldMultiplier: 50000,   rewardMultiplier: 16.0,  color: '#B9F2FF', image: './assets/medal/diamond_medal.webp' },
  { id: 'saint',   name: 'セイントメダル',     killBonus: 31,  totalKillCount: 32,  materialQty: 5000,  goldMultiplier: 80000,   rewardMultiplier: 32.0,  color: '#FFFACD', image: './assets/medal/saint_medal.webp'   },
  { id: 'black',   name: 'ブラックメダル',     killBonus: 63,  totalKillCount: 64,  materialQty: 10000, goldMultiplier: 100000,  rewardMultiplier: 64.0,  color: '#2D2D2D', image: './assets/medal/black_medal.webp'   },
  { id: 'stela',   name: 'ステラメダル',       killBonus: 127, totalKillCount: 128, materialQty: 50000, goldMultiplier: 1000000, rewardMultiplier: 128.0, color: '#E8E0FF', image: './assets/medal/stela_medal.webp'   },
];

/**
 * メダルランクに応じたCSSフィルターを返す
 * モンスター画像の色変更に使用
 * @param {string} rankId - メダルランクID
 * @returns {string} CSSフィルター文字列
 */
export function getMedalImageFilter(rankId) {
  switch (rankId) {
    case 'bronze':  return 'sepia(1) saturate(1.5) brightness(0.85)';
    case 'silver':  return 'grayscale(1) brightness(1.3) contrast(1.1)';
    case 'gold':    return 'sepia(1) saturate(2.5) brightness(1.2) hue-rotate(10deg)';
    case 'diamond': return 'brightness(1.4) contrast(1.2) saturate(0.5)';
    case 'saint':   return 'brightness(1.6) saturate(0.3) contrast(0.9)';
    case 'black':   return 'brightness(0.2) contrast(1.5)';
    case 'stela':   return 'none';
    default:        return 'none';
  }
}
