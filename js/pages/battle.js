import { GameDB } from '../data/database.js';
import { MONSTERS } from '../definitions/monsters.js';
import { calcFinalStats, buildEquipmentMap } from '../data/stat-calculator.js';

class BattleManager {
  constructor(container) {
    this.container = container;
    this.party = [];
    this.enemies = [];
    
    this.activeCharacter = null;
    this.atbLoop = null;
    
    this.elements = {
      enemyArea: container.querySelector('#enemy-area'),
      partyArea: container.querySelector('#party-area'),
      commandBlocker: container.querySelector('#command-blocker'),
      btnAttack: container.querySelector('#btn-attack'),
      btnRun: container.querySelector('#btn-run'),
      resultOverlay: container.querySelector('#battle-result'),
      resultTitle: container.querySelector('#result-title'),
      resultText: container.querySelector('#result-text'),
      btnResultOk: container.querySelector('#btn-result-ok')
    };
    
    this.selectedEnemyTarget = null;
  }
  
  async init() {
    const rawParty = await GameDB.getAllCharacters();
    const rawEquip = await GameDB.getAllEquipment();
    const equipMap = buildEquipmentMap(rawEquip);

    this.party = rawParty.map((char, index) => {
      const stats = calcFinalStats(char, equipMap);
      return {
        ...char,
        stats,
        atb: 0,
        index,
        isDead: char.hp.current <= 0,
        elementId: `party-${index}`
      };
    });

    const slimeDef = MONSTERS.find(m => m.id === 'slime');
    this.enemies = [1, 2].map(i => ({
      ...slimeDef,
      uniqueId: `enemy-${i}`,
      currentHp: slimeDef.stats.hp,
      maxHp: slimeDef.stats.hp,
      atb: 0,
      isDead: false,
      elementId: `enemy-${i}`
    }));

    this.renderEntities();
    this.setupListeners();
    this.startAtbLoop();
  }

