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
  getMonsterPhysicsTraits,
  stepTowerWorld,
} = await import('../js/data/monster-tower-engine.js');

const wideMask = new Uint8Array(40 * 20);
for (let y = 5; y < 15; y += 1) {
  for (let x = 2; x < 38; x += 1) wideMask[y * 40 + x] = 255;
}
const wideProfile = createMonsterCollisionProfile(wideMask, 40, 20, 70);
assert(wideProfile.width > wideProfile.height * 1.5, 'wide alpha silhouette was not preserved');
assert(wideProfile.parts.length === 3, 'collision profile does not have three compound parts');
assert(wideProfile.collisionRects.length === 1, 'solid silhouette was not merged into one collision rectangle');
assert(wideProfile.crop.x > 0 && wideProfile.crop.width < 1, 'transparent horizontal padding was not cropped');

const concaveMask = new Uint8Array(36 * 36);
for (let y = 2; y < 34; y += 1) {
  for (let x = 2; x < 12; x += 1) concaveMask[y * 36 + x] = 255;
}
for (let y = 24; y < 34; y += 1) {
  for (let x = 2; x < 34; x += 1) concaveMask[y * 36 + x] = 255;
}
const concaveProfile = createMonsterCollisionProfile(concaveMask, 36, 36, 64);
const emptyCornerX = concaveProfile.width * .28;
const emptyCornerY = -concaveProfile.height * .28;
assert(!concaveProfile.collisionRects.some(rectangle => (
  Math.abs(emptyCornerX - rectangle.x) <= rectangle.width / 2
  && Math.abs(emptyCornerY - rectangle.y) <= rectangle.height / 2
)), 'concave transparent area incorrectly received collision geometry');

const roundMask = new Uint8Array(40 * 40);
for (let y = 0; y < 40; y += 1) {
  for (let x = 0; x < 40; x += 1) {
    if ((x - 19.5) ** 2 + (y - 19.5) ** 2 <= 18 ** 2) roundMask[y * 40 + x] = 255;
  }
}
const roundProfile = createMonsterCollisionProfile(roundMask, 40, 40, 64);
const ovalMask = new Uint8Array(50 * 40);
for (let y = 0; y < 40; y += 1) {
  for (let x = 0; x < 50; x += 1) {
    if (((x - 24.5) / 22) ** 2 + ((y - 19.5) / 17) ** 2 <= 1) ovalMask[y * 50 + x] = 255;
  }
}
const ovalProfile = createMonsterCollisionProfile(ovalMask, 50, 40, 64);
const ovalSlimeTraits = getMonsterPhysicsTraits('slime_green', ovalProfile);
const slimeTraits = getMonsterPhysicsTraits('slime_green', roundProfile);
const heavyTraits = getMonsterPhysicsTraits('resonance_golem', roundProfile);
const lightTraits = getMonsterPhysicsTraits('astral_wisp', roundProfile);
const naturalRoundTraits = getMonsterPhysicsTraits('round_test_monster', roundProfile);
assert(slimeTraits.roundBody && slimeTraits.friction < .1, 'slime is not configured to roll easily');
assert(!ovalSlimeTraits.roundBody && ovalSlimeTraits.smoothHull, 'oval slime was forced into a circle instead of its image hull');
assert(slimeTraits.restitution > heavyTraits.restitution, 'slime is not more elastic than a golem');
assert(heavyTraits.density > slimeTraits.density * 2, 'heavy monster density is too low');
assert(lightTraits.density < slimeTraits.density, 'ethereal monster is not lightweight');
assert(naturalRoundTraits.roundBody, 'naturally round alpha silhouette was not recognized');
assert(!getMonsterPhysicsTraits('slime_king', concaveProfile).roundBody, 'slime name overrode its non-round image silhouette');
if (globalThis.Matter) {
  const concaveBody = createTowerBody({
    id: 'concave', monsterId: 'test_concave', owner: 'player', profile: concaveProfile,
    x: TOWER_WORLD.width / 2, y: 48,
  });
  assert(concaveBody.parts.length - 1 === concaveProfile.collisionRects.length, 'Matter.js did not receive the complete alpha-mask geometry');
  const slimeBody = createTowerBody({
    id: 'slime', monsterId: 'slime_green', owner: 'player', profile: roundProfile,
    x: TOWER_WORLD.width / 2, y: 48,
  });
  const heavyBody = createTowerBody({
    id: 'golem', monsterId: 'resonance_golem', owner: 'cpu', profile: concaveProfile,
    x: TOWER_WORLD.width / 2, y: 48,
  });
  assert(slimeBody.circleRadius > 0 && slimeBody.parts.length === 1, 'slime does not use a smooth circular rigid body');
  assert(heavyBody.parts.length > 1, 'non-round heavy monster lost its image-shaped compound body');
  assert(heavyBody.mass > slimeBody.mass, 'heavy monster is not physically heavier than a same-size slime');

  const rollingEngine = Matter.Engine.create();
  rollingEngine.gravity.scale = .00062;
  const ramp = Matter.Bodies.rectangle(180, 320, 260, 20, {
    isStatic: true, angle: .12, friction: .8,
  });
  const rollingSlime = createTowerBody({
    id: 'rolling-slime', monsterId: 'slime_green', owner: 'player', profile: ovalProfile,
    x: 120, y: 210,
  });
  Matter.Composite.add(rollingEngine.world, [ramp, rollingSlime]);
  for (let frame = 0; frame < 360; frame += 1) Matter.Engine.update(rollingEngine, 1000 / 120);
  assert(rollingSlime.position.x > 145, 'oval slime did not travel down a slope');
  assert(Math.abs(rollingSlime.angle) > .6, 'oval slime moved without visibly rolling');
}

