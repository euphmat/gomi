# Firebase クラウドセーブ設定

通常のゲーム進行は従来どおり端末内の IndexedDB へ保存されます。ログイン済みの場合は、その日の最初の起動時にクラウドを1回確認して安全なら自動保存します。設定画面の「クラウドへ保存」「クラウドから復元」も手動で利用できます。

## 1. Firebase プロジェクトとWebアプリを作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成します（Sparkプランで利用できます）。
2. 「プロジェクトの設定」→「マイアプリ」からWebアプリを追加します。
3. 表示された `firebaseConfig` の値を [js/firebase-config.js](js/firebase-config.js) へコピーします。

FirebaseのWeb設定値（APIキーを含む）はクライアントに配布する識別情報であり、秘密鍵ではありません。実際のアクセス制御はAuthenticationとFirestoreセキュリティルールで行います。

## 2. ログイン方法を有効化

Firebase Consoleの「Authentication」→「ログイン方法」で、次を有効にします。

- メール／パスワード
- Google

GitHub Pagesなど独自の公開先を使う場合は、Authenticationの「設定」→「承認済みドメイン」に公開先のドメイン（例: `euphmat.github.io`）も追加してください。

## 3. Cloud Firestoreとルールを設定

1. Firebase ConsoleでCloud Firestoreデータベースを作成します。本番環境モードを選びます。
2. Consoleの「ルール」に [firestore.rules](firestore.rules) の内容を貼り付けて公開します。

Firebase CLIを使う場合は、プロジェクトを選択したうえで次のコマンドでも反映できます。

```sh
firebase deploy --only firestore:rules
```

ルールにより、メール確認済みのログインユーザーは `/cloudSaves/{自分のUID}` の1件だけを取得・上書きできます。Googleログインは確認済みとして扱われます。他ユーザーのセーブ、一覧取得、削除は拒否されます。

## 通信量の考え方

- 「クラウドへ保存」1回につき、Firestoreのドキュメント書き込み1回
- 「クラウドから復元」1回につき、ドキュメント読み取り1回
- ログイン中は、その日の初回起動時に読み取り1回と、競合がなければ書き込み1回
- 同じ日の2回目以降の起動では、自動のFirestore読み書きはなし
- 別端末で更新されたセーブを検出した場合、自動上書きは行わない
- 定期同期・自動復元はなし
- セーブデータはgzip圧縮し、1ユーザーにつき最新の1件だけを保持
- 850,000文字を超える圧縮済みデータはクライアントとルールの両方で拒否

3人程度の利用なら、起動時の自動処理は最大で通常1日3読み取り・3書き込みです。利用状況はFirebase Consoleの「使用量」画面で定期的に確認してください。
