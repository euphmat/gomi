export const DUNGEONS = [
  {
    id: 'slime_forest',
    name: 'スライムの森',
    description: '初心者向けの安全な森。スライムが多数生息している。',
    image: 'assets/dungeon/slime_forest.webp',
    isUnlocked: true,
    floors: [
      { level: 1,  monsters: ['slime', 'slime'] },
      { level: 2,  monsters: ['slime', 'slime'] },
      { level: 3,  monsters: ['slime', 'slime'] },
      { level: 4,  monsters: ['slime', 'slime', 'slime'] },
      { level: 5,  monsters: ['slime', 'slime', 'slime'] },
      { level: 6,  monsters: ['slime', 'slime', 'slime'] },
      { level: 7,  monsters: ['slime', 'slime', 'slime'] },
      { level: 8,  monsters: ['slime', 'slime', 'slime', 'slime'] },
      { level: 9,  monsters: ['slime', 'slime', 'slime', 'slime'] },
      { level: 10, monsters: ['slime', 'slime', 'slime', 'slime', 'slime'] }
    ]
  },
  {
    id: 'goblin_cave',
    name: 'ゴブリンの洞窟',
    description: '薄暗く危険な洞窟。',
    image: '',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'unknown_ruins',
    name: '???',
    description: '未解放のエリア',
    image: '',
    isUnlocked: false,
    floors: []
  }
];
