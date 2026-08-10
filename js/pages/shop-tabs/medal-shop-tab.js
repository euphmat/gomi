import { GameDB } from '../../data/database.js';
import { formatNumber } from '../../utils/format.js';
import {
  MEDAL_SHOP_DUNGEON_REWARDS,
  calculateMedalPoints,
  getMedalPointRows,
} from '../../definitions/medal-shop-definitions.js';
import {
  createMedalEquipmentScalingContext,
  scaleMedalShopEquipment,
} from '../../utils/medal-equipment-scaling.js';

const TYPE_META = {
  accessory: { label: 'アクセサリ', icon: 'diamond', color: 'text-fuchsia-300', border: 'border-fuchsia-400/25' },
  armor: { label: '防具', icon: 'shield', color: 'text-sky-300', border: 'border-sky-400/25' },
  weapon: { label: '武器', icon: 'swords', color: 'text-rose-300', border: 'border-rose-400/25' },
};

function statSummary(stats = {}) {
  const labels = { hp: 'HP', mp: 'MP', atk: 'ATK', def: 'DEF', matk: 'MAT', mdef: 'MDF', spd: 'SPD' };
  return Object.entries(stats)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => `${labels[key] || key.toUpperCase()} +${formatNumber(value)}`)
    .join(' / ');
}

