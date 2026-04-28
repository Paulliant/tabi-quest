import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  accessTokenCookieName,
  ApiError,
  getCurrentProfileFromAccessToken,
  joinTripForUser,
} from "@/lib/supabase";

export async function POST(request: Request) {
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
    const body = (await request.json()) as {
      tripCode?: string;
    };

    const result = await joinTripForUser({
      userId: profile.id,
      tripCode: body.tripCode ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "trip への参加に失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
