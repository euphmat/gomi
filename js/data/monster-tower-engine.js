/**
 * モンスタータワー用の軽量2D物理エンジン。
 * Matter.jsでは画像アルファ由来の複合剛体を使い、未読込時は軽量物理へフォールバックする。
 */

export const TOWER_WORLD = Object.freeze({
  width: 360,
  height: 520,
  gravity: 620,
  platform: Object.freeze({ x: 50, y: 430, width: 260, height: 24 }),
  stopper: Object.freeze({ width: 10, height: 14 }),
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
  const traits = getMonsterPhysicsTraits(options.monsterId, profile);
  const baseOptions = {
    friction: traits.friction,
    frictionStatic: traits.frictionStatic,
    frictionAir: traits.frictionAir,
    restitution: traits.restitution,
    density: traits.density,
    slop: .012,
  };
  const collisionRectangles = options.useCoarseGeometry
    ? profile.cpuCollisionRects
    : profile.collisionRects;
  const parts = traits.roundBody
    ? [Matter.Bodies.circle(
      options.x,
      options.y ?? 48,
      Math.max(10, Math.min(profile.width * .47, profile.height * .49)),
      baseOptions,
    )]
    : traits.smoothHull && profile.convexHull?.length >= 3
    ? [Matter.Bodies.fromVertices(
      options.x,
      options.y ?? 48,
      [profile.convexHull],
      baseOptions,
      true,
    )]
    : collisionRectangles?.length
    ? collisionRectangles.map(rectangle => Matter.Bodies.rectangle(
      options.x + rectangle.x,
      (options.y ?? 48) + rectangle.y,
      rectangle.width,
      rectangle.height,
      {
        ...baseOptions,
        // 完全な直角の集合は角同士が噛みやすいため、1px未満だけ丸める。
        chamfer: { radius: Math.min(.7, rectangle.width * .06, rectangle.height * .06) },
      },
    ))
    : profile.parts.map(part => Matter.Bodies.circle(
      options.x + part.x,
      (options.y ?? 48) + part.y,
      part.r,
      baseOptions,
    ));
  const body = traits.roundBody || traits.smoothHull
    ? parts[0]
    : Matter.Body.create({ ...baseOptions, parts });
  Matter.Body.setPosition(body, { x: options.x, y: options.y ?? 48 });
  Matter.Body.setAngle(body, options.angle || 0);
  if (!traits.roundBody && traits.inertiaScale !== 1 && Number.isFinite(body.inertia)) {
    Matter.Body.setInertia(body, body.inertia * traits.inertiaScale);
  }
  body.towerId = options.id;
  body.monsterId = options.monsterId;
  body.owner = options.owner;
  body.profile = profile;
  body.physicsTraits = traits;
  return exposeMatterBodyCoordinates(body, Matter);
}

export function normalizeAngle(angle) {
  let result = angle % (Math.PI * 2);
  if (result > Math.PI) result -= Math.PI * 2;
  if (result < -Math.PI) result += Math.PI * 2;
  return result;
}

function crossProduct(origin, first, second) {
  return (first.x - origin.x) * (second.y - origin.y) - (first.y - origin.y) * (second.x - origin.x);
}

function createConvexHull(points) {
  const unique = Array.from(new Map(points.map(point => [`${point.x}:${point.y}`, point])).values())
    .sort((first, second) => first.x - second.x || first.y - second.y);
  if (unique.length <= 3) return unique;
  const lower = [];
  unique.forEach(point => {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  });
  const upper = [];
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const point = unique[index];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function getPolygonArea(vertices) {
  let twiceArea = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    const next = vertices[(index + 1) % vertices.length];
    twiceArea += vertices[index].x * next.y - next.x * vertices[index].y;
  }
  return Math.abs(twiceArea) / 2;
}

const HEAVY_MONSTER_WORDS = [
  'golem', 'titan', 'gigas', 'colossus', 'talos', 'armor', 'guardian',
  'behemoth', 'machina', 'tortoise', 'turtle', 'keeper', 'minotaur',
];
const LIGHT_MONSTER_WORDS = [
  'wisp', 'pixie', 'sylph', 'moth', 'papillon', 'firefly', 'sprite',
  'echoes', 'jellyfish', 'harpy', 'swallow', 'manta', 'lantern',
];
const GRIPPY_MONSTER_WORDS = [
  'spider', 'arachn', 'mantis', 'scarab', 'beetle', 'scorpion', 'crawler',
];

/** モンスター名と画像形状から、Matter.jsへ渡す材質・剛体特性を決める。 */
export function getMonsterPhysicsTraits(monsterId = '', profile = {}) {
  const id = String(monsterId).toLowerCase();
  const aspect = (Number(profile.width) || 1) / (Number(profile.height) || 1);
  const ellipseFit = Number(profile.ellipseFit) || 0;
  const convexity = Number(profile.convexity) || 0;
  const isSlime = id.includes('slime');
  const roundBody = ellipseFit >= .965 && convexity >= .94 && aspect >= .9 && aspect <= 1.1;
  const smoothHull = !roundBody && ellipseFit >= .86 && convexity >= .88 && aspect >= .65 && aspect <= 1.55;
  const geometry = { roundBody, smoothHull };
  const isHeavy = HEAVY_MONSTER_WORDS.some(word => id.includes(word));
  const isLight = LIGHT_MONSTER_WORDS.some(word => id.includes(word));
  const isGrippy = GRIPPY_MONSTER_WORDS.some(word => id.includes(word));

  if (isSlime) {
    return Object.freeze({
      kind: 'slime', label: smoothHull || roundBody ? '丸みのあるスライム質' : '画像形状のスライム質', ...geometry,
      density: .0012, friction: .055, frictionStatic: .075,
      frictionAir: .0025, restitution: .22, inertiaScale: .82,
    });
  }
  if (isHeavy) {
    return Object.freeze({
      kind: 'heavy', label: '重く安定した体格', ...geometry,
      density: .0031, friction: .88, frictionStatic: 1.12,
      frictionAir: .005, restitution: .012, inertiaScale: 1.18,
    });
  }
  if (isLight) {
    return Object.freeze({
      kind: 'light', label: '軽量な体格', ...geometry,
      density: .0009, friction: .34, frictionStatic: .43,
      frictionAir: .011, restitution: .075, inertiaScale: .78,
    });
  }
  if (isGrippy) {
    return Object.freeze({
      kind: 'grippy', label: '踏ん張りの強い体型', ...geometry,
      density: .0018, friction: .96, frictionStatic: 1.24,
      frictionAir: .006, restitution: .018, inertiaScale: 1.08,
    });
  }
  if (roundBody || smoothHull) {
    return Object.freeze({
      kind: 'round', label: '画像から判定した丸い体型', ...geometry,
      density: .00165, friction: .14, frictionStatic: .2,
      frictionAir: .0035, restitution: .09, inertiaScale: .9,
    });
  }
  return Object.freeze({
    kind: 'standard', label: '標準的な体格', ...geometry,
    density: .00175, friction: .58, frictionStatic: .76,
    frictionAir: .006, restitution: .035, inertiaScale: 1,
  });
}

/**
 * アルファマスクを最大18×18セルへ縮約し、横方向の連続セルを長方形へまとめる。
 * 長方形の和集合が画像の不透明領域になるため、凹形状や離れた部位も保持できる。
 */
function createAlphaCollisionRectangles(alpha, sourceWidth, minX, minY, opaqueWidth, opaqueHeight, displayWidth, displayHeight, longestGridSide = 18) {
  const aspect = opaqueWidth / opaqueHeight;
  const columns = aspect >= 1
    ? longestGridSide
    : Math.max(6, Math.round(longestGridSide * aspect));
  const rows = aspect >= 1
    ? Math.max(6, Math.round(longestGridSide / aspect))
    : longestGridSide;
  const occupied = Array.from({ length: rows }, () => Array(columns).fill(false));

  for (let row = 0; row < rows; row += 1) {
    const startY = minY + Math.floor((row / rows) * opaqueHeight);
    const endY = minY + Math.max(Math.floor(((row + 1) / rows) * opaqueHeight), Math.floor((row / rows) * opaqueHeight) + 1);
    for (let column = 0; column < columns; column += 1) {
      const startX = minX + Math.floor((column / columns) * opaqueWidth);
      const endX = minX + Math.max(Math.floor(((column + 1) / columns) * opaqueWidth), Math.floor((column / columns) * opaqueWidth) + 1);
      let solidPixels = 0;
      let totalPixels = 0;
      let strongestAlpha = 0;
      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const value = alpha[y * sourceWidth + x];
          strongestAlpha = Math.max(strongestAlpha, value);
          if (value >= 40) solidPixels += 1;
          totalPixels += 1;
        }
      }
      // 輪郭の細い角や脚は、面積が小さくても十分に不透明なら残す。
      occupied[row][column] = totalPixels > 0
        && (solidPixels / totalPixels >= .16 || strongestAlpha >= 210);
    }
  }

  const rectangles = [];
  let active = new Map();
  for (let row = 0; row < rows; row += 1) {
    const runs = [];
    let column = 0;
    while (column < columns) {
      if (!occupied[row][column]) {
        column += 1;
        continue;
      }
      const start = column;
      while (column < columns && occupied[row][column]) column += 1;
      runs.push({ start, end: column });
    }

    const nextActive = new Map();
    runs.forEach(run => {
      const key = `${run.start}:${run.end}`;
      const existing = active.get(key);
      if (existing) {
        existing.endRow = row + 1;
        nextActive.set(key, existing);
      } else {
        nextActive.set(key, { startColumn: run.start, endColumn: run.end, startRow: row, endRow: row + 1 });
      }
    });
    active.forEach((rectangle, key) => {
      if (!nextActive.has(key)) rectangles.push(rectangle);
    });
    active = nextActive;
  }
  active.forEach(rectangle => rectangles.push(rectangle));

  return rectangles.map(rectangle => {
    const left = -displayWidth / 2 + (rectangle.startColumn / columns) * displayWidth;
    const right = -displayWidth / 2 + (rectangle.endColumn / columns) * displayWidth;
    const top = -displayHeight / 2 + (rectangle.startRow / rows) * displayHeight;
    const bottom = -displayHeight / 2 + (rectangle.endRow / rows) * displayHeight;
    return {
      x: (left + right) / 2,
      y: (top + bottom) / 2,
      width: Math.max(1.5, right - left),
      height: Math.max(1.5, bottom - top),
    };
  });
}