  renderEntities() {
    this.elements.enemyArea.innerHTML = this.enemies.map(e => `
      <div id="${e.elementId}" class="enemy-card relative flex flex-col items-center gap-1 ${e.isDead ? 'opacity-30 grayscale' : 'cursor-pointer hover:scale-105 transition-transform'}" data-id="${e.uniqueId}">
        <div class="relative w-16 h-16 bg-gray-800 rounded-lg border-2 ${this.selectedEnemyTarget === e ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'border-gray-700'} overflow-hidden">
          <img src="${e.image}" class="w-full h-full object-contain p-1 drop-shadow-md">
        </div>
        <div class="w-16 bg-gray-900 h-2 rounded overflow-hidden shadow-inner">
          <div class="bg-red-500 h-full transition-all duration-300" style="width: ${(e.currentHp / e.maxHp) * 100}%"></div>
        </div>
        <div class="w-16 bg-gray-900 h-1 rounded overflow-hidden mt-0.5 shadow-inner">
          <div id="${e.elementId}-atb" class="bg-orange-500 h-full" style="width: ${e.atb / 10}%"></div>
        </div>
      </div>
    `).join('');

    this.elements.partyArea.innerHTML = this.party.map(p => `
      <div id="${p.elementId}" class="relative flex flex-col bg-gray-800/80 rounded border ${this.activeCharacter === p ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'border-gray-700'} p-1.5 ${p.isDead ? 'opacity-40 grayscale' : 'transition-all'}">
        <div class="flex flex-col items-center mb-1.5">
          <div class="w-12 h-12 rounded-full border border-gray-600 mb-1 overflow-hidden shadow-md" style="background: linear-gradient(135deg, ${p.iconGradient[0]}, ${p.iconGradient[1]})">
            <img src="${p.iconImage}" class="w-full h-full object-cover">
          </div>
          <span class="text-[10px] font-bold text-gray-200 truncate w-full text-center drop-shadow">${p.name}</span>
        </div>
        
        <div class="flex flex-col gap-1 mb-1.5">
          <div class="flex items-center gap-1"><span class="text-[9px] font-bold text-red-400 w-4 shadow-sm">HP</span><div class="flex-1 h-2 bg-gray-900 rounded overflow-hidden shadow-inner"><div class="bg-red-500 h-full transition-all duration-300" style="width: ${(p.hp.current / p.hp.max) * 100}%"></div></div></div>
          <div class="flex items-center gap-1"><span class="text-[9px] font-bold text-blue-400 w-4 shadow-sm">MP</span><div class="flex-1 h-2 bg-gray-900 rounded overflow-hidden shadow-inner"><div class="bg-blue-500 h-full transition-all duration-300" style="width: ${(p.mp.current / p.mp.max) * 100}%"></div></div></div>
        </div>
        
        <div class="w-full h-1.5 bg-gray-900 rounded overflow-hidden mb-1.5 shadow-inner">
          <div id="${p.elementId}-atb" class="bg-yellow-400 h-full" style="width: ${p.atb / 10}%"></div>
        </div>

        <div class="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[9px] text-gray-400">
          <div class="flex justify-between"><span>ATK</span><span class="text-gray-200">${p.stats.atk}</span></div>
          <div class="flex justify-between"><span>DEF</span><span class="text-gray-200">${p.stats.def}</span></div>
          <div class="flex justify-between"><span>MAT</span><span class="text-gray-200">${p.stats.matk}</span></div>
          <div class="flex justify-between"><span>MDF</span><span class="text-gray-200">${p.stats.mdef}</span></div>
          <div class="col-span-2 flex justify-center gap-1 text-gray-500 mt-0.5"><span>SPD ${p.stats.spd}</span></div>
        </div>
      </div>
    `).join('');

    if (this.activeCharacter) {
      this.elements.commandBlocker.classList.add('hidden');
    } else {
      this.elements.commandBlocker.classList.remove('hidden');
    }

    this.elements.enemyArea.querySelectorAll('.enemy-card').forEach(el => {
      el.addEventListener('click', (e) => {
        const uniqueId = e.currentTarget.dataset.id;
        const enemy = this.enemies.find(en => en.uniqueId === uniqueId);
        if (enemy && !enemy.isDead) {
          this.selectedEnemyTarget = enemy;
          this.renderEntities();
        }
      });
    });
  }
  
  setupListeners() {
    this.elements.btnRun.addEventListener('click', () => {
      if (!this.activeCharacter) return;
      this.endBattle(false, '逃げ出した！');
    });

    this.elements.btnAttack.addEventListener('click', () => {
      if (!this.activeCharacter) return;
      
      if (!this.selectedEnemyTarget || this.selectedEnemyTarget.isDead) {
        this.selectedEnemyTarget = this.enemies.find(e => !e.isDead);
      }
      
      if (!this.selectedEnemyTarget) return;

      this.executeAttack(this.activeCharacter, this.selectedEnemyTarget, true);
    });

    this.elements.btnResultOk.addEventListener('click', () => {
      window.location.hash = '/dungeon';
    });
  }

  startAtbLoop() {
    this.atbLoop = setInterval(() => {
      if (this.activeCharacter) return;
      
      let nextActor = null;
      
      this.party.forEach(p => {
        if (p.isDead) return;
        p.atb += p.stats.spd * 1.5;
        if (p.atb >= 1000) {
          p.atb = 1000;
          if (!nextActor) nextActor = { type: 'party', entity: p };
        }
        
        const atbEl = this.container.querySelector(`#${p.elementId}-atb`);
        if(atbEl) atbEl.style.width = `${p.atb / 10}%`;
      });
      
      this.enemies.forEach(e => {
        if (e.isDead) return;
        e.atb += e.stats.spd * 1.5;
        if (e.atb >= 1000) {
          e.atb = 1000;
          if (!nextActor) nextActor = { type: 'enemy', entity: e };
        }

        const atbEl = this.container.querySelector(`#${e.elementId}-atb`);
        if(atbEl) atbEl.style.width = `${e.atb / 10}%`;
      });

      if (nextActor) {
        if (nextActor.type === 'party') {
          this.activeCharacter = nextActor.entity;
          this.renderEntities();
        } else {
          this.executeEnemyTurn(nextActor.entity);
        }
      }
    }, 50);
  }

