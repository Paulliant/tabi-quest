import { NextResponse } from "next/server";

import {
  ApiError,
  getRankingForUser,
  requireCurrentProfileFromCookies,
} from "@/lib/supabase";

export async function GET() {
  try {
    const profile = await requireCurrentProfileFromCookies();
    const result = await getRankingForUser(profile.id);

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "ランキングを取得できませんでした。";

    return NextResponse.json({ error: message }, { status });
  }
}
