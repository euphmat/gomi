const fs = await import('node:fs');
const { JOBS } = await import('../js/jobs/index.js');
const { JOB_GAUGE_UNIQUE_SKILLS } = await import('../js/jobs/job-unique-skills.js');
const { STANDARD_JOB_GAUGES } = await import('../js/pages/battle/job-gauge-system.js');
const {
  isJobUniqueSkillUnlocked,
  renderJobUniqueSkillCards,
  renderJobUniqueSkillSummary
} = await import('../js/components/job-unique-skill-cards.js');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const jobIds = Object.keys(JOBS);
assert(jobIds.length === 25, `職業数が想定外です: ${jobIds.length}`);
assert(Object.keys(JOB_GAUGE_UNIQUE_SKILLS).length === jobIds.length, '固有スキル定義と職業数が一致しません');

const uniqueIds = new Set();
for (const jobId of jobIds) {
  const job = JOBS[jobId];
  assert(Array.isArray(job.uniqueSkills) && job.uniqueSkills.length > 0, `${job.name}に固有スキルがありません`);
  for (const skill of job.uniqueSkills) {
    assert(skill.id && skill.name && skill.icon && skill.activation && skill.description, `${job.name}の固有スキル情報が不足しています`);
    assert(Array.isArray(skill.sourceSkills) && skill.sourceSkills.length > 0, `${skill.name}の連携スキル情報がありません`);
    assert(Array.isArray(skill.mechanics) && skill.mechanics.length >= 3, `${skill.name}に能力の全仕様がありません`);
    assert(!uniqueIds.has(skill.id), `固有スキルIDが重複しています: ${skill.id}`);
    uniqueIds.add(skill.id);
    assert(!job.skills.some(normalSkill => normalSkill.id === skill.id), `${skill.name}が通常スキル配列へ混入しています`);
  }
}
assert(uniqueIds.size === 26, `固有スキル総数が想定外です: ${uniqueIds.size}`);

for (const [jobId, gaugeDefinition] of Object.entries(STANDARD_JOB_GAUGES)) {
  const fullText = JOBS[jobId].uniqueSkills.flatMap(skill => skill.mechanics.map(item => item.text)).join(' ');
  assert(fullText.includes(gaugeDefinition.label), `${JOBS[jobId].name}にゲージ名${gaugeDefinition.label}が表示されません`);
  assert(fullText.includes(String(gaugeDefinition.max)), `${JOBS[jobId].name}にゲージ上限${gaugeDefinition.max}が表示されません`);
}

const requiredMechanicFragments = {
  norvice: ['初めて使った時だけ+1', '与ダメージ4%上昇', '2.5倍'],
  knight: ['被ダメージ2%軽減', '威力25%上昇'],
  mage: ['同じ属性を続けると1', '与ダメージ5%上昇', '威力42%上昇', '約2.26倍'],
  priest: ['ヒール+20', '被ダメージ0.05%軽減', '実消費MPを全額還元'],
  ranger: ['与ダメージ2%上昇', '2.5倍'],
  magic_knight: ['異なる属性剣なら+2', '与ダメージ3%上昇', '2.5倍'],
  slime_master: ['被ダメージ0.1%軽減', '威力1%上昇'],
  dancer: ['同じスキルを続けると1', '与ダメージ4%上昇', '威力32%上昇', '約2.28倍'],
  bird: ['使用で+2', '与ダメージ3%上昇', '威力15%上昇'],
  black_knight: ['受けるたび+10', '与ダメージ0.2%上昇', '威力1%上昇'],
  paladin: ['被ダメージ2%軽減', '威力40%上昇'],
  poseidon: ['与ダメージ4%上昇', '威力50%上昇'],
  pyromancer: ['インフェルノ+35', '与ダメージ0.3%上昇', '最大100%'],
  assassin: ['別の標的を攻撃すると1', '与ダメージ4%上昇', '威力25%上昇'],
  guardian: ['ダメージを受けた時にも+1', '被ダメージ3%軽減', '威力30%上昇'],
  cryomancer: ['ホワイトアウトは+2', '与ダメージ2.5%上昇', '威力20%上昇'],
  magic_archer: ['実消費MP40ごとに+1', '与ダメージ3%上昇', '威力20%上昇'],
  gunner: ['戦闘開始時は現在上限', 'ラピッドファイア3', '攻撃せず自動リロード'],
  plague_doctor: ['腐蝕ミアズマ+2', '与ダメージ2%上昇', '威力15%上昇'],
  entertainer: ['ショーストッパーのLv', '4つのアクティブスキル', '16～22%'],
  mana_conductor: ['マナリレー', '威力+0.24倍', '威力+0.20倍'],
  slime_singer: ['共鳴ジェルのLv', '4つのアクティブスキル', '+0.22～0.42倍'],
  dragoon: ['竜騎士の魂のLv', 'ドラゴンスイープ', '+0.35～0.68倍'],
  shinra_sage: ['同じ印は重複しない', '3印完成時', '+0.75倍', '18～45%回復'],
  soul_reaper: ['魂魄刈り', '敵撃破時にも+1', '死霊軍勢', '骸骨城塞', '亡者大行軍', '終焉の葬列']
};
for (const [jobId, fragments] of Object.entries(requiredMechanicFragments)) {
  const fullText = JOBS[jobId].uniqueSkills.flatMap(skill => skill.mechanics.map(item => item.text)).join(' ');
  fragments.forEach(fragment => assert(fullText.includes(fragment), `${JOBS[jobId].name}の固有能力説明に「${fragment}」がありません`));
}

