/**

 * このファイルは「ダンジョン」画面の中身を作って表示するためのファイルです。
 * 現在はまだ準備中のため、仮の画面が表示されるようになっています。
 *
 * Dungeon Page (Placeholder)
 */
export function renderDungeonPage() {
  return `
    <div class="flex flex-col items-center justify-center h-full gap-4 p-6">
      <span class="material-symbols-outlined text-6xl text-gray-600">castle</span>
      <h2 class="text-xl font-bold text-gray-400">Dungeon</h2>
      <p class="text-sm text-gray-600 text-center">ダンジョン画面は準備中です</p>
      <div class="w-16 h-0.5 rounded-full bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
    </div>
  `;
}
