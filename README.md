# 台湾ミッション図鑑

台湾旅行のミッションを達成して、写真やメモと一緒にシールを集めるiPhoneアプリです。

[App Storeで見る](https://apps.apple.com/jp/app/id6772893865)

## 技術構成

TypeScript、React、Vite、Tailwind CSS、Capacitor。認証・同期にFirebase、購入処理にRevenueCatを使用しています。

## 実装

- [src/app/App.tsx](src/app/App.tsx)
- [src/styles/theme.css](src/styles/theme.css)

## 開発環境での起動

ブラウザではゲストモードを確認できます。認証・クラウド同期・課金を使う場合は.env.exampleを.envにコピーし、自身のFirebase・RevenueCatの公開用設定を入力してください。iOSではGoogleService-Info.plistをios/App/App/に置き、Info.plistに自身のURLスキーム、capacitor.config.jsonのplugins.FirebaseAuthentication.google.clientIdに自身のOAuthクライアントIDを指定します。npm run cap:syncの後、npm run ios:openで署名を設定します。

```sh
npm ci
npm run dev
```

このリポジトリは開発版のソースをポートフォリオ用に整理したものです。
