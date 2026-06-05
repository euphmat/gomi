export const DUNGEONS = [
  {
    id         : 'slime_forest',
    name       : 'スライムの森',
    description: '初心者向けの安全な森。スライムが多数生息している。',
    image      : 'assets/dungeon/slime_forest.webp',
    isUnlocked : true,
    floors     : [
      { level: 1,  monsters: [
        { id: 'slime_blue', count: 1, weight: 50 },
        { id: 'slime_blue', count: 2, weight: 40 },
        { id: 'slime_red',  count: 1, weight: 10 }
      ]},
      { level: 2,  monsters: [
        { id: 'slime_red',  count: 2, weight: 70 },
        { id: 'slime_blue', count: 1, weight: 30 }
      ]},
      { level: 3,  monsters: [
        { id: 'slime',      count: 2, weight: 80 },
        { id: 'slime_red',  count: 1, weight: 20 }
      ]},
      { level: 4,  monsters: [
        { id: 'slime',      count: 3, weight: 70 },
        { id: 'slime_red',  count: 2, weight: 30 }
      ]},
      { level: 5,  monsters: [
        { id: 'slime',      count: 3, weight: 60 },
        { id: 'slime_red',  count: 2, weight: 40 }
      ]},
      { level: 6,  monsters: [
        { id: 'slime',      count: 3, weight: 50 },
        { id: 'slime_red',  count: 2, weight: 30 },
        { id: 'slime_blue', count: 1, weight: 20 }
      ]},
      { level: 7,  monsters: [
        { id: 'slime',      count: 3, weight: 50 },
        { id: 'slime_red',  count: 2, weight: 30 },
        { id: 'slime_blue', count: 2, weight: 20 }
      ]},
      { level: 8,  monsters: [
        { id: 'slime',      count: 4, weight: 50 },
        { id: 'slime_red',  count: 3, weight: 30 },
        { id: 'slime_blue', count: 2, weight: 20 }
      ]},
      { level: 9,  monsters: [
        { id: 'slime',      count: 4, weight: 40 },
        { id: 'slime_red',  count: 3, weight: 35 },
        { id: 'slime_blue', count: 2, weight: 25 }
      ]},
      { level: 10, monsters: [
        { id: 'slime',      count: 5, weight: 40 },
        { id: 'slime_red',  count: 3, weight: 35 },
        { id: 'slime_blue', count: 2, weight: 25 }
      ]}
    ]
  },
  {
    id         : 'goblin_cave',
    name       : 'ゴブリンの洞窟',
    description: '薄暗く危険な洞窟。',
    image      : '',
    isUnlocked : false,
    floors     : []
  },
  {
    id         : 'unknown_ruins',
    name       : '???',
    description: '未解放のエリア',
    image      : '',
    isUnlocked : false,
    floors     : []
  }
];