/** 画像内の不透明領域から、描画範囲と高精細・CPU予測用の複合当たり判定を作る。 */
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
  let ellipseIntersection = 0;
  let ellipseUnion = 0;
  let opaquePixelCount = 0;
  const hullPoints = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const normalizedX = (((x - minX) + .5) / opaqueWidth) * 2 - 1;
      const normalizedY = (((y - minY) + .5) / opaqueHeight) * 2 - 1;
      const insideEllipse = normalizedX * normalizedX + normalizedY * normalizedY <= 1;
      const isOpaque = alpha[y * sourceWidth + x] >= 40;
      if (isOpaque) {
        opaquePixelCount += 1;
        const touchesTransparency = x === minX || x === maxX || y === minY || y === maxY
          || alpha[y * sourceWidth + Math.max(0, x - 1)] < 40
          || alpha[y * sourceWidth + Math.min(sourceWidth - 1, x + 1)] < 40
          || alpha[Math.max(0, y - 1) * sourceWidth + x] < 40
          || alpha[Math.min(sourceHeight - 1, y + 1) * sourceWidth + x] < 40;
        if (touchesTransparency) {
          hullPoints.push(
            { x, y }, { x: x + 1, y },
            { x: x + 1, y: y + 1 }, { x, y: y + 1 },
          );
        }
      }
      if (insideEllipse && isOpaque) ellipseIntersection += 1;
      if (insideEllipse || isOpaque) ellipseUnion += 1;
    }
  }
  const ellipseFit = ellipseUnion ? ellipseIntersection / ellipseUnion : 0;
  const sourceHull = createConvexHull(hullPoints);
  const hullArea = getPolygonArea(sourceHull);
  const convexity = hullArea ? Math.min(1, opaquePixelCount / hullArea) : 0;
  const scale = targetSize / Math.max(opaqueWidth, opaqueHeight);
  const width = clamp(opaqueWidth * scale, 30, targetSize);
  const height = clamp(opaqueHeight * scale, 30, targetSize);
  const convexHull = sourceHull.map(point => ({
    x: -width / 2 + ((point.x - minX) / opaqueWidth) * width,
    y: -height / 2 + ((point.y - minY) / opaqueHeight) * height,
  }));
  const collisionRects = createAlphaCollisionRectangles(
    alpha,
    sourceWidth,
    minX,
    minY,
    opaqueWidth,
    opaqueHeight,
    width,
    height,
  );
  const cpuCollisionRects = createAlphaCollisionRectangles(
    alpha,
    sourceWidth,
    minX,
    minY,
    opaqueWidth,
    opaqueHeight,
    width,
    height,
    10,
  );
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
    collisionRects,
    cpuCollisionRects,
    ellipseFit,
    convexity,
    convexHull,
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