function createEquipmentInstance(reward) {
  return {
    id: `${reward.id}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    baseId: reward.id,
  };
}

export async function renderMedalShopTab() {
  const container = document.createElement('div');
  container.className = 'flex h-full min-h-0 flex-col bg-[#0b0b19] text-slate-100';
  container.innerHTML = '<div class="flex h-full items-center justify-center text-xs font-bold text-slate-500">メダルポイントを集計中...</div>';

  const [
    playerMedalsValue,
    claimedValue,
    ownedEquipment,
    completedDungeons,
    completedDungeonFloors,
    unlockedDungeons,
    currentDungeonId,
    currentFloor,
  ] = await Promise.all([
    GameDB.getGameState('player_medals'),
    GameDB.getGameState('medal_shop_claimed_rewards'),
    GameDB.getAllEquipment(),
    GameDB.getGameState('completed_dungeons'),
    GameDB.getGameState('completed_dungeon_floors'),
    GameDB.getGameState('unlockedDungeons'),
    GameDB.getGameState('currentDungeon'),
    GameDB.getGameState('currentFloor'),
  ]);
  const playerMedals = playerMedalsValue || {};
  const points = calculateMedalPoints(playerMedals);
  const storedClaimedCount = Array.isArray(claimedValue) ? new Set(claimedValue).size : 0;
  const claimed = new Set(Array.isArray(claimedValue) ? claimedValue : []);
  const ownedBaseIds = new Set((ownedEquipment || []).map(item => item.baseId || item.id));
  MEDAL_SHOP_DUNGEON_REWARDS.flatMap(dungeon => dungeon.rewards).forEach(reward => {
    if (ownedBaseIds.has(reward.id)) claimed.add(reward.id);
  });
  if (claimed.size > storedClaimedCount) {
    await GameDB.setGameState('medal_shop_claimed_rewards', [...claimed]);
  }
  const rankRows = getMedalPointRows();
  const medalCounts = rankRows.map((rank, index) => ({
    ...rank,
    count: Object.values(playerMedals).filter(rankIndex => Number(rankIndex) === index).length,
  }));
  const scalingContext = createMedalEquipmentScalingContext({
    playerMedals,
    completedDungeons,
    completedDungeonFloors,
    unlockedDungeons,
    currentDungeonId,
    currentFloor,
  });
  let claiming = false;

  const allRewards = MEDAL_SHOP_DUNGEON_REWARDS.flatMap(dungeon => dungeon.rewards);
  const nextReward = allRewards
    .filter(reward => !claimed.has(reward.id) && reward.points > points)
    .sort((a, b) => a.points - b.points)[0];
  const nextTarget = nextReward?.points || MEDAL_SHOP_DUNGEON_REWARDS.at(-1)?.maxPoints || points;
  const progress = nextReward ? Math.min(100, points / nextTarget * 100) : 100;

  const render = () => {
    const acquiredCount = allRewards.filter(reward => claimed.has(reward.id)).length;
    container.innerHTML = `
      <header class="shrink-0 border-b border-amber-300/15 bg-gradient-to-br from-amber-950/70 via-slate-950 to-violet-950/55 px-3 py-3 shadow-lg">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl text-amber-300" style="font-variation-settings:'FILL' 1">workspace_premium</span>
              <div>
                <h2 class="text-sm font-black tracking-wide text-white">メダルショップ</h2>
                <p class="text-[9px] font-bold text-amber-100/55">ポイントは消費されない累積達成報酬です</p>
              </div>
            </div>
          </div>
          <div class="shrink-0 rounded-xl border border-amber-300/30 bg-black/35 px-3 py-2 text-right shadow-[0_0_18px_rgba(251,191,36,.12)]">
            <div class="text-[8px] font-black tracking-widest text-amber-200/65">MEDAL POINT</div>
            <div class="text-xl font-black tabular-nums text-amber-300">${formatNumber(points)}<span class="ml-1 text-[10px]">P</span></div>
            <div class="mt-0.5 text-[8px] font-bold text-cyan-200/65">ダンジョン進捗 ${scalingContext.progressPercent.toFixed(1)}%</div>
          </div>
        </div>
        <div class="mt-2.5 flex items-center gap-2">
          <div class="h-2 flex-1 overflow-hidden rounded-full border border-white/5 bg-black/50">
            <div class="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-300 to-fuchsia-300 transition-all" style="width:${progress}%"></div>
          </div>
          <span class="w-24 text-right text-[9px] font-bold text-slate-400">${nextReward ? `次まで ${formatNumber(Math.max(0, nextTarget - points))}P` : '全報酬解放可能'}</span>
        </div>
        <details class="mt-2 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5">
          <summary class="cursor-pointer text-[9px] font-bold text-slate-400">ポイント内訳・所持メダル ${Object.keys(playerMedals).length}枚</summary>
          <div class="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
            ${medalCounts.map(rank => `<div class="flex items-center justify-between rounded border border-white/5 bg-slate-950/55 px-2 py-1 text-[9px]"><span style="color:${rank.color}">${rank.name.replace('メダル', '')}</span><span class="font-black tabular-nums text-white">${rank.count} × ${rank.points}P</span></div>`).join('')}
          </div>
        </details>
      </header>

      <div class="flex-1 min-h-0 overflow-y-auto p-3">
        <div class="mb-2 flex items-center justify-between text-[9px] font-bold text-slate-500">
          <span>ダンジョン別コレクション</span><span>${acquiredCount} / ${allRewards.length} 獲得済み</span>
        </div>
        <div class="flex flex-col gap-3 pb-4">
          ${MEDAL_SHOP_DUNGEON_REWARDS.map(dungeon => `
            <section class="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/95 to-slate-950/95 shadow-lg">
              <div class="flex items-center justify-between border-b border-white/5 bg-white/[.025] px-3 py-2">
                <div class="flex min-w-0 items-center gap-2">
                  <span class="material-symbols-outlined text-[17px] text-amber-300">castle</span>
                  <h3 class="truncate text-[11px] font-black text-slate-100">${dungeon.dungeonName}</h3>
                </div>
                <span class="shrink-0 text-[9px] font-bold text-slate-500">武器到達 ${dungeon.maxPoints}P</span>
              </div>
              <div class="grid grid-cols-3 gap-1.5 p-2">
                ${dungeon.rewards.map(reward => {
                  const meta = TYPE_META[reward.type];
                  const scaledReward = scaleMedalShopEquipment(reward, scalingContext);
                  const isClaimed = claimed.has(reward.id);
                  const canClaim = points >= reward.points && !isClaimed;
                  const missing = Math.max(0, reward.points - points);
                  return `<article class="flex min-w-0 flex-col rounded-xl border ${isClaimed ? 'border-emerald-400/25 bg-emerald-950/15' : canClaim ? 'border-amber-300/40 bg-amber-950/20 shadow-[0_0_14px_rgba(251,191,36,.08)]' : 'border-slate-700/55 bg-black/20'} p-2">
                    <div class="flex items-center justify-between gap-1">
                      <span class="material-symbols-outlined ${meta.color}" style="font-size:18px">${meta.icon}</span>
                      <span class="rounded-full border ${meta.border} bg-black/30 px-1.5 py-0.5 text-[7px] font-black ${meta.color}">${meta.label}</span>
                    </div>
                    <h4 class="mt-1.5 min-h-[2.3em] break-words text-[9px] font-black leading-tight text-white">${reward.name}</h4>
                    <p class="mt-1 text-[7px] font-bold leading-snug text-cyan-100/70">${statSummary(scaledReward.stats)}</p>
                    <p class="mt-1 text-[7px] font-black text-amber-300/75">現在の成長倍率 ×${scaledReward.medalScaling.totalMultiplier.toFixed(2)}</p>
                    <p class="mt-1.5 flex-1 text-[8px] leading-snug text-slate-400">${reward.specialEffect.description}</p>
                    <button type="button" data-medal-reward-id="${reward.id}" ${canClaim ? '' : 'disabled'} class="mt-2 min-h-8 rounded-lg border px-1 py-1 text-[9px] font-black transition-all ${isClaimed ? 'border-emerald-500/20 bg-emerald-950/40 text-emerald-400' : canClaim ? 'border-amber-300/35 bg-gradient-to-r from-amber-600 to-yellow-500 text-white active:scale-95' : 'border-slate-700/40 bg-slate-900/70 text-slate-600'}">
                      ${isClaimed ? '獲得済み' : canClaim ? `${reward.points}Pで受け取る` : `${reward.points}P（あと${missing}）`}
                    </button>
                  </article>`;
                }).join('')}
              </div>
            </section>`).join('')}
        </div>
      </div>`;

    container.querySelectorAll('[data-medal-reward-id]').forEach(button => {
      button.addEventListener('click', async () => {
        if (claiming || button.disabled) return;
        const rewardId = button.dataset.medalRewardId;
        const reward = allRewards.find(item => item.id === rewardId);
        if (!reward || claimed.has(rewardId) || points < reward.points) return;
        claiming = true;
        button.disabled = true;
        button.textContent = '受け取り中...';
        const instance = createEquipmentInstance(reward);
        try {
          await GameDB.putEquipment(instance);
          claimed.add(rewardId);
          await GameDB.setGameState('medal_shop_claimed_rewards', [...claimed]);
          window.dispatchEvent(new CustomEvent('quest:equipment-craft', { detail: { itemId: reward.id, count: 1 } }));
          render();
        } catch (error) {
          console.error('[MedalShop] Reward claim failed.', error);
          claimed.delete(rewardId);
          try { await GameDB.deleteEquipment(instance.id); } catch (_) { /* best-effort rollback */ }
          button.disabled = false;
          button.textContent = '受け取りに失敗';
        } finally {
          claiming = false;
        }
      });
    });
  };

  render();
  return container;
}
