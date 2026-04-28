import "server-only";

import { cookies } from "next/headers";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const internalEmailDomain = "tabiquest.local";

export const accessTokenCookieName = "tabiquest-access-token";
export const refreshTokenCookieName = "tabiquest-refresh-token";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
};

export type Trip = {
  id: string;
  trip_code: string;
  trip_name: string;
  trip_description: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

export type MissionAccess = 0 | 1;
export type MissionProcess = 0 | 1 | 2;
export type MissionType = 0 | 1 | 2 | 3;
type JsonObject = Record<string, unknown>;

export type Mission = {
  id: number;
  mission_id: string;
  mission_name: string;
  mission_description: string;
  access: MissionAccess;
  point: number;
  user_id: string;
  process: MissionProcess;
  mission_type: MissionType;
  extra_data: string | null;
  additional: string | null;
  created_at: string;
};

export type MissionGenerationResult = {
  created: boolean;
  missions: Mission[];
};

export type RankingEntry = {
  user_id: string;
  username: string;
  display_name: string;
  points: number;
  completed_missions: number;
  is_me: boolean;
};

type UserTrip = {
  user_id: string;
  trip_id: string;
  settlement_pending: boolean;
  created_at: string;
};

export type PendingSettlement = {
  membership: UserTrip;
  trip: Trip;
};

type TripMembership = {
  membership: UserTrip;
  trip: Trip;
};

type AuthUser = {
  id: string;
  email?: string;
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
};

type CreateUserResponse = {
  user: AuthUser;
};

type MissionDraft = {
  mission_id?: string;
  mission_name: string;
  mission_description: string;
  access: MissionAccess;
  point: number;
  process: MissionProcess;
  mission_type: MissionType;
  extra_data?: JsonObject | string | null;
  additional?: JsonObject | string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new ApiError(
      "Supabase environment variables are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY, or their NEXT_PUBLIC_* equivalents.",
      500,
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseServiceRoleKey() {
  if (!supabaseServiceRoleKey) {
    throw new ApiError(
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side signup flows.",
      500,
    );
  }

  return supabaseServiceRoleKey;
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string) {
  const normalizedUsername = normalizeUsername(username);

  if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
    throw new ApiError(
      "ユーザー名は3〜24文字の英小文字・数字・アンダースコアで入力してください。",
      400,
    );
  }

  return normalizedUsername;
}

export function validatePassword(password: string) {
  if (password.length < 8) {
    throw new ApiError("パスワードは8文字以上で入力してください。", 400);
  }

  return password;
}

export function validateDisplayName(displayName: string) {
  const normalizedDisplayName = displayName.trim();

  if (normalizedDisplayName.length < 1 || normalizedDisplayName.length > 40) {
    throw new ApiError("表示名は1〜40文字で入力してください。", 400);
  }

  return normalizedDisplayName;
}

export function usernameToEmail(username: string) {
  return `${validateUsername(username)}@${internalEmailDomain}`;
}

function normalizeTripCode(tripCode: string) {
  return tripCode.replace(/[\s-]/g, "");
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeJsonObject(value: unknown, fallback: JsonObject = {}) {
  return isJsonObject(value) ? value : fallback;
}

function stringifyMissionText(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(normalizeJsonObject(value));
}

function parseMissionText(value: string | null) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return normalizeJsonObject(parsed);
  } catch {
    return {};
  }
}

function requireUserId(user: AuthUser | null | undefined, message: string) {
  if (!user?.id) {
    throw new ApiError(message, 500);
  }

  return user.id;
}

function buildHeaders(
  key: string,
  accessToken?: string,
  headers?: HeadersInit,
) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("apikey", key);
  requestHeaders.set("Authorization", `Bearer ${accessToken ?? key}`);

  return requestHeaders;
}

async function readErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const data = (await response.json()) as {
      msg?: string;
      error_description?: string;
      error?: string;
      message?: string;
    };

    return (
      data.msg ??
      data.error_description ??
      data.message ??
      data.error ??
      fallbackMessage
    );
  } catch {
    return fallbackMessage;
  }
}

async function ensureResponseOk(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    const message = await readErrorMessage(response, fallbackMessage);
    throw new ApiError(message, response.status);
  }
}

