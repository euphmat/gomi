const fs = await import('node:fs');
const { JOBS } = await import('../js/jobs/index.js');
const { JOB_GAUGE_UNIQUE_SKILLS } = await import('../js/jobs/job-unique-skills.js');
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
    assert(!uniqueIds.has(skill.id), `固有スキルIDが重複しています: ${skill.id}`);
    uniqueIds.add(skill.id);
    assert(!job.skills.some(normalSkill => normalSkill.id === skill.id), `${skill.name}が通常スキル配列へ混入しています`);
  }
}
assert(uniqueIds.size === 26, `固有スキル総数が想定外です: ${uniqueIds.size}`);

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
assert(summaryHtml.includes('data-job-unique-skill-summary="gunner"') && summaryHtml.includes('発動：'), '職業ページ用の固有スキル概要が表示されません');

const acquireSource = fs.readFileSync(new URL('../js/pages/guild-tabs/acquire-skill.js', import.meta.url), 'utf8');
assert(acquireSource.includes('btn-tab-unique') && acquireSource.includes('renderJobUniqueSkillCards'), '修練場の固有スキルタブが接続されていません');

const changeJobSource = fs.readFileSync(new URL('../js/pages/guild-tabs/change-job.js', import.meta.url), 'utf8');
assert(changeJobSource.includes('renderJobUniqueSkillSummary(job)'), '職業一覧に固有スキル概要が接続されていません');

console.log('job unique skills tests passed');