const profile = createFallbackCollisionProfile(1, 60);
assert(TOWER_WORLD.platform.width === 260, 'tower platform width is not the enlarged size');
assert(TOWER_WORLD.platform.x === 50, 'enlarged tower platform is not centered');

const stoppedWorld = createTowerWorld([], { stoppers: true });
assert(stoppedWorld.hasStoppers, 'difficulty stoppers were not enabled in the tower world');
if (globalThis.Matter) {
  assert(stoppedWorld.stopperBodies.length === 2, 'Matter.js world does not have both platform stoppers');
}

const edgeProfile = createFallbackCollisionProfile(1, 30);
for (const side of [-1, 1]) {
  const edgeWorld = createTowerWorld([], { stoppers: true });
  const edgeBody = addTowerBody(edgeWorld, createTowerBody({
    id: `edge-stop-${side}`, monsterId: 'edge-test', owner: 'player', profile: edgeProfile,
    x: TOWER_WORLD.width / 2 + side * 105, y: 395,
  }));
  edgeBody.vx = side * 60;
  for (let frame = 0; frame < 480; frame += 1) stepTowerWorld(edgeWorld, 1 / 120, 3);
  assert(getFallenBodies(edgeWorld).length === 0, `${side < 0 ? 'left' : 'right'} platform stopper did not catch an edge-bound monster`);
}

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

const exhaustivePlacement = chooseCpuPlacement(cpuWorld, profile, {
  exhaustiveSearch: true,
  positionCount: 7,
  angleCount: 5,
  simulationFrames: 120,
  refineCount: 2,
  refineFrames: 120,
  maxRotation: Math.PI,
  noise: 0,
  rng: () => .5,
  monsterId: 'slime_green',
});
assert(Number.isFinite(exhaustivePlacement.x) && Number.isFinite(exhaustivePlacement.angle), 'exhaustive CPU placement is invalid');
assert(exhaustivePlacement.x >= TOWER_WORLD.platform.x && exhaustivePlacement.x <= TOWER_WORLD.platform.x + TOWER_WORLD.platform.width, 'exhaustive CPU selected a position outside the platform');
assert(exhaustivePlacement.score > -100000, 'exhaustive CPU could not find a safe placement on an empty platform');

assert(MONSTERS.length > 0, 'monster definitions are empty');
assert(new Set(MONSTERS.map(monster => monster.id)).size === MONSTERS.length, 'monster definitions contain duplicate IDs');
const missingImages = MONSTERS.filter(monster => !fs.existsSync(monster.image.replace('./', '')));
assert(missingImages.length === 0, `missing monster images: ${missingImages.map(monster => monster.id).join(', ')}`);

const appSource = fs.readFileSync('js/app.js', 'utf8');
const statusSource = fs.readFileSync('js/pages/status.js', 'utf8');
const navSource = fs.readFileSync('js/components/nav-bar.js', 'utf8');
const pageSource = fs.readFileSync('js/pages/monster-tower.js', 'utf8');
assert(appSource.includes(".register('/monster-tower', renderMonsterTowerPage)"), 'monster tower route is not registered');
assert(statusSource.includes('data-monster-tower'), 'hometown monster tower button is missing');
assert(navSource.includes("'/monster-tower'"), 'monster tower does not keep the hometown navigation active');
assert(pageSource.includes('if (!matterReady)'), 'monster tower can start without image-accurate Matter.js geometry');

console.log(`Monster Tower tests passed (${globalThis.Matter ? 'Matter.js' : 'fallback'} physics, ${MONSTERS.length} monsters).`);