export async function supabaseRestFetch(
  path: string,
  init: RequestInit = {},
  options?: {
    useServiceRole?: boolean;
    accessToken?: string;
  },
) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const key = options?.useServiceRole
    ? getSupabaseServiceRoleKey()
    : supabaseAnonKey;

  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: buildHeaders(key, options?.accessToken, init.headers),
    cache: "no-store",
  });
}

export async function supabaseAuthFetch(
  path: string,
  init: RequestInit = {},
  options?: {
    useServiceRole?: boolean;
    accessToken?: string;
  },
) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const key = options?.useServiceRole
    ? getSupabaseServiceRoleKey()
    : supabaseAnonKey;

  return fetch(`${supabaseUrl}/auth/v1/${path}`, {
    ...init,
    headers: buildHeaders(key, options?.accessToken, init.headers),
    cache: "no-store",
  });
}

export async function signInWithUsernamePassword(
  username: string,
  password: string,
) {
  const normalizedUsername = validateUsername(username);
  const validPassword = validatePassword(password);

  const response = await supabaseAuthFetch("token?grant_type=password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: usernameToEmail(normalizedUsername),
      password: validPassword,
    }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(
      response,
      "ログインに失敗しました。",
    );
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as AuthSession;
}

async function createAuthUser(username: string, password: string) {
  const response = await supabaseAuthFetch(
    "admin/users",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: usernameToEmail(username),
        password,
        email_confirm: true,
      }),
    },
    { useServiceRole: true },
  );

  if (!response.ok) {
    const message = await readErrorMessage(
      response,
      "ユーザー作成に失敗しました。",
    );
    throw new ApiError(message, response.status);
  }

  const data = (await response.json()) as CreateUserResponse | AuthUser;
  const user = "user" in data ? data.user : data;
  requireUserId(user, "Supabase からユーザーIDを取得できませんでした。");

  return user;
}

async function deleteAuthUser(userId: string) {
  await supabaseAuthFetch(
    `admin/users/${userId}`,
    {
      method: "DELETE",
    },
    { useServiceRole: true },
  );
}

async function createProfile(profile: Profile) {
  const response = await supabaseRestFetch(
    "profiles",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    },
    { useServiceRole: true },
  );

  if (!response.ok) {
    const message = await readErrorMessage(
      response,
      "プロフィール作成に失敗しました。",
    );
    throw new ApiError(message, response.status);
  }
}

export async function signUpWithProfile(input: {
  username: string;
  displayName: string;
  password: string;
}) {
  const username = validateUsername(input.username);
  const displayName = validateDisplayName(input.displayName);
  const password = validatePassword(input.password);

  const user = await createAuthUser(username, password);
  const userId = requireUserId(
    user,
    "登録直後のユーザーIDを取得できませんでした。",
  );

  try {
    await createProfile({
      id: userId,
      username,
      display_name: displayName,
    });
  } catch (error) {
    await deleteAuthUser(userId);
    throw error;
  }

  const session = await signInWithUsernamePassword(username, password);
  requireUserId(
    session.user,
    "ログインセッションからユーザーIDを取得できませんでした。",
  );

  return session;
}