const gunner = JOBS.gunner;
const reload = gunner.uniqueSkills.find(skill => skill.unlockSkillId === 'reload');
assert(reload, 'ガンナーのタクティカルリロードが固有スキルとして登録されていません');
assert(!isJobUniqueSkillUnlocked(reload, { jobSkills: { gunner: {} } }, 'gunner'), '未習得リロードが解放済み扱いです');
assert(isJobUniqueSkillUnlocked(reload, { jobSkills: { gunner: { reload: 1 } } }, 'gunner'), '習得済みリロードが未解放扱いです');

const lockedHtml = renderJobUniqueSkillCards(gunner, { jobSkills: { gunner: {} } });
assert(lockedHtml.includes('タクティカルリロード') && lockedHtml.includes('フルバースト'), 'ガンナーの固有スキル一覧が不足しています');
assert(lockedHtml.includes('data-unique-unlocked="false"') && lockedHtml.includes('未習得'), '習得条件付き固有スキルの状態が表示されません');
assert(!lockedHtml.includes('skill-btn'), '固有スキルカードが戦闘用実行ボタンになっています');

const summaryHtml = renderJobUniqueSkillSummary(gunner);
assert(summaryHtml.includes('data-job-unique-skill-summary="gunner"') && summaryHtml.includes('発動：') && summaryHtml.includes('弾薬消費'), '職業ページ用の固有スキル全仕様が表示されません');

const guardianHtml = renderJobUniqueSkillCards(JOBS.guardian, { jobSkills: { guardian: {} } });
assert(guardianHtml.includes('イージスバッシュ以外') && guardianHtml.includes('被ダメージ3%軽減') && guardianHtml.includes('威力30%上昇'), 'ガーディアンの蓄積・常時効果・解放効果を網羅できていません');
assert(guardianHtml.includes('最大15%') && guardianHtml.includes('最大150%'), 'ガーディアンの効果上限が表示されません');
assert(guardianHtml.includes('限界突破+10') && guardianHtml.includes('固有ゲージ上限 +1枠'), 'ガーディアンの上限覚醒が表示されません');

const acquireSource = fs.readFileSync(new URL('../js/pages/guild-tabs/acquire-skill.js', import.meta.url), 'utf8');
assert(acquireSource.includes('btn-tab-unique') && acquireSource.includes('renderJobUniqueSkillCards'), '修練場の固有スキルタブが接続されていません');

const changeJobSource = fs.readFileSync(new URL('../js/pages/guild-tabs/change-job.js', import.meta.url), 'utf8');
assert(changeJobSource.includes('renderJobUniqueSkillSummary(job)'), '職業一覧に固有スキル概要が接続されていません');

console.log('job unique skills tests passed');
