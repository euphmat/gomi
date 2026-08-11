/**
 * モンスタータワー用の軽量2D物理エンジン。
 * 外部ライブラリに依存せず、複数の円で構成した剛体を固定時間刻みで計算する。
 */

export const TOWER_WORLD = Object.freeze({
  width: 360,
  height: 520,
  gravity: 620,
  platform: Object.freeze({ x: 65, y: 430, width: 230, height: 24 }),
  lossY: 512,
});

const EPSILON = 1e-7;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const magnitude = vector => Math.hypot(vector.x, vector.y);
const getMatter = () => globalThis.Matter || null;

function exposeMatterBodyCoordinates(body, Matter) {
  if (Object.prototype.hasOwnProperty.call(body, 'x')) return body;
  Object.defineProperties(body, {
    x: {
      configurable: true,
      get: () => body.position.x,
      set: value => Matter.Body.setPosition(body, { x: value, y: body.position.y }),
    },
    y: {
      configurable: true,
      get: () => body.position.y,
      set: value => Matter.Body.setPosition(body, { x: body.position.x, y: value }),
    },
    vx: {
      configurable: true,
      get: () => body.velocity.x,
      set: value => Matter.Body.setVelocity(body, { x: value, y: body.velocity.y }),
    },
    vy: {
      configurable: true,
      get: () => body.velocity.y,
      set: value => Matter.Body.setVelocity(body, { x: body.velocity.x, y: value }),
    },
  });
  return body;
}

function createMatterTowerBody(options, Matter) {
  const profile = options.profile || createFallbackCollisionProfile();
  const baseOptions = {
    friction: .88,
    frictionStatic: 1.15,
    frictionAir: .008,
    restitution: .035,
    density: .0018,
    slop: .02,
  };
  const parts = profile.parts.map(part => Matter.Bodies.circle(
    options.x + part.x,
    (options.y ?? 48) + part.y,
    part.r,
    baseOptions,
  ));
  const body = Matter.Body.create({ ...baseOptions, parts });
  Matter.Body.setPosition(body, { x: options.x, y: options.y ?? 48 });
  Matter.Body.setAngle(body, options.angle || 0);
  body.towerId = options.id;
  body.monsterId = options.monsterId;
  body.owner = options.owner;
  body.profile = profile;
  return exposeMatterBodyCoordinates(body, Matter);
}

export function normalizeAngle(angle) {
  let result = angle % (Math.PI * 2);
  if (result > Math.PI) result -= Math.PI * 2;
  if (result < -Math.PI) result += Math.PI * 2;
  return result;
}

/** 画像内の不透明領域から、描画範囲と複合円当たり判定を作る。 */
export function createMonsterCollisionProfile(alpha, sourceWidth, sourceHeight, targetSize = 64) {
  if (!alpha || alpha.length !== sourceWidth * sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
    return createFallbackCollisionProfile(1, targetSize);
  }

  let minX = sourceWidth;
  let minY = sourceHeight;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      if (alpha[y * sourceWidth + x] < 28) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return createFallbackCollisionProfile(1, targetSize);

  const opaqueWidth = Math.max(1, maxX - minX + 1);
  const opaqueHeight = Math.max(1, maxY - minY + 1);
  const scale = targetSize / Math.max(opaqueWidth, opaqueHeight);
  const width = clamp(opaqueWidth * scale, 30, targetSize);
  const height = clamp(opaqueHeight * scale, 30, targetSize);
  const aspect = width / height;
  let parts;

  if (aspect >= 1.25) {
    const radius = clamp(Math.min(height * .42, width * .2), 10, 24);
    const spread = Math.max(radius * .72, width * .3);
    parts = [
      { x: -spread, y: height * .04, r: radius * .88 },
      { x: 0, y: -height * .03, r: radius },
      { x: spread, y: height * .04, r: radius * .88 },
    ];
  } else if (aspect <= .8) {
    const radius = clamp(Math.min(width * .42, height * .2), 10, 24);
    const spread = Math.max(radius * .72, height * .3);
    parts = [
      { x: 0, y: -spread, r: radius * .86 },
      { x: 0, y: 0, r: radius },
      { x: 0, y: spread, r: radius * .9 },
    ];
  } else {
    const radius = clamp(Math.min(width, height) * .39, 12, 25);
    parts = [
      { x: 0, y: height * .02, r: radius },
      { x: -width * .27, y: height * .08, r: radius * .68 },
      { x: width * .27, y: height * .08, r: radius * .68 },
    ];
  }

  return {
    width,
    height,
    parts,
    crop: {
      x: minX / sourceWidth,
      y: minY / sourceHeight,
      width: opaqueWidth / sourceWidth,
      height: opaqueHeight / sourceHeight,
    },
  };
}