export async function getAuthUser(accessToken: string) {
  const response = await supabaseAuthFetch(
    "user",
    {
      method: "GET",
    },
    { accessToken },
  );

  if (!response.ok) {
    const message = await readErrorMessage(
      response,
      "ログイン情報を確認できませんでした。",
    );
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as AuthUser;
}

export async function getProfileById(id: string) {
  const response = await supabaseRestFetch(
    `profiles?select=id,username,display_name&id=eq.${encodeURIComponent(id)}&limit=1`,
    {},
    { useServiceRole: true },
  );

  if (!response.ok) {
    const message = await readErrorMessage(
      response,
      "プロフィール取得に失敗しました。",
    );
    throw new ApiError(message, response.status);
  }

  const rows = (await response.json()) as Profile[];
  const profile = rows[0];

  if (!profile) {
    throw new ApiError("プロフィールが見つかりません。", 404);
  }

  return profile;
}

export async function getTripById(id: string) {
  const response = await supabaseRestFetch(
    `trips?select=id,trip_code,trip_name,trip_description,owner_user_id,created_at,updated_at&id=eq.${encodeURIComponent(id)}&limit=1`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "trip の取得に失敗しました。");

  const rows = (await response.json()) as Trip[];
  const trip = rows[0];

  if (!trip) {
    throw new ApiError("指定された trip が見つかりません。", 404);
  }

  return trip;
}

export async function getTripByCode(tripCode: string) {
  const normalizedCode = normalizeTripCode(tripCode);

  if (!/^\d{9}$/.test(normalizedCode)) {
    throw new ApiError("旅 ID は9桁の数字で入力してください。", 400);
  }

  const response = await supabaseRestFetch(
    `trips?select=id,trip_code,trip_name,trip_description,owner_user_id,created_at,updated_at&trip_code=eq.${encodeURIComponent(normalizedCode)}&limit=1`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "旅 ID の確認に失敗しました。");

  const rows = (await response.json()) as Trip[];
  const trip = rows[0];

  if (!trip) {
    throw new ApiError("指定された旅が見つかりません。", 404);
  }

  return trip;
}

async function getTripMembershipForUser(
  userId: string,
  options?: {
    settlementPending?: boolean;
  },
) {
  const settlementFilter =
    typeof options?.settlementPending === "boolean"
      ? `&settlement_pending=eq.${options.settlementPending}`
      : "";

  const membershipResponse = await supabaseRestFetch(
    `user_trips?select=user_id,trip_id,settlement_pending,created_at&user_id=eq.${encodeURIComponent(userId)}${settlementFilter}&order=created_at.asc&limit=1`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(
    membershipResponse,
    "参加中の trip の確認に失敗しました。",
  );

  const memberships = (await membershipResponse.json()) as UserTrip[];
  const membership = memberships[0];

  if (!membership) {
    return null;
  }

  const trip = await getTripById(membership.trip_id);

  return {
    membership,
    trip,
  } satisfies TripMembership;
}

export async function getTripForUser(userId: string) {
  const activeMembership = await getTripMembershipForUser(userId, {
    settlementPending: false,
  });

  return activeMembership?.trip ?? null;
}

async function getAnyTripForUser(userId: string) {
  const membership = await getTripMembershipForUser(userId);
  return membership?.trip ?? null;
}

export async function getPendingSettlementForUser(userId: string) {
  const membership = await getTripMembershipForUser(userId, {
    settlementPending: true,
  });

  if (!membership) {
    return null;
  }

  return membership satisfies PendingSettlement;
}

async function addUserToTrip(userId: string, tripId: string) {
  const response = await supabaseRestFetch(
    "user_trips",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        trip_id: tripId,
        settlement_pending: false,
      }),
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "trip への参加情報を保存できませんでした。");

  const rows = (await response.json()) as UserTrip[];
  return rows[0];
}

