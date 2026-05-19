import "server-only";

import { cookies } from "next/headers";

import { generateMissionFromTravelInput } from "@/lib/gpt/route";

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

export type MissionAccess = 0 | 1 | 2;
export type MissionProcess = 0 | 1 | 2;
export type MissionType = 0 | 1 | 2 | 3;
export type MissionVote = number;
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
  vote: MissionVote;
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

export type SettlementProgress = 0 | 1 | 2;

export type SecretGuessMember = Profile;

export type SecretGuessMission = {
  id: number;
  mission_name: string;
  mission_description: string;
  point: number;
};

export type SecretGuessGame = {
  members: SecretGuessMember[];
  missions: SecretGuessMission[];
};

export type SecretGuessAssignment = {
  missionId: string;
  targetUserId: string;
};

export type SecretGuessResult = {
  mission_id: number;
  mission_name: string;
  target_user_id: string;
  correct: boolean;
  points: number;
};

export type SecretGuessScoreResult = {
  guess_delta: number;
  results: SecretGuessResult[];
  ranking: MissionHuntRankingEntry[];
  all_completed: boolean;
  winner_message: string | null;
};

export type MissionHuntRankingEntry = RankingEntry & {
  mission_points: number;
  guess_points: number | null;
  total_points: number | null;
  hunt_completed: boolean;
};

export type MissionHuntSettlement = {
  game: SecretGuessGame;
  ranking: MissionHuntRankingEntry[];
  my_result: SecretGuessScoreResult | null;
  all_completed: boolean;
  winner_message: string | null;
};

type UserTrip = {
  user_id: string;
  trip_id: string;
  settlement_progress: SettlementProgress;
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
};

export type MissionVoteCandidate = {
  user_id: string;
  username: string;
  display_name: string;
  is_me: boolean;
  process: MissionProcess;
  photo_base64: string | null;
  photo_name: string | null;
  can_vote: boolean;
};

export type MissionVoteView = {
  trip: Trip;
  mission: Mission;
  selected_target_user_id: string | null;
  candidates: MissionVoteCandidate[];
};

const COMMON_MISSION_COUNT = 3;
const SECRET_MISSION_COUNT = 3;

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

function normalizeMissionVote(value: unknown, fallback: MissionVote = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Math.max(0, Number(value.trim()));
  }

  return fallback;
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

export function parseMissionAdditional(value: string | null) {
  return parseMissionText(value);
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
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
    settlementProgress?: SettlementProgress;
    minSettlementProgress?: SettlementProgress;
  },
) {
  const settlementFilter =
    typeof options?.settlementProgress === "number"
      ? `&settlement_progress=eq.${options.settlementProgress}`
      : typeof options?.minSettlementProgress === "number"
        ? `&settlement_progress=gte.${options.minSettlementProgress}`
      : "";

  const membershipResponse = await supabaseRestFetch(
    `user_trips?select=user_id,trip_id,settlement_progress,created_at&user_id=eq.${encodeURIComponent(userId)}${settlementFilter}&order=created_at.asc&limit=1`,
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
    settlementProgress: 0,
  });

  return activeMembership?.trip ?? null;
}

async function getAnyTripForUser(userId: string) {
  const membership = await getTripMembershipForUser(userId);
  return membership?.trip ?? null;
}

