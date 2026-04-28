# API.md

このドキュメントは、現在の `src/app/api/**/route.ts` と `src/lib/supabase.ts` の実装に基づくバックエンド API 仕様です。

## 共通仕様

- Base path: `/api`
- データ形式: 基本は JSON。`/api/gpt` は JSON、プレーンテキスト、`multipart/form-data` に対応します。
- 認証: ログインまたは登録成功時に HttpOnly Cookie を発行します。
- 認証が必要な API は `tabiquest-access-token` Cookie から Supabase Auth のユーザーを取得します。
- エラー形式: 多くの API は `{ "error": "message" }` を返します。`/api/gpt` は `{ "ok": false, "error": "message" }` です。

### 認証 Cookie

| Cookie | 用途 | 属性 |
| --- | --- | --- |
| `tabiquest-access-token` | Supabase access token | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=session.expires_in`, production では `Secure` |
| `tabiquest-refresh-token` | Supabase refresh token | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=30 days`, production では `Secure` |

現在の API には refresh token を使って access token を更新するエンドポイントはありません。

### 主な型

```ts
type Profile = {
  id: string;
  username: string;
  display_name: string;
};

type Trip = {
  id: string;
  trip_code: string;
  trip_name: string;
  trip_description: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

type Mission = {
  id: number;
  mission_id: string;
  mission_name: string;
  mission_description: string;
  access: 0 | 1;       // 0: 共通, 1: シークレット
  point: number;
  user_id: string;
  process: 0 | 1 | 2;  // 0: 未完了, 1: 実装上予約, 2: 完了
  mission_type: 0 | 1 | 2 | 3;
  extra_data: string | null;
  additional: string | null;
  created_at: string;
};

type RankingEntry = {
  user_id: string;
  username: string;
  display_name: string;
  points: number;
  completed_missions: number;
  is_me: boolean;
};
```

## エンドポイント一覧

| Method | Path | 認証 | 概要 |
| --- | --- | --- | --- |
| `POST` | `/api/signup` | 不要 | ユーザー登録し、ログイン Cookie を発行 |
| `POST` | `/api/login` | 不要 | ログインし、ログイン Cookie を発行 |
| `POST` | `/api/logout` | 不要 | ログイン Cookie を削除 |
| `GET` | `/api/me` | 必要 | 現在のプロフィール取得 |
| `POST` | `/api/trips/create` | 必要 | trip 作成、参加、ミッション生成 |
| `POST` | `/api/trips/join` | 必要 | 旅 ID で trip に参加、ミッション生成 |
| `GET` | `/api/trips/me` | 必要 | 現在参加中の trip 取得 |
| `POST` | `/api/trips/leave` | 必要 | trip 退出またはオーナーによる終了 |
| `POST` | `/api/trips/settlement/complete` | 必要 | 結算完了、ミッション削除、trip 参加解除 |
| `POST` | `/api/missions/create` | 必要 | 現在の trip のミッションを作成または取得 |
| `GET` | `/api/missions` | 必要 | 現在の trip と自分のミッション一覧取得 |
| `POST` | `/api/missions/complete` | 必要 | 自分のミッションを完了 |
| `POST` | `/api/missions/vote` | 必要 | 現在は常に 400 を返す旧投票 API |
| `GET` | `/api/ranking` | 必要 | 現在の trip のランキング取得 |
| `POST` | `/api/gpt` | 不要 | OpenAI で共通ミッション生成 |
| `GET` | `/api/test` | 不要 | Supabase 接続確認用 |

## Auth

### POST `/api/signup`

ユーザー登録後、自動ログインします。Supabase Auth には `username@tabiquest.local` の内部メールアドレスでユーザーを作成します。

Request:

```json
{
  "username": "taro_123",
  "displayName": "太郎",
  "password": "password123"
}
```

Validation:

- `username`: 3〜24文字の英小文字、数字、アンダースコア。内部的に trim と lowercase を行います。
- `displayName`: trim 後 1〜40文字。
- `password`: 8文字以上。

Response `200`:

```json
{
  "ok": true
}
```

主なエラー:

- `400`: 入力バリデーション失敗
- `500`: Supabase 設定不足、ユーザー作成失敗、プロフィール作成失敗など

### POST `/api/login`

Request:

```json
{
  "username": "taro_123",
  "password": "password123"
}
```

Response `200`:

```json
{
  "ok": true
}
```

主なエラー:

- `400`: username/password の形式不正
- Supabase Auth の認証失敗時は Supabase の status と message を返します。

### POST `/api/logout`

ログイン Cookie を `Max-Age=0` で削除します。

Response `200`:

```json
{
  "ok": true
}
```

### GET `/api/me`

Response `200`:

```json
{
  "profile": {
    "id": "uuid",
    "username": "taro_123",
    "display_name": "太郎"
  }
}
```

主なエラー:

- `401`: ログイン Cookie がない、またはユーザー取得不可
- `404`: プロフィールが見つからない

## Trips

### POST `/api/trips/create`