export function createFallbackCollisionProfile(aspect = 1, targetSize = 64) {
  const safeAspect = clamp(Number(aspect) || 1, .45, 2.2);
  const sourceWidth = safeAspect >= 1 ? 32 : Math.round(32 * safeAspect);
  const sourceHeight = safeAspect >= 1 ? Math.round(32 / safeAspect) : 32;
  const alpha = new Uint8Array(sourceWidth * sourceHeight).fill(255);
  return createMonsterCollisionProfile(alpha, sourceWidth, sourceHeight, targetSize);
}

function calculateMass(profile) {
  const area = profile.parts.reduce((sum, part) => sum + Math.PI * part.r * part.r, 0);
  return clamp(area / 1800, .8, 3.2);
}

function calculateInertia(profile, mass) {
  const totalArea = profile.parts.reduce((sum, part) => sum + part.r * part.r, 0) || 1;
  return profile.parts.reduce((sum, part) => {
    const partMass = mass * ((part.r * part.r) / totalArea);
    return sum + partMass * (.5 * part.r * part.r + part.x * part.x + part.y * part.y);
  }, 0);
}

export function createTowerBody({ id, monsterId, owner, profile, x, y = 48, angle = 0 }) {
  const Matter = getMatter();
  if (Matter) return createMatterTowerBody({ id, monsterId, owner, profile, x, y, angle }, Matter);
  const safeProfile = profile || createFallbackCollisionProfile();
  const mass = calculateMass(safeProfile);
  const inertia = calculateInertia(safeProfile, mass);
  return {
    id,
    monsterId,
    owner,
    profile: safeProfile,
    x,
    y,
    angle,
    vx: 0,
    vy: 0,
    angularVelocity: 0,
    mass,
    inverseMass: 1 / mass,
    inertia,
    inverseInertia: inertia > EPSILON ? 1 / inertia : 0,
  };
}

export function createTowerWorld(bodies = []) {
  const Matter = getMatter();
  if (Matter) {
    const engine = Matter.Engine.create({
      positionIterations: 9,
      velocityIterations: 7,
      constraintIterations: 3,
      enableSleeping: true,
    });
    engine.gravity.x = 0;
    engine.gravity.y = 1;
    engine.gravity.scale = .00062;
    const rectangle = TOWER_WORLD.platform;
    const platformBody = Matter.Bodies.rectangle(
      rectangle.x + rectangle.width / 2,
      rectangle.y + rectangle.height / 2,
      rectangle.width,
      rectangle.height,
      {
        isStatic: true,
        friction: 1,
        frictionStatic: 1.3,
        restitution: .015,
        chamfer: { radius: 7 },
        label: 'tower-platform',
      },
    );
    const world = { bodies: [], elapsed: 0, engine, platformBody, usingMatter: true };
    Matter.Composite.add(engine.world, platformBody);
    bodies.forEach(body => addTowerBody(world, body));
    return world;
  }
  return { bodies: [...bodies], elapsed: 0 };
}

export function cloneTowerWorld(world) {
  if (world.usingMatter) {
    const Matter = getMatter();
    const clone = createTowerWorld();
    world.bodies.forEach(source => {
      const body = createMatterTowerBody({
        id: source.towerId,
        monsterId: source.monsterId,
        owner: source.owner,
        profile: source.profile,
        x: source.position.x,
        y: source.position.y,
        angle: source.angle,
      }, Matter);
      Matter.Body.setVelocity(body, { x: source.velocity.x, y: source.velocity.y });
      Matter.Body.setAngularVelocity(body, source.angularVelocity);
      addTowerBody(clone, body);
    });
    clone.elapsed = world.elapsed || 0;
    return clone;
  }
  return {
    elapsed: world.elapsed || 0,
    bodies: world.bodies.map(body => ({
      ...body,
      profile: {
        ...body.profile,
        crop: body.profile.crop ? { ...body.profile.crop } : undefined,
        parts: body.profile.parts.map(part => ({ ...part })),
      },
    })),
  };
}

