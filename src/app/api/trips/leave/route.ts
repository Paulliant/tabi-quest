import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  accessTokenCookieName,
  ApiError,
  getCurrentProfileFromAccessToken,
  getTripForUser,
  leaveOrEndTripForUser,
} from "@/lib/supabase";

export async function POST() {
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

    if (!trip) {
      return NextResponse.json(
        { error: "参加中の trip がありません。" },
        { status: 404 },
      );
    }

    const result = await leaveOrEndTripForUser({
      userId: profile.id,
      tripId: trip.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "trip の退出処理に失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
