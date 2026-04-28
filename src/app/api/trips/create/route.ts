import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  accessTokenCookieName,
  ApiError,
  createTripForUser,
  getCurrentProfileFromAccessToken,
} from "@/lib/supabase";

export const maxDuration = 60;

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
      tripName?: string;
      tripDescription?: string;
    };

    const result = await createTripForUser({
      userId: profile.id,
      tripName: body.tripName ?? "",
      tripDescription: body.tripDescription ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "trip の作成に失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