export function createTowerBody({ id, monsterId, owner, profile, x, y = 48, angle = 0, useCoarseGeometry = false }) {
  const Matter = getMatter();
  if (Matter) return createMatterTowerBody({ id, monsterId, owner, profile, x, y, angle, useCoarseGeometry }, Matter);
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

function getStopperRectangles() {
  const { platform, stopper } = TOWER_WORLD;
  return [
    { x: platform.x, y: platform.y - stopper.height, width: stopper.width, height: stopper.height },
    {
      x: platform.x + platform.width - stopper.width,
      y: platform.y - stopper.height,
      width: stopper.width,
      height: stopper.height,
    },
  ];
}

export function createTowerWorld(bodies = [], options = {}) {
  const hasStoppers = Boolean(options.stoppers);
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
    const stopperBodies = hasStoppers
      ? getStopperRectangles().map((stopper, index) => Matter.Bodies.rectangle(
        stopper.x + stopper.width / 2,
        stopper.y + stopper.height / 2,
        stopper.width,
        stopper.height,
        {
          isStatic: true,
          friction: 1,
          frictionStatic: 1.3,
          restitution: .015,
          chamfer: { radius: 2 },
          label: `tower-stopper-${index === 0 ? 'left' : 'right'}`,
        },
      ))
      : [];
    const world = {
      bodies: [], elapsed: 0, engine, platformBody, stopperBodies, hasStoppers, usingMatter: true,
    };
    Matter.Composite.add(engine.world, [platformBody, ...stopperBodies]);
    bodies.forEach(body => addTowerBody(world, body));
    return world;
  }
  return { bodies: [...bodies], elapsed: 0, hasStoppers };
}