export async function getPendingSettlementForUser(userId: string) {
  const membership = await getTripMembershipForUser(userId, {
    minSettlementProgress: 1,
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
        settlement_progress: 0,
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

async function markSettlementProgressForTrip(
  tripId: string,
  settlementProgress: SettlementProgress,
) {
  const response = await supabaseRestFetch(
    `user_trips?trip_id=eq.${encodeURIComponent(tripId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settlement_progress: settlementProgress,
      }),
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "trip の終了処理に失敗しました。");
}

async function markSettlementProgressForUser(
  userId: string,
  tripId: string,
  settlementProgress: SettlementProgress,
) {
  const response = await supabaseRestFetch(
    `user_trips?user_id=eq.${encodeURIComponent(userId)}&trip_id=eq.${encodeURIComponent(tripId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settlement_progress: settlementProgress,
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
    "vote",
    "additional",
    "created_at",
  ].join(",");
}

function createMissionGroupId() {
  return crypto.randomUUID();
}

function normalizeGeneratedMissionType(clearMethod: number): MissionType {
  if (clearMethod === 1) {
    return 1;
  }

  if (clearMethod === 2) {
    return 2;
  }

  if (clearMethod === 3) {
    return 3;
  }

  return 0;
}

function getInitialMissionProcess(missionType: MissionType): MissionProcess {
  return missionType === 1 ? 1 : 0;
}

function normalizeGeneratedPoint(point: number) {
  const allowedPoints = [10, 20, 30, 40, 50];

  return allowedPoints.includes(point) ? point : 20;
}

async function getGeneratedCommonMissionDrafts(trip: Trip) {
  const result = await generateMissionFromTravelInput({
    tripTitle: trip.trip_name,
    travelNotes: trip.trip_description,
    missionCount: COMMON_MISSION_COUNT,
  });

  const drafts = result.missions.slice(0, COMMON_MISSION_COUNT).map((mission) => {
    const clearMethod = Number(mission.additional[0]);
    const missionType = normalizeGeneratedMissionType(clearMethod);

    return {
      mission_id: createMissionGroupId(),
      mission_name: mission.missionName,
      mission_description: mission.description,
      access: 0 as MissionAccess,
      point: normalizeGeneratedPoint(mission.points),
      process: getInitialMissionProcess(missionType),
      mission_type: missionType,
    } satisfies MissionDraft;
  });

  if (drafts.length < COMMON_MISSION_COUNT) {
    throw new ApiError("GPT から十分な数の共通ミッションを生成できませんでした。", 500);
  }

  return drafts;
}

async function getGeneratedSecretMissionDrafts(input: {
  trip: Trip;
  userId: string;
}) {
  const profile = await getProfileById(input.userId);
  const result = await generateMissionFromTravelInput({
    tripTitle: input.trip.trip_name,
    travelNotes: input.trip.trip_description,
    generationMode: "secret",
    missionCount: SECRET_MISSION_COUNT,
    playerName: profile.display_name,
    username: profile.username,
  });

  const drafts = result.missions.slice(0, SECRET_MISSION_COUNT).map((mission, index) => {
    const clearMethod = Number(mission.additional[0]);
    const missionType = normalizeGeneratedMissionType(clearMethod);

    return {
      mission_id: createMissionGroupId(),
      mission_name: mission.missionName,
      mission_description: mission.description,
      access: (index === SECRET_MISSION_COUNT - 1 ? 2 : 1) as MissionAccess,
      point: normalizeGeneratedPoint(mission.points),
      process: getInitialMissionProcess(missionType),
      mission_type: missionType,
    } satisfies MissionDraft;
  });

  if (drafts.length < SECRET_MISSION_COUNT) {
    throw new ApiError("GPT から十分な数の極秘ミッションを生成できませんでした。", 500);
  }

  return drafts;
}

async function insertMissionDrafts(input: {
  userId: string;
  drafts: MissionDraft[];
}) {
  const rows = input.drafts.map((draft) => ({
    mission_id: draft.mission_id ?? createMissionGroupId(),
    mission_name: draft.mission_name.trim(),
    mission_description: draft.mission_description.trim(),
    access: draft.access,
    point: draft.point,
    user_id: input.userId,
    process: getInitialMissionProcess(draft.mission_type),
    mission_type: draft.mission_type,
    vote: 0,
    additional: "",
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
    process: getInitialMissionProcess(mission.mission_type),
    mission_type: mission.mission_type,
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

async function getMissionByRowId(missionId: string) {
  const response = await supabaseRestFetch(
    `mission?select=${getMissionSelectQuery()}&id=eq.${encodeURIComponent(missionId)}&limit=1`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "ミッションの取得に失敗しました。");

  const rows = (await response.json()) as Mission[];
  const mission = rows[0];

  if (!mission) {
    throw new ApiError("指定されたミッションが見つかりません。", 404);
  }

  return mission;
}

async function updateMissionByRowId(
  missionId: number,
  payload: Partial<Pick<Mission, "process" | "vote" | "additional">>,
) {
  const response = await supabaseRestFetch(
    `mission?id=eq.${encodeURIComponent(String(missionId))}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    },
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "ミッションの更新に失敗しました。");

  const rows = (await response.json()) as Mission[];
  const mission = rows[0];

  if (!mission) {
    throw new ApiError("更新したミッションを取得できませんでした。", 500);
  }

  return mission;
}

async function getMissionRowsForMembers(input: {
  missionGroupId: string;
  userIds: string[];
}) {
  if (input.userIds.length === 0) {
    return [];
  }

  const response = await supabaseRestFetch(
    `mission?select=${getMissionSelectQuery()}&mission_id=eq.${encodeURIComponent(input.missionGroupId)}&user_id=in.(${input.userIds.map(encodeURIComponent).join(",")})`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "投票対象ミッションの取得に失敗しました。");

  return (await response.json()) as Mission[];
}

async function getCommonMissionsForTripOwner(trip: Trip) {
  const missions = await getMissionsForTripUser({
    tripId: trip.id,
    userId: trip.owner_user_id,
  });

  return missions
    .filter((mission) => mission.access === 0)
    .slice(0, COMMON_MISSION_COUNT);
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
    : await getGeneratedCommonMissionDrafts(input.trip);
  const secretDrafts = await getGeneratedSecretMissionDrafts({
    trip: input.trip,
    userId: input.userId,
  });

  if (input.copyCommonFromOwner && commonDrafts.length < COMMON_MISSION_COUNT) {
    throw new ApiError(
      "コピー元の共通ミッションが不足しています。先にオーナーのミッションを作成してください。",
      409,
    );
  }

  const commonMissions = await insertMissionDrafts({
    userId: input.userId,
    drafts: commonDrafts,
  });
  const secretMissions = await insertMissionDrafts({
    userId: input.userId,
    drafts: secretDrafts,
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
    missions: missions.filter((mission) => mission.access !== 2),
  };
}

export async function completeMissionForUser(input: {
  userId: string;
  missionId: string;
  vote?: unknown;
  extraData?: unknown;
  additional?: unknown;
}) {
  const mission = await getMissionByRowId(input.missionId);

  const trip = await getTripForUser(input.userId);

  if (!trip || mission.user_id !== input.userId) {
    throw new ApiError("このミッションを更新する権限がありません。", 403);
  }

  if (mission.process === 2) {
    throw new ApiError("このミッションはすでに完了しています。", 409);
  }

  if (mission.mission_type === 1) {
    throw new ApiError("投票タイプのミッションは投票画面から操作してください。", 400);
  }

  const currentAdditional = parseMissionText(mission.additional);
  const incomingAdditional = normalizeJsonObject(input.additional);
  const isPhotoVoteMission = mission.mission_type === 2;

  if (isPhotoVoteMission && getStringValue(currentAdditional.photo_base64)) {
    throw new ApiError("写真はすでにアップロード済みです。", 409);
  }

  if (isPhotoVoteMission && !getStringValue(incomingAdditional.photo_base64)) {
    throw new ApiError("写真データが必要です。", 400);
  }

  const nextProcess: MissionProcess = isPhotoVoteMission ? 1 : 2;
  const now = new Date().toISOString();

  return updateMissionByRowId(mission.id, {
    process: nextProcess,
    vote: normalizeMissionVote(input.vote ?? input.extraData, mission.vote),
    additional: stringifyMissionText({
      ...currentAdditional,
      ...incomingAdditional,
      ...(nextProcess === 2
        ? {
            completed_by: input.userId,
            completed_at: now,
          }
        : {
            photo_uploaded_by: input.userId,
            photo_uploaded_at: now,
          }),
    }),
  });
}

async function getVotingContext(input: {
  userId: string;
  missionId: string;
}) {
  const mission = await getMissionByRowId(input.missionId);
  const trip = await getTripForUser(input.userId);

  if (!trip || mission.user_id !== input.userId) {
    throw new ApiError("このミッションで投票する権限がありません。", 403);
  }

  if (mission.access !== 0 || ![1, 2].includes(mission.mission_type)) {
    throw new ApiError("このミッションは投票対象ではありません。", 400);
  }

  const memberships = (await getTripMemberships(trip.id)).filter(
    (membership) => membership.settlement_progress === 0,
  );
  const memberUserIds = memberships.map((membership) => membership.user_id);
  const groupMissions = await getMissionRowsForMembers({
    missionGroupId: mission.mission_id,
    userIds: memberUserIds,
  });
  const missionByUserId = new Map(
    groupMissions.map((groupMission) => [groupMission.user_id, groupMission]),
  );

  return {
    trip,
    mission,
    memberships,
    memberUserIds,
    groupMissions,
    missionByUserId,
  };
}

export async function getMissionVoteViewForUser(input: {
  userId: string;
  missionId: string;
}): Promise<MissionVoteView> {
  const context = await getVotingContext(input);
  const profiles = await Promise.all(
    context.memberships.map((membership) => getProfileById(membership.user_id)),
  );
  const currentAdditional = parseMissionText(context.mission.additional);
  const selectedTargetUserId = getStringValue(
    currentAdditional.vote_target_user_id,
  );
  const candidates = profiles.map((profile) => {
    const targetMission = context.missionByUserId.get(profile.id);
    const additional = parseMissionText(targetMission?.additional ?? null);
    const photoBase64 = getStringValue(additional.photo_base64);
    const photoName = getStringValue(additional.photo_name);
    const isMe = profile.id === input.userId;
    const hasRequiredPhoto =
      context.mission.mission_type !== 2 || Boolean(photoBase64);

    return {
      user_id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      is_me: isMe,
      process: targetMission?.process ?? 0,
      photo_base64: photoBase64,
      photo_name: photoName,
      can_vote: !isMe && Boolean(targetMission) && hasRequiredPhoto,
    } satisfies MissionVoteCandidate;
  });

  return {
    trip: context.trip,
    mission: context.mission,
    selected_target_user_id: selectedTargetUserId,
    candidates,
  };
}

export async function voteMissionForUser(input: {
  userId: string;
  missionId: string;
  targetUserId: string;
}) {
  if (!input.targetUserId) {
    throw new ApiError("投票先を選択してください。", 400);
  }

  if (input.targetUserId === input.userId) {
    throw new ApiError("自分には投票できません。", 400);
  }

  const context = await getVotingContext(input);
  const targetMission = context.missionByUserId.get(input.targetUserId);

  if (context.mission.process === 2) {
    throw new ApiError("このミッションは投票済みです。", 409);
  }

  if (!targetMission) {
    throw new ApiError("投票先のミッションが見つかりません。", 404);
  }

  const currentAdditional = parseMissionText(context.mission.additional);

  if (getStringValue(currentAdditional.vote_target_user_id)) {
    throw new ApiError("このミッションは投票済みです。", 409);
  }

  if (
    context.mission.mission_type === 2 &&
    !getStringValue(currentAdditional.photo_base64)
  ) {
    throw new ApiError("写真をアップロードしてから投票してください。", 400);
  }

  const targetAdditional = parseMissionText(targetMission.additional);

  if (
    context.mission.mission_type === 2 &&
    !getStringValue(targetAdditional.photo_base64)
  ) {
    throw new ApiError("写真をアップロードしていないユーザーには投票できません。", 400);
  }

  await updateMissionByRowId(targetMission.id, {
    vote: normalizeMissionVote(targetMission.vote) + 1,
  });

  const votedMission = await updateMissionByRowId(context.mission.id, {
    process: 2,
    additional: stringifyMissionText({
      ...currentAdditional,
      vote_target_user_id: input.targetUserId,
      voted_at: new Date().toISOString(),
      completed_by: input.userId,
      completed_at: new Date().toISOString(),
    }),
  });

  return {
    mission: {
      id: votedMission.id,
      process: votedMission.process,
    },
  };
}

async function getTripMemberships(tripId: string) {
  const response = await supabaseRestFetch(
    `user_trips?select=user_id,trip_id,settlement_progress,created_at&trip_id=eq.${encodeURIComponent(tripId)}&order=created_at.asc`,
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
    : memberships.filter((membership) => membership.settlement_progress === 0);
  const rankingUserIds = rankingMemberships.map((membership) => membership.user_id);
  const completedMissionsResponse =
    rankingUserIds.length > 0
      ? await supabaseRestFetch(
          `mission?select=id,user_id,point,process,mission_type,additional&user_id=in.(${rankingUserIds.map(encodeURIComponent).join(",")})&process=eq.2`,
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
        mission_type: MissionType;
        additional: string | null;
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
    const additional = parseMissionText(mission.additional);
    const isVoteMission =
      mission.mission_type === 1 || mission.mission_type === 2;

    if (isVoteMission && !getStringValue(additional.vote_awarded_at)) {
      continue;
    }

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

async function awardVoteMissionWinnersForTrip(tripId: string) {
  const memberships = await getTripMemberships(tripId);
  const memberUserIds = memberships.map((membership) => membership.user_id);

  if (memberUserIds.length === 0) {
    return;
  }

  const response = await supabaseRestFetch(
    `mission?select=${getMissionSelectQuery()}&user_id=in.(${memberUserIds.map(encodeURIComponent).join(",")})&access=eq.0&mission_type=in.(1,2)`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "投票ミッションの集計に失敗しました。");

  const missions = (await response.json()) as Mission[];
  const missionsByGroup = new Map<string, Mission[]>();

  for (const mission of missions) {
    const group = missionsByGroup.get(mission.mission_id) ?? [];
    group.push(mission);
    missionsByGroup.set(mission.mission_id, group);
  }

  const now = new Date().toISOString();

  for (const group of missionsByGroup.values()) {
    const maxVote = Math.max(
      ...group.map((mission) => normalizeMissionVote(mission.vote)),
    );

    if (maxVote <= 0) {
      continue;
    }

    const winners = group.filter(
      (mission) => normalizeMissionVote(mission.vote) === maxVote,
    );

    await Promise.all(
      winners.map((mission) =>
        updateMissionByRowId(mission.id, {
          process: 2,
          additional: stringifyMissionText({
            ...parseMissionText(mission.additional),
            vote_awarded_at: now,
            vote_awarded_count: maxVote,
          }),
        }),
      ),
    );
  }
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

async function getDummyMissionForUser(userId: string) {
  const response = await supabaseRestFetch(
    `mission?select=${getMissionSelectQuery()}&user_id=eq.${encodeURIComponent(userId)}&access=eq.2&limit=1`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(response, "ミッションハント結果の取得に失敗しました。");

  const rows = (await response.json()) as Mission[];
  return rows[0] ?? null;
}

function readSecretGuessResultFromMission(mission: Mission | null) {
  if (!mission) {
    return null;
  }

  const additional = parseMissionText(mission.additional);
  const result = additional.secret_guess;

  return isJsonObject(result) ? result : null;
}

async function getSecretGuessDeltaForUser(userId: string) {
  const dummyMission = await getDummyMissionForUser(userId);
  const result = readSecretGuessResultFromMission(dummyMission);
  const delta = result?.guess_delta;

  return typeof delta === "number" && Number.isFinite(delta) ? delta : null;
}

function buildWinnerMessage(ranking: MissionHuntRankingEntry[]) {
  if (ranking.some((entry) => !entry.hunt_completed)) {
    return null;
  }

  const winner = ranking[0];

  if (!winner || typeof winner.total_points !== "number") {
    return null;
  }

  const winnerNames = ranking
    .filter((entry) => entry.total_points === winner.total_points)
    .map((entry) => `${entry.display_name}さん`)
    .join("、");

  return `優勝者は${winner.total_points}点を獲得した${winnerNames}です🏆`;
}

async function getMissionHuntRankingForUser(userId: string) {
  const rankingResult = await getSettlementRankingForUser(userId);
  const pendingSettlement = await getPendingSettlementForUser(userId);
  const memberships = pendingSettlement
    ? await getTripMemberships(pendingSettlement.trip.id)
    : [];
  const progressByUserId = new Map(
    memberships.map((membership) => [
      membership.user_id,
      membership.settlement_progress,
    ]),
  );
  const guessDeltas = new Map<string, number | null>();

  await Promise.all(
    rankingResult.ranking.map(async (entry) => {
      guessDeltas.set(entry.user_id, await getSecretGuessDeltaForUser(entry.user_id));
    }),
  );

  const ranking = rankingResult.ranking
    .map((entry) => {
      const huntCompleted = progressByUserId.get(entry.user_id) === 2;
      const guessPoints = huntCompleted ? guessDeltas.get(entry.user_id) ?? 0 : null;
      const totalPoints =
        typeof guessPoints === "number" ? entry.points + guessPoints : null;

      return {
        ...entry,
        mission_points: entry.points,
        guess_points: guessPoints,
        total_points: totalPoints,
        hunt_completed: huntCompleted,
      } satisfies MissionHuntRankingEntry;
    })
    .sort((a, b) => {
      const aTotal = a.total_points ?? a.mission_points;
      const bTotal = b.total_points ?? b.mission_points;
      return bTotal - aTotal || a.display_name.localeCompare(b.display_name);
    });

  return ranking;
}

export async function getMissionHuntSettlementForUser(
  userId: string,
): Promise<MissionHuntSettlement> {
  const [game, ranking, myDummyMission] = await Promise.all([
    getSecretGuessGameForUser(userId),
    getMissionHuntRankingForUser(userId),
    getDummyMissionForUser(userId),
  ]);
  const myResult = readSecretGuessResultFromMission(myDummyMission);
  const parsedResult = myResult
    ? ({
        guess_delta:
          typeof myResult.guess_delta === "number" ? myResult.guess_delta : 0,
        results: Array.isArray(myResult.results)
          ? (myResult.results as SecretGuessResult[])
          : [],
        ranking,
        all_completed: ranking.every((entry) => entry.hunt_completed),
        winner_message: buildWinnerMessage(ranking),
      } satisfies SecretGuessScoreResult)
    : null;

  return {
    game,
    ranking,
    my_result: parsedResult,
    all_completed: ranking.every((entry) => entry.hunt_completed),
    winner_message: buildWinnerMessage(ranking),
  };
}

export async function getSecretGuessGameForUser(userId: string): Promise<SecretGuessGame> {
  const pendingSettlement = await getPendingSettlementForUser(userId);

  if (!pendingSettlement) {
    throw new ApiError("結算対象の trip がありません。", 404);
  }

  const memberships = await getTripMemberships(pendingSettlement.trip.id);
  const memberUserIds = memberships.map((membership) => membership.user_id);
  const profiles = await Promise.all(
    memberUserIds.map((memberUserId) => getProfileById(memberUserId)),
  );

  const missionResponse = await supabaseRestFetch(
    `mission?select=${getMissionSelectQuery()}&user_id=in.(${memberUserIds.map(encodeURIComponent).join(",")})&access=in.(1,2)&order=mission_id.asc`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(missionResponse, "極秘ミッション候補の取得に失敗しました。");

  const secretMissions = (await missionResponse.json()) as Mission[];

  return {
    members: profiles,
    missions: secretMissions.map((mission) => ({
      id: mission.id,
      mission_name: mission.mission_name,
      mission_description: mission.mission_description,
      point: mission.point,
    })),
  };
}

export async function scoreSecretMissionGuessesForUser(input: {
  userId: string;
  assignments: SecretGuessAssignment[];
}): Promise<SecretGuessScoreResult> {
  const pendingSettlement = await getPendingSettlementForUser(input.userId);

  if (!pendingSettlement) {
    throw new ApiError("結算対象の trip がありません。", 404);
  }

  const memberships = await getTripMemberships(pendingSettlement.trip.id);
  const memberUserIds = memberships.map((membership) => membership.user_id);
  const memberUserIdSet = new Set(memberUserIds);
  const missionIds = input.assignments.map((assignment) => assignment.missionId);

  if (missionIds.length === 0) {
    throw new ApiError("割り当てるミッションを選択してください。", 400);
  }

  for (const assignment of input.assignments) {
    if (!memberUserIdSet.has(assignment.targetUserId)) {
      throw new ApiError("不正な割り当て先が含まれています。", 400);
    }
  }

  const missionResponse = await supabaseRestFetch(
    `mission?select=${getMissionSelectQuery()}&id=in.(${missionIds.map(encodeURIComponent).join(",")})&user_id=in.(${memberUserIds.map(encodeURIComponent).join(",")})&access=in.(1,2)`,
    {},
    { useServiceRole: true },
  );

  await ensureResponseOk(missionResponse, "極秘ミッションの採点に失敗しました。");

  const missions = (await missionResponse.json()) as Mission[];
  const missionById = new Map(missions.map((mission) => [String(mission.id), mission]));
  const seenMissionIds = new Set<string>();
  const results: SecretGuessResult[] = [];

  for (const assignment of input.assignments) {
    if (seenMissionIds.has(assignment.missionId)) {
      continue;
    }

    seenMissionIds.add(assignment.missionId);
    const mission = missionById.get(assignment.missionId);

    if (!mission) {
      throw new ApiError("不正なミッションが含まれています。", 400);
    }

    const correct = mission.access === 1 && mission.user_id === assignment.targetUserId;
    const points = correct ? Math.floor(mission.point / 2) : -10;

    results.push({
      mission_id: mission.id,
      mission_name: mission.mission_name,
      target_user_id: assignment.targetUserId,
      correct,
      points,
    });
  }

  const guessDelta = results.reduce((sum, result) => sum + result.points, 0);
  const dummyMission = await getDummyMissionForUser(input.userId);

  if (dummyMission) {
    await updateMissionByRowId(dummyMission.id, {
      additional: stringifyMissionText({
        ...parseMissionText(dummyMission.additional),
        secret_guess: {
          guess_delta: guessDelta,
          results,
          completed_at: new Date().toISOString(),
        },
      }),
    });
  }

  await markSettlementProgressForUser(
    input.userId,
    pendingSettlement.trip.id,
    2,
  );

  const ranking = await getMissionHuntRankingForUser(input.userId);
  const allCompleted = ranking.every((entry) => entry.hunt_completed);

  return {
    guess_delta: guessDelta,
    results,
    ranking,
    all_completed: allCompleted,
    winner_message: buildWinnerMessage(ranking),
  };
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
    await awardVoteMissionWinnersForTrip(trip.id);
    await markSettlementProgressForTrip(trip.id, 1);
    return { ended: true, tripId: trip.id };
  }

  await markSettlementProgressForUser(input.userId, trip.id, 1);
  return { ended: false, tripId: trip.id };
}

export async function completeSettlementForUser(input: {
  userId: string;
  tripId: string;
}) {
  const membershipResponse = await supabaseRestFetch(
    `user_trips?select=user_id,trip_id,settlement_progress&user_id=eq.${encodeURIComponent(input.userId)}&trip_id=eq.${encodeURIComponent(input.tripId)}&limit=1`,
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
    settlement_progress: SettlementProgress;
  }>;
  const membership = memberships[0];

  if (!membership) {
    throw new ApiError("この trip の参加情報が見つかりません。", 404);
  }

  if (membership.settlement_progress < 1) {
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
