import { NextResponse } from "next/server";

import {
  ApiError,
  ensureMissionsForTripUser,
  getTripForUser,
  requireCurrentProfileFromCookies,
} from "@/lib/supabase";

export async function POST() {
  try {
    const profile = await requireCurrentProfileFromCookies();
    const trip = await getTripForUser(profile.id);

    if (!trip) {
      return NextResponse.json(
        { error: "参加中の trip がありません。" },
        { status: 404 },
      );
    }

    const missionGeneration = await ensureMissionsForTripUser({
      trip,
      userId: profile.id,
    });

    return NextResponse.json({
      trip,
      missionGeneration,
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "ミッションの作成に失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