async function removeUserFromTrip(userId: string, tripId: string) {
  const response = await supabaseRestFetch(
    `user_trips?user_id=eq.${encodeURIComponent(userId)}&trip_id=eq.${encodeURIComponent(tripId)}`,
    {
      method: "DELETE",
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "trip からの退出に失敗しました。");
}

async function deleteMissionsForUser(userId: string) {
  const response = await supabaseRestFetch(
    `mission?user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "ミッションの削除に失敗しました。");
}

async function markSettlementPendingForTrip(tripId: string) {
  const response = await supabaseRestFetch(
    `user_trips?trip_id=eq.${encodeURIComponent(tripId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settlement_pending: true,
      }),
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "trip の終了処理に失敗しました。");
}

async function markSettlementPendingForUser(userId: string, tripId: string) {
  const response = await supabaseRestFetch(
    `user_trips?user_id=eq.${encodeURIComponent(userId)}&trip_id=eq.${encodeURIComponent(tripId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settlement_pending: true,
      }),
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "trip 退出処理に失敗しました。");
}

async function generateUniqueTripCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${Math.floor(Math.random() * 1_000_000_000)}`.padStart(
      9,
      "0",
    );

    const response = await supabaseRestFetch(
      `trips?select=id&trip_code=eq.${candidate}&limit=1`,
      {},
      { useServiceRole: true },
    );

    await ensureResponseOk(response, "旅 ID の生成に失敗しました。");

    const rows = (await response.json()) as Array<{ id: string }>;

    if (!rows[0]) {
      return candidate;
    }
  }

  throw new ApiError("利用可能な旅 ID を生成できませんでした。", 500);
}

function getMissionSelectQuery() {
  return [
    "id",
    "mission_id",
    "mission_name",
    "mission_description",
    "access",
    "point",
    "user_id",
    "process",
    "mission_type",
    "extra_data",
    "additional",
    "created_at",
  ].join(",");
}

function createMissionGroupId() {
  return crypto.randomUUID();
}

function pickRandomMissionDrafts(drafts: MissionDraft[], count: number) {
  return [...drafts]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((draft) => ({
      ...draft,
      mission_id: draft.mission_id ?? createMissionGroupId(),
      extra_data: draft.extra_data,
      additional: draft.additional,
    }));
}

function getDefaultCommonMissionDrafts(): MissionDraft[] {
  return [
    {
      mission_id: createMissionGroupId(),
      mission_name: "旅先らしい写真を撮る",
      mission_description:
        "旅先の雰囲気が伝わる写真を撮って、グループ内で共有する。",
      access: 0,
      point: 100,
      process: 0,
      mission_type: 2,
    },
    {
      mission_id: createMissionGroupId(),
      mission_name: "地元のおすすめを聞く",
      mission_description:
        "店員さんや地元の人におすすめを聞き、次の行き先や食べ物の参考にする。",
      access: 0,
      point: 120,
      process: 0,
      mission_type: 0,
    },
  ];
}

function getDefaultSecretMissionPool(): MissionDraft[] {
  return [
    {
      mission_name: "仲間を自然に褒める",
      mission_description:
        "自分のミッションだと気づかれないように、旅の途中で仲間を一度褒める。",
      access: 1,
      point: 200,
      process: 0,
      mission_type: 0,
    },
    {
      mission_name: "予定にない寄り道を提案する",
      mission_description:
        "安全な範囲で、予定にない道や店を一つ提案する。採用されたら達成。",
      access: 1,
      point: 220,
      process: 0,
      mission_type: 1,
    },
    {
      mission_name: "旅先の小さな発見を共有する",
      mission_description:
        "看板、景色、音、匂いなど、気づいた小さな発見を自然に話題にする。",
      access: 1,
      point: 180,
      process: 0,
      mission_type: 0,
    },
    {
      mission_name: "誰かの荷物をさりげなく手伝う",
      mission_description:
        "移動中や休憩時に、相手に気を遣わせない形で荷物運びや整理を手伝う。",
      access: 1,
      point: 160,
      process: 0,
      mission_type: 0,
    },
    {
      mission_name: "旅のベスト瞬間を聞き出す",
      mission_description:
        "ミッションだと気づかれないように、参加者の誰かから今日一番よかった瞬間を聞き出す。",
      access: 1,
      point: 180,
      process: 0,
      mission_type: 0,
    },
    {
      mission_name: "写真係を自然に引き受ける",
      mission_description:
        "集合写真や食事の写真など、誰かが撮りたいと思う場面で自然に撮影役を引き受ける。",
      access: 1,
      point: 170,
      process: 0,
      mission_type: 2,
    },
    {
      mission_name: "次の目的地の豆知識を話す",
      mission_description:
        "移動中に、次の目的地や周辺に関する小さな豆知識を自然に会話へ混ぜる。",
      access: 1,
      point: 190,
      process: 0,
      mission_type: 0,
    },
  ];
}

function getDefaultSecretMissionDrafts(): MissionDraft[] {
  return pickRandomMissionDrafts(getDefaultSecretMissionPool(), 2);
}

async function insertMissionDrafts(input: {
  trip: Trip;
  userId: string;
  drafts: MissionDraft[];
  generationSource: string;
}) {
  const rows = input.drafts.map((draft) => ({
    mission_id: draft.mission_id ?? createMissionGroupId(),
    mission_name: draft.mission_name.trim(),
    mission_description: draft.mission_description.trim(),
    access: draft.access,
    point: draft.point,
    user_id: input.userId,
    process: draft.process,
    mission_type: draft.mission_type,
    extra_data: stringifyMissionText(draft.extra_data),
    additional: stringifyMissionText({
      ...normalizeJsonObject(draft.additional),
      generation_mode: "fixed",
      generation_source: input.generationSource,
      trip_id: input.trip.id,
    }),
  }));

  const response = await supabaseRestFetch(
    "mission",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(rows),
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "ミッションの作成に失敗しました。");

  return (await response.json()) as Mission[];
}

function missionToDraft(mission: Mission): MissionDraft {
  return {
    mission_id: mission.mission_id,
    mission_name: mission.mission_name,
    mission_description: mission.mission_description,
    access: mission.access,
    point: mission.point,
    process: 0,
    mission_type: mission.mission_type,
    extra_data: mission.extra_data,
    additional: mission.additional,
  };
}

export async function getMissionsForTripUser(input: {
  tripId: string;
  userId: string;
}) {
  const response = await supabaseRestFetch(
    `mission?select=${getMissionSelectQuery()}&user_id=eq.${encodeURIComponent(input.userId)}&order=access.asc,mission_id.asc`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "ミッション一覧の取得に失敗しました。");

  return (await response.json()) as Mission[];
}

async function getCommonMissionsForTripOwner(trip: Trip) {
  const missions = await getMissionsForTripUser({
    tripId: trip.id,
    userId: trip.owner_user_id,
  });

  return missions.filter((mission) => mission.access === 0).slice(0, 2);
}

export async function createMissionsForTripUser(input: {
  trip: Trip;
  userId: string;
  copyCommonFromOwner?: boolean;
}): Promise<MissionGenerationResult> {
  const existingMissions = await getMissionsForTripUser({
    tripId: input.trip.id,
    userId: input.userId,
  });

  if (existingMissions.length > 0) {
    return {
      created: false,
      missions: existingMissions,
    };
  }

  const commonDrafts = input.copyCommonFromOwner
    ? (await getCommonMissionsForTripOwner(input.trip)).map(missionToDraft)
    : getDefaultCommonMissionDrafts();
  const secretDrafts = getDefaultSecretMissionDrafts();

  if (input.copyCommonFromOwner && commonDrafts.length < 2) {
    throw new ApiError(
      "コピー元の共通ミッションが不足しています。先にオーナーのミッションを作成してください。",
      409,
    );
  }

  const commonMissions = await insertMissionDrafts({
    trip: input.trip,
    userId: input.userId,
    drafts: commonDrafts,
    generationSource: input.copyCommonFromOwner
      ? "owner_common_copy"
      : "fixed_common_default",
  });
  const secretMissions = await insertMissionDrafts({
    trip: input.trip,
    userId: input.userId,
    drafts: secretDrafts,
    generationSource: "fixed_secret_default",
  });

  return {
    created: true,
    missions: [...commonMissions, ...secretMissions],
  };
}

export async function ensureMissionsForTripUser(input: {
  trip: Trip;
  userId: string;
}) {
  return createMissionsForTripUser({
    ...input,
    copyCommonFromOwner: input.userId !== input.trip.owner_user_id,
  });
}

export async function listMissionsForUser(userId: string) {
  const trip = await getTripForUser(userId);

  if (!trip) {
    return {
      trip: null,
      missions: [],
    };
  }

  const missions = await getMissionsForTripUser({
    tripId: trip.id,
    userId,
  });

  return {
    trip,
    missions,
  };
}

export async function completeMissionForUser(input: {
  userId: string;
  missionId: string;
  extraData?: unknown;
  additional?: unknown;
}) {
  const response = await supabaseRestFetch(
    `mission?select=${getMissionSelectQuery()}&id=eq.${encodeURIComponent(input.missionId)}&limit=1`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "ミッションの取得に失敗しました。");

  const rows = (await response.json()) as Mission[];
  const mission = rows[0];

  if (!mission) {
    throw new ApiError("指定されたミッションが見つかりません。", 404);
  }

  const trip = await getTripForUser(input.userId);

  if (!trip || mission.user_id !== input.userId) {
    throw new ApiError("このミッションを更新する権限がありません。", 403);
  }

  if (mission.process === 2) {
    throw new ApiError("このミッションはすでに完了しています。", 409);
  }

  const updateResponse = await supabaseRestFetch(
    `mission?id=eq.${encodeURIComponent(String(mission.id))}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        process: 2,
        extra_data: stringifyMissionText(input.extraData ?? mission.extra_data),
        additional: stringifyMissionText({
          ...parseMissionText(mission.additional),
          ...normalizeJsonObject(input.additional),
          completed_by: input.userId,
          completed_at: new Date().toISOString(),
        }),
      }),
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(updateResponse, "ミッションの更新に失敗しました。");

  const updatedRows = (await updateResponse.json()) as Mission[];
  const updatedMission = updatedRows[0];

  if (!updatedMission) {
    throw new ApiError("更新したミッションを取得できませんでした。", 500);
  }

  return updatedMission;
}

export async function voteMissionForUser(_input: {
  userId: string;
  missionId: string;
  approved: boolean;
}) {
  void _input;
  throw new ApiError(
    "現在は投票ではなく完了ボタンでミッションを完了してください。",
    400,
  );
}

async function getTripMemberships(tripId: string) {
  const response = await supabaseRestFetch(
    `user_trips?select=user_id,trip_id,settlement_pending,created_at&trip_id=eq.${encodeURIComponent(tripId)}&order=created_at.asc`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "trip メンバーの取得に失敗しました。");

  return (await response.json()) as UserTrip[];
}

async function getRankingForTrip(input: {
  trip: Trip;
  userId: string;
  includeSettlementPending: boolean;
}) {
  const memberships = await getTripMemberships(input.trip.id);
  const rankingMemberships = input.includeSettlementPending
    ? memberships
    : memberships.filter((membership) => !membership.settlement_pending);
  const rankingUserIds = rankingMemberships.map((membership) => membership.user_id);
  const completedMissionsResponse =
    rankingUserIds.length > 0
      ? await supabaseRestFetch(
          `mission?select=id,user_id,point,process&user_id=in.(${rankingUserIds.map(encodeURIComponent).join(",")})&process=eq.2`,
          {},
          { useServiceRole: true },
        )
      : null;

  if (completedMissionsResponse) {
    await ensureResponseOk(
      completedMissionsResponse,
      "ランキング対象ミッションの取得に失敗しました。",
    );
  }

  const completedMissions = completedMissionsResponse
    ? ((await completedMissionsResponse.json()) as Array<{
        id: number;
        user_id: string;
        point: number;
      }>)
    : [];
  const scores = new Map<
    string,
    {
      points: number;
      completedMissions: number;
    }
  >();

  for (const mission of completedMissions) {
    const current = scores.get(mission.user_id) ?? {
      points: 0,
      completedMissions: 0,
    };

    scores.set(mission.user_id, {
      points: current.points + mission.point,
      completedMissions: current.completedMissions + 1,
    });
  }

  const profiles = await Promise.all(
    rankingMemberships.map((membership) => getProfileById(membership.user_id)),
  );
  const ranking = profiles
    .map((profile) => {
      const score = scores.get(profile.id) ?? {
        points: 0,
        completedMissions: 0,
      };

      return {
        user_id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        points: score.points,
        completed_missions: score.completedMissions,
        is_me: profile.id === input.userId,
      } satisfies RankingEntry;
    })
    .sort(
      (a, b) => b.points - a.points || a.display_name.localeCompare(b.display_name),
    );

  return {
    trip: input.trip,
    ranking,
  };
}

export async function getRankingForUser(userId: string) {
  const trip = await getTripForUser(userId);

  if (!trip) {
    return {
      trip: null,
      ranking: [],
    };
  }

  return getRankingForTrip({
    trip,
    userId,
    includeSettlementPending: false,
  });
}

export async function getSettlementRankingForUser(userId: string) {
  const pendingSettlement = await getPendingSettlementForUser(userId);

  if (!pendingSettlement) {
    return {
      trip: null,
      ranking: [],
    };
  }

  return getRankingForTrip({
    trip: pendingSettlement.trip,
    userId,
    includeSettlementPending: true,
  });
}

export async function createTripForUser(input: {
  userId: string;
  tripName: string;
  tripDescription: string;
}) {
  const tripName = input.tripName.trim();
  const tripDescription = input.tripDescription.trim();

  if (!tripName) {
    throw new ApiError("trip 名を入力してください。", 400);
  }

  if (!tripDescription) {
    throw new ApiError("trip の説明を入力してください。", 400);
  }

  const existingTrip = await getAnyTripForUser(input.userId);

  if (existingTrip) {
    throw new ApiError("すでに参加中の trip があります。", 409);
  }

  const tripCode = await generateUniqueTripCode();

  const response = await supabaseRestFetch(
    "trips",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        trip_code: tripCode,
        trip_name: tripName,
        trip_description: tripDescription,
        owner_user_id: input.userId,
      }),
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "trip の作成に失敗しました。");

  const rows = (await response.json()) as Trip[];
  const trip = rows[0];

  if (!trip) {
    throw new ApiError("作成した trip を取得できませんでした。", 500);
  }

  try {
    await addUserToTrip(input.userId, trip.id);
    const missionGeneration = await createMissionsForTripUser({
      trip,
      userId: input.userId,
      copyCommonFromOwner: false,
    });

    return {
      trip,
      missionGeneration,
    };
  } catch (error) {
    await deleteMissionsForUser(input.userId);
    const rollbackResponse = await supabaseRestFetch(
      `trips?id=eq.${encodeURIComponent(trip.id)}`,
      {
        method: "DELETE",
      },
      { useServiceRole: true },
    );

    await ensureResponseOk(rollbackResponse, "trip のロールバックに失敗しました。");
    throw error;
  }
}

export async function joinTripForUser(input: {
  userId: string;
  tripCode: string;
}) {
  const tripCode = normalizeTripCode(input.tripCode);

  if (!tripCode) {
    throw new ApiError("旅 ID を入力してください。", 400);
  }

  const existingTrip = await getAnyTripForUser(input.userId);

  if (existingTrip) {
    throw new ApiError("すでに参加中の trip があります。", 409);
  }

  const trip = await getTripByCode(tripCode);
  await addUserToTrip(input.userId, trip.id);

  try {
    const missionGeneration = await createMissionsForTripUser({
      trip,
      userId: input.userId,
      copyCommonFromOwner: true,
    });

    return {
      trip,
      missionGeneration,
    };
  } catch (error) {
    await deleteMissionsForUser(input.userId);
    await removeUserFromTrip(input.userId, trip.id);
    throw error;
  }
}

export async function leaveOrEndTripForUser(input: {
  userId: string;
  tripId: string;
}) {
  const trip = await getTripById(input.tripId);

  const membershipResponse = await supabaseRestFetch(
    `user_trips?select=user_id,trip_id&user_id=eq.${encodeURIComponent(input.userId)}&trip_id=eq.${encodeURIComponent(input.tripId)}&limit=1`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(
    membershipResponse,
    "trip 参加状態の確認に失敗しました。",
  );

  const memberships = (await membershipResponse.json()) as Array<{
    user_id: string;
    trip_id: string;
  }>;

  if (!memberships[0]) {
    throw new ApiError("この trip のメンバーではありません。", 403);
  }

  const isOwner = trip.owner_user_id === input.userId;

  if (isOwner) {
    await markSettlementPendingForTrip(trip.id);
    return { ended: true, tripId: trip.id };
  }

  await markSettlementPendingForUser(input.userId, trip.id);
  return { ended: false, tripId: trip.id };
}

export async function completeSettlementForUser(input: {
  userId: string;
  tripId: string;
}) {
  const membershipResponse = await supabaseRestFetch(
    `user_trips?select=user_id,trip_id,settlement_pending&user_id=eq.${encodeURIComponent(input.userId)}&trip_id=eq.${encodeURIComponent(input.tripId)}&limit=1`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(
    membershipResponse,
    "結算対象の確認に失敗しました。",
  );

  const memberships = (await membershipResponse.json()) as Array<{
    user_id: string;
    trip_id: string;
    settlement_pending: boolean;
  }>;
  const membership = memberships[0];

  if (!membership) {
    throw new ApiError("この trip の参加情報が見つかりません。", 404);
  }

  if (!membership.settlement_pending) {
    throw new ApiError("この trip はまだ結算対象ではありません。", 409);
  }

  await deleteMissionsForUser(input.userId);
  await removeUserFromTrip(input.userId, input.tripId);
}

export async function getCurrentProfileFromAccessToken(accessToken: string) {
  const user = await getAuthUser(accessToken);
  return getProfileById(user.id);
}

export async function getCurrentProfileFromCookies() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenCookieName)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    return await getCurrentProfileFromAccessToken(accessToken);
  } catch {
    return null;
  }
}

export async function requireCurrentProfileFromCookies() {
  const profile = await getCurrentProfileFromCookies();

  if (!profile) {
    throw new ApiError("ログインしていません。", 401);
  }

  return profile;
}

export async function getCurrentTripFromCookies() {
  const profile = await getCurrentProfileFromCookies();

  if (!profile) {
    return null;
  }

  return getTripForUser(profile.id);
}