export function addTowerBody(world, body) {
  world.bodies.push(body);
  if (world.usingMatter) getMatter().Composite.add(world.engine.world, body);
  return body;
}

export function getWorldCircle(body, part) {
  const cosine = Math.cos(body.angle);
  const sine = Math.sin(body.angle);
  return {
    x: body.x + part.x * cosine - part.y * sine,
    y: body.y + part.x * sine + part.y * cosine,
    r: part.r,
  };
}

function velocityAt(body, point) {
  const rx = point.x - body.x;
  const ry = point.y - body.y;
  return {
    x: body.vx - body.angularVelocity * ry,
    y: body.vy + body.angularVelocity * rx,
  };
}

function applyImpulse(body, impulse, point, direction) {
  if (!body || body.inverseMass === 0) return;
  body.vx += impulse.x * body.inverseMass * direction;
  body.vy += impulse.y * body.inverseMass * direction;
  const arm = { x: point.x - body.x, y: point.y - body.y };
  body.angularVelocity += cross(arm, impulse) * body.inverseInertia * direction;
}

function resolveContact(bodyA, bodyB, normal, penetration, point, restitution = .04, friction = .72) {
  const inverseMassA = bodyA?.inverseMass || 0;
  const inverseMassB = bodyB?.inverseMass || 0;
  if (inverseMassA + inverseMassB <= EPSILON) return;

  const correctionMagnitude = Math.max(0, penetration - .08) * .62 / (inverseMassA + inverseMassB);
  if (bodyA) {
    bodyA.x -= normal.x * correctionMagnitude * inverseMassA;
    bodyA.y -= normal.y * correctionMagnitude * inverseMassA;
  }
  if (bodyB) {
    bodyB.x += normal.x * correctionMagnitude * inverseMassB;
    bodyB.y += normal.y * correctionMagnitude * inverseMassB;
  }

  const velocityA = bodyA ? velocityAt(bodyA, point) : { x: 0, y: 0 };
  const velocityB = bodyB ? velocityAt(bodyB, point) : { x: 0, y: 0 };
  const relativeVelocity = { x: velocityB.x - velocityA.x, y: velocityB.y - velocityA.y };
  const normalSpeed = dot(relativeVelocity, normal);
  if (normalSpeed >= 0) return;

  const armA = bodyA ? { x: point.x - bodyA.x, y: point.y - bodyA.y } : { x: 0, y: 0 };
  const armB = bodyB ? { x: point.x - bodyB.x, y: point.y - bodyB.y } : { x: 0, y: 0 };
  const crossA = cross(armA, normal);
  const crossB = cross(armB, normal);
  const denominator = inverseMassA + inverseMassB
    + crossA * crossA * (bodyA?.inverseInertia || 0)
    + crossB * crossB * (bodyB?.inverseInertia || 0);
  if (denominator <= EPSILON) return;

  const impulseMagnitude = -(1 + restitution) * normalSpeed / denominator;
  const impulse = { x: normal.x * impulseMagnitude, y: normal.y * impulseMagnitude };
  applyImpulse(bodyA, impulse, point, -1);
  applyImpulse(bodyB, impulse, point, 1);

  const postVelocityA = bodyA ? velocityAt(bodyA, point) : { x: 0, y: 0 };
  const postVelocityB = bodyB ? velocityAt(bodyB, point) : { x: 0, y: 0 };
  const postRelative = { x: postVelocityB.x - postVelocityA.x, y: postVelocityB.y - postVelocityA.y };
  const tangentVelocity = {
    x: postRelative.x - normal.x * dot(postRelative, normal),
    y: postRelative.y - normal.y * dot(postRelative, normal),
  };
  const tangentLength = magnitude(tangentVelocity);
  if (tangentLength <= EPSILON) return;
  const tangent = { x: tangentVelocity.x / tangentLength, y: tangentVelocity.y / tangentLength };
  const tangentCrossA = cross(armA, tangent);
  const tangentCrossB = cross(armB, tangent);
  const tangentDenominator = inverseMassA + inverseMassB
    + tangentCrossA * tangentCrossA * (bodyA?.inverseInertia || 0)
    + tangentCrossB * tangentCrossB * (bodyB?.inverseInertia || 0);
  if (tangentDenominator <= EPSILON) return;
  const tangentImpulseMagnitude = clamp(
    -dot(postRelative, tangent) / tangentDenominator,
    -impulseMagnitude * friction,
    impulseMagnitude * friction,
  );
  const tangentImpulse = { x: tangent.x * tangentImpulseMagnitude, y: tangent.y * tangentImpulseMagnitude };
  applyImpulse(bodyA, tangentImpulse, point, -1);
  applyImpulse(bodyB, tangentImpulse, point, 1);
}

