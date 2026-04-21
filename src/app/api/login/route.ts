import { NextResponse } from "next/server";

import {
  accessTokenCookieName,
  ApiError,
  refreshTokenCookieName,
  signInWithUsernamePassword,
} from "@/lib/supabase";

const secureCookie = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const session = await signInWithUsernamePassword(
      body.username ?? "",
      body.password ?? "",
    );

    const response = NextResponse.json({
      ok: true,
    });

    response.cookies.set({
      name: accessTokenCookieName,
      value: session.access_token,
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: session.expires_in,
    });

    response.cookies.set({
      name: refreshTokenCookieName,
      value: session.refresh_token,
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "ログインに失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