export function cloneTowerWorld(world, useCoarseGeometry = false) {
  if (world.usingMatter) {
    const Matter = getMatter();
    const clone = createTowerWorld([], { stoppers: world.hasStoppers });
    world.bodies.forEach(source => {
      const body = createMatterTowerBody({
        id: source.towerId,
        monsterId: source.monsterId,
        owner: source.owner,
        profile: source.profile,
        x: source.position.x,
        y: source.position.y,
        angle: source.angle,
        useCoarseGeometry,
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
    hasStoppers: world.hasStoppers,
    bodies: world.bodies.map(body => ({
      ...body,
      profile: {
        ...body.profile,
        crop: body.profile.crop ? { ...body.profile.crop } : undefined,
        parts: body.profile.parts.map(part => ({ ...part })),
        collisionRects: body.profile.collisionRects?.map(rectangle => ({ ...rectangle })),
        cpuCollisionRects: body.profile.cpuCollisionRects?.map(rectangle => ({ ...rectangle })),
        convexHull: body.profile.convexHull?.map(vertex => ({ ...vertex })),
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

function collideBodyWithRectangle(body, rectangle) {
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

function collideBodyWithPlatform(body, world) {
  collideBodyWithRectangle(body, TOWER_WORLD.platform);
  if (world.hasStoppers) {
    getStopperRectangles().forEach(rectangle => collideBodyWithRectangle(body, rectangle));
  }
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
    world.bodies.forEach(body => collideBodyWithPlatform(body, world));
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
  const center = TOWER_WORLD.width * .5;
  const centerDistance = Math.abs(body.x - center);
  const motion = getTowerMotion(world);
  const totalMass = world.bodies.reduce((sum, candidate) => sum + Math.max(.01, Number(candidate.mass) || 1), 0);
  const towerCenter = world.bodies.reduce(
    (sum, candidate) => sum + candidate.x * Math.max(.01, Number(candidate.mass) || 1),
    0,
  ) / totalMass;
  const bodySpeed = world.usingMatter
    ? body.speed * 60 + Math.abs(body.angularSpeed) * 1080
    : Math.hypot(body.vx, body.vy) + Math.abs(body.angularVelocity) * 18;
  const circles = body.profile.parts.map(part => getWorldCircle(body, part));
  const left = Math.min(...circles.map(circle => circle.x - circle.r));
  const right = Math.max(...circles.map(circle => circle.x + circle.r));
  const platformRight = TOWER_WORLD.platform.x + TOWER_WORLD.platform.width;
  const edgeOverhang = Math.max(0, TOWER_WORLD.platform.x - left) + Math.max(0, right - platformRight);
  return 3000
    - centerDistance * 1.15
    - Math.abs(towerCenter - center) * 2.1
    - motion * 8.5
    - bodySpeed * 5
    - edgeOverhang * 6;
}

function createCpuCandidates(range, options, rng) {
  const maxRotation = clamp(Number(options.maxRotation ?? Math.PI / 3), 0, Math.PI);
  if (!options.exhaustiveSearch) {
    const candidateCount = clamp(Math.floor(options.candidateCount || 10), 3, 36);
    const candidates = [{ x: TOWER_WORLD.width * .5, angle: 0 }];
    for (let index = 0; index < candidateCount; index += 1) {
      const fraction = candidateCount <= 1 ? .5 : index / (candidateCount - 1);
      const jitter = (rng() - .5) * ((range.max - range.min) / candidateCount) * .65;
      const x = clamp(range.min + (range.max - range.min) * fraction + jitter, range.min, range.max);
      const rotationStep = (index * 2) % 5;
      const angle = maxRotation === 0 ? 0 : ((rotationStep / 4) * 2 - 1) * maxRotation;
      candidates.push({ x, angle });
    }
    return candidates;
  }

  const positionCount = clamp(Math.floor(options.positionCount || 13), 5, 21);
  const angleCount = clamp(Math.floor(options.angleCount || 9), 3, 16);
  const candidates = [];
  for (let positionIndex = 0; positionIndex < positionCount; positionIndex += 1) {
    const positionFraction = positionIndex / (positionCount - 1);
    const x = range.min + (range.max - range.min) * positionFraction;
    for (let angleIndex = 0; angleIndex < angleCount; angleIndex += 1) {
      // ±πは同じ向きなので、全周探索時は終点を重複させない。
      const angleFraction = maxRotation === Math.PI
        ? angleIndex / angleCount
        : angleIndex / (angleCount - 1);
      candidates.push({ x, angle: -maxRotation + maxRotation * 2 * angleFraction });
    }
  }
  candidates.push({ x: TOWER_WORLD.width * .5, angle: 0 });
  return candidates;
}

function simulatePlacement(world, profile, candidate, options) {
  const simulation = cloneTowerWorld(world, options.useCoarseGeometry);
  const previewBody = addTowerBody(simulation, createTowerBody({
    id: options.id,
    monsterId: options.monsterId,
    owner: options.owner || 'cpu',
    profile,
    x: candidate.x,
    y: 48,
    angle: candidate.angle,
    useCoarseGeometry: options.useCoarseGeometry && simulation.usingMatter,
  }));
  let stableFrames = 0;
  for (let frame = 0; frame < options.frames; frame += 1) {
    stepTowerWorld(simulation, 1 / 60, 2);
    if (getFallenBodies(simulation).length) break;
    stableFrames = frame >= options.minimumFrames && getTowerMotion(simulation) < 3
      ? stableFrames + 1
      : 0;
    if (stableFrames >= options.requiredStableFrames) break;
  }
  const settledBody = simulation.bodies.find(body => body.id === previewBody.id);
  const fallenBodyIds = getFallenBodies(simulation).map(body => body.id);
  return {
    score: evaluateCpuResult(simulation, previewBody.id),
    x: settledBody?.x ?? candidate.x,
    y: settledBody?.y ?? 48,
    angle: settledBody?.angle ?? candidate.angle,
    fallenBodyIds,
  };
}

function simulateCpuCandidate(world, profile, candidate, options) {
  return simulatePlacement(world, profile, candidate, options).score;
}

/** プレイヤーの指定位置を短時間シミュレーションし、配置ガイド用の予測を返す。 */
export function getTowerPlacementGuide(world, profile, candidate, options = {}) {
  if (!world || !profile || !Number.isFinite(candidate?.x) || !Number.isFinite(candidate?.angle)) return null;
  const id = options.id || 'player-placement-guide';
  const result = simulatePlacement(world, profile, candidate, {
    id,
    monsterId: options.monsterId || id,
    owner: 'player',
    frames: clamp(Math.floor(options.simulationFrames || 180), 120, 360),
    minimumFrames: 60,
    requiredStableFrames: 30,
    useCoarseGeometry: options.useCoarseGeometry !== false,
  });
  const hasFall = result.fallenBodyIds.length > 0;
  return {
    x: result.x,
    y: result.y,
    angle: normalizeAngle(result.angle),
    score: result.score,
    risk: hasFall ? 'danger' : result.score < 2500 ? 'warning' : 'safe',
  };
}

/** 候補配置を内部シミュレーションし、CPUの落下位置と角度を返す。 */
export function chooseCpuPlacement(world, profile, options = {}) {
  const noise = Math.max(0, Number(options.noise ?? 40));
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const range = getDropRange(profile);
  const candidates = createCpuCandidates(range, options, rng);
  const simulationFrames = clamp(Math.floor(options.simulationFrames || 180), 120, 600);
  const scored = candidates.map((candidate, index) => ({
    ...candidate,
    score: simulateCpuCandidate(world, profile, candidate, {
      id: `cpu-preview-${index}`,
      monsterId: options.monsterId || `cpu-preview-${index}`,
      frames: simulationFrames,
      minimumFrames: Math.min(180, Math.floor(simulationFrames * .5)),
      requiredStableFrames: 45,
      useCoarseGeometry: true,
    }) + (rng() - .5) * noise,
  })).sort((first, second) => second.score - first.score);

  const refineCount = options.exhaustiveSearch
    ? clamp(Math.floor(options.refineCount || 8), 1, Math.min(16, scored.length))
    : 0;
  if (!refineCount || !world.usingMatter) return scored[0];

  const refineFrames = clamp(Math.floor(options.refineFrames || simulationFrames), simulationFrames, 900);
  return scored.slice(0, refineCount).map((candidate, index) => ({
    x: candidate.x,
    angle: candidate.angle,
    score: simulateCpuCandidate(world, profile, candidate, {
      id: `cpu-refine-${index}`,
      monsterId: options.monsterId || `cpu-refine-${index}`,
      frames: refineFrames,
      minimumFrames: Math.min(240, Math.floor(refineFrames * .5)),
      requiredStableFrames: 60,
      useCoarseGeometry: false,
    }),
  })).sort((first, second) => second.score - first.score)[0];
}
