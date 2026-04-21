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
