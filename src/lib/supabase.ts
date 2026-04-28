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
  } catch (error) {
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

  return trip;
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

  return trip;
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

export async function getCurrentTripFromCookies() {
  const profile = await getCurrentProfileFromCookies();

  if (!profile) {
    return null;
  }

  return getTripForUser(profile.id);
}