function collideBodyWithPlatform(body) {
  const rectangle = TOWER_WORLD.platform;
  const right = rectangle.x + rectangle.width;
  const bottom = rectangle.y + rectangle.height;
  body.profile.parts.forEach(part => {
    const circle = getWorldCircle(body, part);
    const nearestX = clamp(circle.x, rectangle.x, right);
    const nearestY = clamp(circle.y, rectangle.y, bottom);
    let dx = nearestX - circle.x;
    let dy = nearestY - circle.y;
    let distance = Math.hypot(dx, dy);
    if (distance >= circle.r) return;

    if (distance <= EPSILON) {
      const distances = [
        { value: Math.abs(circle.x - rectangle.x), normal: { x: -1, y: 0 }, point: { x: rectangle.x, y: circle.y } },
        { value: Math.abs(right - circle.x), normal: { x: 1, y: 0 }, point: { x: right, y: circle.y } },
        { value: Math.abs(circle.y - rectangle.y), normal: { x: 0, y: -1 }, point: { x: circle.x, y: rectangle.y } },
        { value: Math.abs(bottom - circle.y), normal: { x: 0, y: 1 }, point: { x: circle.x, y: bottom } },
      ].sort((a, b) => a.value - b.value);
      const nearest = distances[0];
      // resolveContactはAからBへ向く法線を要求する。
      resolveContact(body, null, { x: -nearest.normal.x, y: -nearest.normal.y }, circle.r + nearest.value, nearest.point);
      return;
    }

    const normal = { x: dx / distance, y: dy / distance };
    resolveContact(body, null, normal, circle.r - distance, { x: nearestX, y: nearestY });
  });
}

function collideBodies(bodyA, bodyB) {
  for (const partA of bodyA.profile.parts) {
    const circleA = getWorldCircle(bodyA, partA);
    for (const partB of bodyB.profile.parts) {
      const circleB = getWorldCircle(bodyB, partB);
      const dx = circleB.x - circleA.x;
      const dy = circleB.y - circleA.y;
      const distance = Math.hypot(dx, dy);
      const combinedRadius = circleA.r + circleB.r;
      if (distance >= combinedRadius) continue;
      const normal = distance > EPSILON
        ? { x: dx / distance, y: dy / distance }
        : { x: 0, y: 1 };
      const point = {
        x: circleA.x + normal.x * (circleA.r - (combinedRadius - distance) * .5),
        y: circleA.y + normal.y * (circleA.r - (combinedRadius - distance) * .5),
      };
      resolveContact(bodyA, bodyB, normal, combinedRadius - distance, point);
    }
  }
}

export function stepTowerWorld(world, deltaSeconds = 1 / 60, iterations = 3) {
  const dt = clamp(deltaSeconds, 1 / 240, 1 / 30);
  if (world.usingMatter) {
    world.elapsed = (world.elapsed || 0) + dt;
    getMatter().Engine.update(world.engine, dt * 1000);
    return world;
  }
  world.elapsed = (world.elapsed || 0) + dt;
  world.bodies.forEach(body => {
    body.vy += TOWER_WORLD.gravity * dt;
    const linearDamping = Math.pow(.997, dt * 60);
    const angularDamping = Math.pow(.993, dt * 60);
    body.vx *= linearDamping;
    body.vy *= linearDamping;
    body.angularVelocity *= angularDamping;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.angle = normalizeAngle(body.angle + body.angularVelocity * dt);
  });

  for (let pass = 0; pass < iterations; pass += 1) {
    world.bodies.forEach(collideBodyWithPlatform);
    for (let first = 0; first < world.bodies.length; first += 1) {
      for (let second = first + 1; second < world.bodies.length; second += 1) {
        collideBodies(world.bodies[first], world.bodies[second]);
      }
    }
  }
  return world;
}

