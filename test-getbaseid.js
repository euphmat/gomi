function getBaseId(id) {
  const lastUnderscore = id.lastIndexOf('_');
  if (lastUnderscore > 0) {
    const suffix = id.substring(lastUnderscore + 1);
    if (suffix.length >= 4 && /^[a-z0-9]+$/.test(suffix) && suffix !== 'ring') {
      return id.substring(0, lastUnderscore);
    }
  }
  return id;
}

console.log(getBaseId("slime_blue_ring_lqwe1234abcd"));
console.log(getBaseId("slime_blue_ring"));
console.log(getBaseId("slime_blue_ring_abcd"));