新しい trip を作成し、作成者をその trip に参加させます。作成後、作成者向けのミッションも生成します。

Request:

```json
{
  "tripName": "京都旅行",
  "tripDescription": "清水寺と祇園を中心に散策する"
}
```

Validation:

- `tripName`: trim 後に空でないこと。
- `tripDescription`: trim 後に空でないこと。
- ユーザーが既に active または settlement pending の trip に参加している場合は作成できません。

Response `200`:

```json
{
  "trip": {
    "id": "uuid",
    "trip_code": "123456789",
    "trip_name": "京都旅行",
    "trip_description": "清水寺と祇園を中心に散策する",
    "owner_user_id": "uuid",
    "created_at": "2026-04-28T00:00:00Z",
    "updated_at": "2026-04-28T00:00:00Z"
  },
  "missionGeneration": {
    "created": true,
    "missions": []
  }
}
```

補足:

- `trip_code` は 9桁数字です。
- 共通ミッションは OpenAI 生成を試み、失敗した場合は固定ミッションにフォールバックします。
- シークレットミッションは固定プールから 2件ランダム作成されます。

主なエラー:

- `400`: trip 名または説明が空
- `401`: 未ログイン
- `409`: 既に参加中の trip がある
- `500`: trip 作成、参加情報保存、ミッション生成などの失敗

### POST `/api/trips/join`

9桁の旅 ID で既存 trip に参加します。参加後、参加者向けのミッションを作成します。

Request:

```json
{
  "tripCode": "123-456-789"
}
```

Validation:

- `tripCode`: 空でないこと。空白とハイフンは除去されます。
- 正規化後は 9桁数字である必要があります。

Response `200`:

```json
{
  "trip": { "...": "Trip" },
  "missionGeneration": {
    "created": true,
    "missions": []
  }
}
```

補足:

- 参加者の共通ミッションは trip オーナーの共通ミッションからコピーされます。
- オーナーの共通ミッションが 3件未満の場合は `409` になります。

主なエラー:

- `400`: 旅 ID が空、または 9桁数字ではない
- `401`: 未ログイン
- `404`: 指定された旅が見つからない
- `409`: 既に参加中の trip がある、またはコピー元ミッション不足

### GET `/api/trips/me`

現在参加中で、結算待ちではない trip を返します。

Response `200`:

```json
{
  "trip": null
}
```

または:

```json
{
  "trip": { "...": "Trip" }
}
```

主なエラー:

- `401`: 未ログイン

### POST `/api/trips/leave`

現在の active trip から退出します。

- オーナーの場合: trip の全メンバーを `settlement_pending=true` にし、trip を終了状態にします。
- オーナー以外の場合: 自分だけ `settlement_pending=true` にします。

Request body: なし。

Response `200`:

```json
{
  "ended": true,
  "tripId": "uuid"
}
```

または:

```json
{
  "ended": false,
  "tripId": "uuid"
}
```

主なエラー:

- `401`: 未ログイン
- `403`: trip のメンバーではない
- `404`: 進行中の trip がない

### POST `/api/trips/settlement/complete`

結算待ちの trip について、現在ユーザーのミッションを削除し、`user_trips` から参加情報を削除します。全員が削除されると DB trigger により trip も削除されます。

Request body: なし。

Response `200`:

```json
{
  "ok": true
}
```

主なエラー:

- `401`: 未ログイン
- `404`: 結算対象の trip または参加情報がない
- `409`: trip がまだ結算対象ではない

## Missions

### POST `/api/missions/create`

現在参加中の trip に対して、自分のミッションを作成します。既にミッションがある場合は新規作成せず既存ミッションを返します。

Request body: なし。

Response `200`:

```json
{
  "trip": { "...": "Trip" },
  "missionGeneration": {
    "created": true,
    "missions": []
  }
}
```

`missionGeneration.created` は、新規作成した場合 `true`、既存ミッションを返した場合 `false` です。

主なエラー:

- `401`: 未ログイン
- `404`: 参加中の trip がない
- `409`: 参加者がオーナー共通ミッションをコピーする際、コピー元が不足している

### GET `/api/missions`

現在参加中の trip と、自分のミッション一覧を返します。参加中の trip がない場合は空配列です。

Response `200`:

```json
{
  "trip": { "...": "Trip" },
  "missions": [
    {
      "id": 1,
      "mission_id": "uuid",
      "mission_name": "旅先らしい写真を撮る",
      "mission_description": "旅先の雰囲気が伝わる写真を撮って、グループ内で共有する。",
      "access": 0,
      "point": 100,
      "user_id": "uuid",
      "process": 0,
      "mission_type": 2,
      "extra_data": null,
      "additional": "{\"generation_mode\":\"fixed\",\"generation_source\":\"fixed_common_default\",\"trip_id\":\"uuid\"}",
      "created_at": "2026-04-28T00:00:00Z"
    }
  ]
}
```

補足:

- ミッションは `access ASC, mission_id ASC` で並びます。
- オーナーの既存共通ミッションが古い生成形式で、完了済みミッションがない場合、一覧取得時にミッションを再生成する処理があります。

