import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  accessTokenCookieName,
  ApiError,
  getCurrentProfileFromAccessToken,
  getTripForUser,
} from "@/lib/supabase";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(accessTokenCookieName)?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "ログインしていません。" },
        { status: 401 },
      );
    }

    const profile = await getCurrentProfileFromAccessToken(accessToken);
    const trip = await getTripForUser(profile.id);

    return NextResponse.json({ trip });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "trip 情報を取得できませんでした。";

    return NextResponse.json({ error: message }, { status });
  }
}