  executeAttack(attacker, defender, isParty) {
    let damage = Math.max(1, attacker.stats.atk - Math.floor(defender.stats.def / 2));
    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
    
    this.showDamage(defender.elementId, damage);

    if (isParty) {
      defender.currentHp -= damage;
      if (defender.currentHp <= 0) {
        defender.currentHp = 0;
        defender.isDead = true;
      }
      attacker.atb = 0;
      this.activeCharacter = null;
    } else {
      defender.hp.current -= damage;
      if (defender.hp.current <= 0) {
        defender.hp.current = 0;
        defender.isDead = true;
      }
      attacker.atb = 0;
    }

    this.renderEntities();
    this.checkBattleEnd();
  }

  executeEnemyTurn(enemy) {
    const aliveParty = this.party.filter(p => !p.isDead);
    if (aliveParty.length === 0) return;
    
    const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
    this.executeAttack(enemy, target, false);
  }

  showDamage(elementId, damage) {
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    el.classList.add('animate-[shake_0.4s_ease-in-out]');
    setTimeout(() => el.classList.remove('animate-[shake_0.4s_ease-in-out]'), 400);

    const dmgText = document.createElement('div');
    dmgText.textContent = damage;
    dmgText.className = 'absolute top-0 left-1/2 -translate-x-1/2 text-white font-black text-2xl z-30 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none animate-[slide-up_0.6s_ease-out_forwards] text-red-500';
    el.appendChild(dmgText);
    setTimeout(() => dmgText.remove(), 600);
  }

  checkBattleEnd() {
    const allEnemiesDead = this.enemies.every(e => e.isDead);
    if (allEnemiesDead) {
      this.endBattle(true, '勝利！');
      return;
    }
    
    const allPartyDead = this.party.every(p => p.isDead);
    if (allPartyDead) {
      this.endBattle(false, '全滅した...');
      return;
    }
  }

  endBattle(isWin, text) {
    clearInterval(this.atbLoop);
    this.activeCharacter = null;
    
    this.savePartyState();

    this.elements.resultTitle.textContent = isWin ? 'VICTORY' : 'DEFEAT';
    this.elements.resultTitle.className = isWin 
      ? 'text-5xl font-black mb-4 tracking-widest text-yellow-400 drop-shadow-lg' 
      : 'text-5xl font-black mb-4 tracking-widest text-red-500 drop-shadow-lg';
    
    let resultText = text;
    if (isWin) {
      const exp = this.enemies.reduce((acc, e) => acc + e.rewards.exp, 0);
      const gold = this.enemies.reduce((acc, e) => acc + e.rewards.gold, 0);
      resultText = `${exp} EXP と ${gold} Gold を獲得した！`;
      
      this.addRewards(gold);
    }
    
    this.elements.resultText.textContent = resultText;
    this.elements.resultOverlay.classList.remove('hidden');
  }

  async addRewards(gold) {
    const currentGold = await GameDB.getGameState('gold') || 0;
    await GameDB.setGameState('gold', currentGold + gold);
  }

  async savePartyState() {
    for (const p of this.party) {
      const original = await GameDB.getCharacter(p.id);
      if (original) {
        original.hp = p.hp;
        original.mp = p.mp;
        await GameDB.putCharacter(original);
      }
    }
  }
}