主なエラー:

- `401`: 未ログイン

### POST `/api/missions/complete`

自分のミッションを完了状態にします。

Request:

```json
{
  "missionId": "1",
  "extraData": {
    "photoUrl": "https://example.com/photo.jpg"
  },
  "additional": {
    "memo": "達成メモ"
  }
}
```

Request fields:

- `missionId`: 必須。実装上は `mission.id` の値を文字列として受け取ります。
- `extraData`: 任意。指定されると JSON 文字列化して `extra_data` に保存します。未指定の場合は既存値を維持します。
- `additional`: 任意。オブジェクトの場合のみ既存 `additional` にマージされます。

Response `200`:

```json
{
  "mission": { "...": "Mission" }
}
```

保存時の変更:

- `process` を `2` に更新します。
- `additional.completed_by` に現在ユーザー ID を保存します。
- `additional.completed_at` に ISO timestamp を保存します。

主なエラー:

- `400`: `missionId` がない
- `401`: 未ログイン
- `403`: 自分のミッションではない、または active trip がない
- `404`: ミッションが見つからない
- `409`: 既に完了済み

### POST `/api/missions/vote`

旧投票 API です。現在の実装では常に `400` を返します。

Request:

```json
{
  "missionId": "1",
  "approved": true
}
```

Response `400`:

```json
{
  "error": "現在は投票ではなく完了ボタンでミッションを完了してください。"
}
```

## Ranking

### GET `/api/ranking`

現在参加中で、結算待ちではない trip のランキングを返します。

Response `200`:

```json
{
  "trip": { "...": "Trip" },
  "ranking": [
    {
      "user_id": "uuid",
      "username": "taro_123",
      "display_name": "太郎",
      "points": 150,
      "completed_missions": 3,
      "is_me": true
    }
  ]
}
```

補足:

- `process=2` のミッションだけを集計します。
- point の降順、同点の場合は `display_name` の昇順で並びます。
- active trip がない場合は `{ "trip": null, "ranking": [] }` を返します。
- 結算画面のランキングは API route ではなく、Server Component から `getSettlementRankingForUser()` を直接呼んでいます。

主なエラー:

- `401`: 未ログイン

## GPT

### POST `/api/gpt`

旅行名や自由記述から OpenAI API でミッションを生成します。

対応 Content-Type:

- `application/json`
- `multipart/form-data`
- その他: request body をプレーンテキストとして扱う

JSON Request:

```json
{
  "tripTitle": "京都旅行",
  "travelNotes": "清水寺、祇園、抹茶スイーツを楽しむ",
  "missionCount": 3
}
```

`travelNotes` の代替キーとして、`notes`, `description`, `text`, `body`, `content`, `memo`, `freeText`, `tripTitle`, `title` なども入力テキスト抽出対象です。

Multipart Request:

- `file`: 任意。指定された場合、ファイル本文を自由記述として扱います。
- `tripTitle`: 任意。
- `missionCount`: 任意。数値化して使用します。

Response `200`:

```json
{
  "ok": true,
  "missions": [
    {
      "missionName": "旅先らしい写真を撮る",
      "description": "旅先の雰囲気が伝わる写真を撮る。",
      "type1": "共通ミッション",
      "points": 20,
      "type2": "",
      "additional": ["2", "", ""]
    }
  ]
}
```

補足:

- `missionCount` は 1〜10 に丸められます。未指定や不正値は 3 です。
- `/api/gpt` と、GPT 生成を伴う `/api/trips/create`, `/api/missions/create` は Route Handler の最大実行時間を 60 秒に設定しています。
- OpenAI model は `OPENAI_MODEL` があればそれを使い、未指定時は `gpt-4.1-mini` です。
- API key は `src/lib/gpt/.openai.key` を優先し、なければ `OPENAI_API_KEY` を使います。
- 生成結果の `points` は `10, 20, 30, 40, 50` のいずれかである必要があります。
- `additional[0]` はクリア方法です。`0`: そのまま完了、`1`: 投票、`2`: 写真付き投票、`3`: 実装上許容。

Response `500`:

```json
{
  "ok": false,
  "error": "ミッション生成に失敗しました。"
}
```

## Test

### GET `/api/test`

Supabase 接続確認用 API です。`test` table の `id=1` から `name` を取得します。

Response `200`:

```json
{
  "name": "player name"
}
```

主なエラー:

- `500`: Supabase 設定不足、または Supabase fetch 失敗
- `404`: `test` table の `id=1` に行がない

## データベース上の主な制約

- `profiles.username` は unique。
- `trips.trip_code` は unique。
- `user_trips` は `(user_id, trip_id)` が primary key。
- `mission.access` は `0 | 1`。
- `mission.process` は `0 | 1 | 2`。
- `mission.mission_type` は `0 | 1 | 2 | 3`。
- `mission.point` は `0..1000`。
- `user_trips` から最後の参加者が削除されると、trigger により対応する `trips` も削除されます。