export function getFallenBodies(world) {
  return world.bodies.filter(body => (
    body.y - body.profile.height * .5 > TOWER_WORLD.lossY
    || body.x + body.profile.width < -30
    || body.x - body.profile.width > TOWER_WORLD.width + 30
  ));
}

export function getTowerMotion(world) {
  if (!world.bodies.length) return 0;
  if (world.usingMatter) {
    // Matter.jsのspeedは基準フレーム当たりの値なので、フォールバック側の
    // px/秒基準へ揃える。落下途中を「静止」と誤判定しないためにも必要。
    return Math.max(...world.bodies.map(body => body.speed * 60 + Math.abs(body.angularSpeed) * 1080));
  }
  return Math.max(...world.bodies.map(body => Math.hypot(body.vx, body.vy) + Math.abs(body.angularVelocity) * 18));
}

export function getDropRange(profile) {
  const halfWidth = Math.max(14, profile.width * .42);
  return {
    min: TOWER_WORLD.platform.x + halfWidth * .35,
    max: TOWER_WORLD.platform.x + TOWER_WORLD.platform.width - halfWidth * .35,
  };
}

function evaluateCpuResult(world, newBodyId) {
  const fallen = getFallenBodies(world);
  if (fallen.length) return -100000 - fallen.length * 1000;
  const body = world.bodies.find(candidate => candidate.id === newBodyId);
  if (!body) return -100000;
  const centerDistance = Math.abs(body.x - TOWER_WORLD.width * .5);
  const motion = getTowerMotion(world);
  const tilt = Math.abs(normalizeAngle(body.angle));
  const highestPoint = Math.min(...world.bodies.map(candidate => candidate.y - candidate.profile.height * .5));
  return 2200 - centerDistance * 1.4 - motion * 5.5 - tilt * 42 - Math.max(0, 145 - highestPoint) * .22;
}

/** 候補配置を内部シミュレーションし、CPUの落下位置と角度を返す。 */
export function chooseCpuPlacement(world, profile, options = {}) {
  const candidateCount = clamp(Math.floor(options.candidateCount || 10), 3, 36);
  const maxRotation = clamp(Number(options.maxRotation ?? Math.PI / 3), 0, Math.PI);
  const noise = Math.max(0, Number(options.noise ?? 40));
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const range = getDropRange(profile);
  const candidates = [{ x: TOWER_WORLD.width * .5, angle: 0 }];

  // 台の左端から右端まで偏りなく探索し、中央の無回転も必ず比較する。
  for (let index = 0; index < candidateCount; index += 1) {
    const fraction = candidateCount <= 1 ? .5 : index / (candidateCount - 1);
    const jitter = (rng() - .5) * ((range.max - range.min) / candidateCount) * .65;
    const x = clamp(range.min + (range.max - range.min) * fraction + jitter, range.min, range.max);
    const rotationStep = (index * 2) % 5;
    const angle = maxRotation === 0 ? 0 : ((rotationStep / 4) * 2 - 1) * maxRotation;
    candidates.push({ x, angle });
  }

  let best = candidates[0];
  let bestScore = -Infinity;
  candidates.forEach((candidate, index) => {
    const simulation = cloneTowerWorld(world);
    const id = `cpu-preview-${index}`;
    const previewBody = addTowerBody(simulation, createTowerBody({
      id,
      monsterId: options.monsterId || id,
      owner: 'cpu',
      profile,
      x: candidate.x,
      y: 42,
      angle: candidate.angle,
    }));
    for (let frame = 0; frame < 180; frame += 1) {
      stepTowerWorld(simulation, 1 / 60, 2);
      if (getFallenBodies(simulation).length) break;
    }
    const score = evaluateCpuResult(simulation, previewBody.id) + (rng() - .5) * noise;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return { ...best, score: bestScore };
}
