export const DUNGEONS = [{
    id: 'slime_forest',
    name: 'スライムの森',
    description: '初心者向けの安全な森。スライムが多数生息している。',
    image: 'assets/dungeon/slime_forest.webp',
    isUnlocked: true,
    floors: [ {
        level: 1,
        monsters: [
          { slime_blue:  1,                 weight: 50 },
          { slime_blue:  2,                 weight: 40 },
          { slime_blue:  1, slime_green: 1, weight: 9 },
          { slime_green: 2,                 weight: 1 }
        ] }, {
        level: 2,
        monsters: [
          { slime_green: 1, slime_blue: 1, weight: 60 },
          { slime_green: 2,                weight: 20 },
          { slime_green: 1, slime_red: 1,  weight: 20 }
        ]
      },
      {
        level: 3,
        monsters: [
          { slime_red: 2, weight: 50 },
          { slime_red: 3, weight: 20 },
          { slime_red: 1, weight: 30 }
        ]
      },
      {
        level: 4,
        monsters: [{
            slime: 3,
            weight: 50
          },
          {
            slime: 2,
            slime_red: 1,
            weight: 30
          },
          {
            slime_blue: 2,
            slime_red: 2,
            weight: 20
          }
        ]
      },
      {
        level: 5,
        monsters: [{
            slime: 3,
            weight: 40
          },
          {
            slime: 2,
            slime_red: 2,
            weight: 40
          },
          {
            slime: 1,
            slime_red: 1,
            slime_blue: 2,
            weight: 20
          }
        ]
      },
      {
        level: 6,
        monsters: [{
            slime: 4,
            weight: 30
          },
          {
            slime: 3,
            slime_red: 1,
            weight: 40
          },
          {
            slime: 2,
            slime_red: 1,
            slime_blue: 1,
            weight: 30
          }
        ]
      },
      {
        level: 7,
        monsters: [{
            slime: 3,
            slime_red: 2,
            weight: 40
          },
          {
            slime: 2,
            slime_red: 2,
            slime_blue: 1,
            weight: 40
          },
          {
            slime_red: 4,
            weight: 20
          }
        ]
      },
      {
        level: 8,
        monsters: [{
            slime: 4,
            slime_red: 1,
            weight: 30
          },
          {
            slime: 2,
            slime_red: 2,
            slime_blue: 2,
            weight: 50
          },
          {
            slime_blue: 5,
            weight: 20
          }
        ]
      },
      {
        level: 9,
        monsters: [{
            slime: 3,
            slime_red: 3,
            weight: 40
          },
          {
            slime: 2,
            slime_red: 3,
            slime_blue: 2,
            weight: 40
          },
          {
            slime: 5,
            weight: 20
          }
        ]
      },
      {
        level: 10,
        monsters: [{
            slime: 4,
            slime_red: 2,
            weight: 30
          },
          {
            slime: 3,
            slime_red: 3,
            slime_blue: 2,
            weight: 50
          },
          {
            slime: 2,
            slime_red: 4,
            weight: 20
          }
        ]
      }
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