import fs from 'node:fs';
import vm from 'node:vm';
import { MONSTERS } from '../js/definitions/monsters.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

if (process.argv.includes('--matter')) {
  const matterPath = '/tmp/gomi-matter-0.20.0.min.js';
  assert(fs.existsSync(matterPath), 'Matter.js test runtime is missing');
  vm.runInThisContext(fs.readFileSync(matterPath, 'utf8'), { filename: matterPath });
  assert(globalThis.Matter?.Engine, 'Matter.js did not initialize');
}

const {
  TOWER_WORLD,
  addTowerBody,
  chooseCpuPlacement,
  createFallbackCollisionProfile,
  createMonsterCollisionProfile,
  createTowerBody,
  createTowerWorld,
  getFallenBodies,
  stepTowerWorld,
} = await import('../js/data/monster-tower-engine.js');

const wideMask = new Uint8Array(40 * 20);
for (let y = 5; y < 15; y += 1) {
  for (let x = 2; x < 38; x += 1) wideMask[y * 40 + x] = 255;
}
const wideProfile = createMonsterCollisionProfile(wideMask, 40, 20, 70);
assert(wideProfile.width > wideProfile.height * 1.5, 'wide alpha silhouette was not preserved');
assert(wideProfile.parts.length === 3, 'collision profile does not have three compound parts');
assert(wideProfile.crop.x > 0 && wideProfile.crop.width < 1, 'transparent horizontal padding was not cropped');

const profile = createFallbackCollisionProfile(1, 60);
const stableWorld = createTowerWorld();
addTowerBody(stableWorld, createTowerBody({
  id: 'stable', monsterId: 'slime_green', owner: 'player', profile,
  x: TOWER_WORLD.width / 2, y: 48,
}));
for (let frame = 0; frame < 480; frame += 1) stepTowerWorld(stableWorld, 1 / 120, 3);
assert(getFallenBodies(stableWorld).length === 0, 'centered monster fell through the platform');
assert(stableWorld.bodies[0].y < TOWER_WORLD.platform.y, 'centered monster did not settle above the platform');

const fallingWorld = createTowerWorld();
addTowerBody(fallingWorld, createTowerBody({
  id: 'falling', monsterId: 'slime_green', owner: 'player', profile,
  x: 12, y: 48,
}));
for (let frame = 0; frame < 480; frame += 1) stepTowerWorld(fallingWorld, 1 / 120, 3);
assert(getFallenBodies(fallingWorld).length === 1, 'off-platform monster was not detected as fallen');

const cpuWorld = createTowerWorld();
const placement = chooseCpuPlacement(cpuWorld, profile, {
  candidateCount: 8,
  maxRotation: Math.PI / 3,
  noise: 0,
  rng: () => .5,
  monsterId: 'slime_green',
});
assert(Number.isFinite(placement.x) && Number.isFinite(placement.angle), 'CPU placement is invalid');
assert(placement.x >= TOWER_WORLD.platform.x && placement.x <= TOWER_WORLD.platform.x + TOWER_WORLD.platform.width, 'CPU selected a position outside the platform');
assert(placement.score > -100000, 'CPU could not find a safe placement on an empty platform');

assert(MONSTERS.length > 0, 'monster definitions are empty');
assert(new Set(MONSTERS.map(monster => monster.id)).size === MONSTERS.length, 'monster definitions contain duplicate IDs');
const missingImages = MONSTERS.filter(monster => !fs.existsSync(monster.image.replace('./', '')));
assert(missingImages.length === 0, `missing monster images: ${missingImages.map(monster => monster.id).join(', ')}`);

const appSource = fs.readFileSync('js/app.js', 'utf8');
const statusSource = fs.readFileSync('js/pages/status.js', 'utf8');
const navSource = fs.readFileSync('js/components/nav-bar.js', 'utf8');
assert(appSource.includes(".register('/monster-tower', renderMonsterTowerPage)"), 'monster tower route is not registered');
assert(statusSource.includes('data-monster-tower'), 'hometown monster tower button is missing');
assert(navSource.includes("'/monster-tower'"), 'monster tower does not keep the hometown navigation active');

console.log(`Monster Tower tests passed (${globalThis.Matter ? 'Matter.js' : 'fallback'} physics, ${MONSTERS.length} monsters).`);