export function renderBattlePage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19] relative z-20 text-white font-sans overflow-hidden';
  
  // Basic structure
  container.innerHTML = `
    <style>
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        75% { transform: translateX(4px); }
      }
    </style>

    <!-- Scrollable Battle Area (Enemies, Party, Tabs) -->
    <div class="flex-1 flex flex-col overflow-y-auto" style="background: radial-gradient(circle at top, #1a202c 0%, #0b0b19 100%);">
      
      <!-- Enemy Area (Moved higher) -->
      <div id="enemy-area" class="flex justify-center items-start gap-6 min-h-[120px] mt-1 px-2 pt-1">
        <!-- Enemies will be injected here -->
      </div>

      <!-- Party Area -->
      <div id="party-area" class="grid grid-cols-4 gap-2 px-2 mt-4">
        <!-- Party will be injected here -->
      </div>
      
      <!-- Tabs & Tab Content Area -->
      <div class="flex flex-col flex-1 mt-4 px-2 mb-4">
        <!-- Tabs -->
        <div class="flex gap-2">
          <button class="flex-1 py-1.5 bg-green-700 text-white rounded-t-lg text-[11px] font-bold shadow-md">スキル</button>
          <button class="flex-1 py-1.5 bg-gray-800 border-t border-x border-gray-700 text-gray-400 rounded-t-lg text-[11px] font-bold">バックパック</button>
          <button class="flex-1 py-1.5 bg-gray-800 border-t border-x border-gray-700 text-gray-400 rounded-t-lg text-[11px] font-bold">インフォ</button>
        </div>
        <!-- Tab Content -->
        <div class="flex-1 bg-gray-800/40 border border-gray-700 rounded-b-lg rounded-tr-lg p-2 min-h-[120px]">
          <!-- Example content to fill space -->
          <div class="text-xs text-gray-500 flex items-center justify-center h-full">
            （コマンドタブのコンテンツエリア）
          </div>
        </div>
      </div>
      
    </div>

    <!-- Command Area (Fixed at bottom of main, above footer) -->
    <div id="command-area" class="bg-gray-900 border-t border-gray-700 p-2 flex gap-2 shrink-0 h-[72px] relative shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
      <!-- Overlay block when no active character -->
      <div id="command-blocker" class="absolute inset-0 bg-gray-900/70 z-10 flex items-center justify-center backdrop-blur-[2px]">
        <span class="text-sm font-bold text-gray-300 animate-pulse tracking-wide">行動順を待っています...</span>
      </div>

      <!-- Actions -->
      <button id="btn-auto" class="flex-1 bg-blue-900 hover:bg-blue-800 rounded-lg font-bold text-[11px] border border-blue-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-blue-100">
        <span class="material-symbols-outlined text-[20px] mb-0.5 text-blue-400">auto_awesome</span>自動戦闘
      </button>
      <button id="btn-attack" class="flex-[1.5] bg-red-700 hover:bg-red-600 rounded-lg font-bold text-sm shadow-lg border border-red-500 flex flex-col items-center justify-center transition-all active:scale-95 text-red-50">
        <span class="material-symbols-outlined text-[24px] mb-0.5 text-red-300">swords</span>攻撃
      </button>
      <button id="btn-run" class="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-[11px] border border-gray-600 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-gray-300">
        <span class="material-symbols-outlined text-[20px] mb-0.5 text-gray-400">directions_run</span>逃げる
      </button>
    </div>
    
    <!-- Result Overlay -->
    <div id="battle-result" class="hidden absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
       <h2 id="result-title" class="text-5xl font-black mb-4 tracking-widest text-yellow-400 drop-shadow-lg">VICTORY</h2>
       <p id="result-text" class="text-gray-300 mb-10 text-sm font-bold">経験値とゴールドを獲得しました。</p>
       <button id="btn-result-ok" class="px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-lg transition-transform active:scale-90 cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.5)]">
         街へ戻る
       </button>
    </div>
  `;

  setTimeout(() => {
    new BattleManager(container).init();
  }, 0);

  return container;
}
