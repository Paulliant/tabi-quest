import { NextResponse } from "next/server";

import {
  ApiError,
  changeMissionsForUser,
  requireCurrentProfileFromCookies,
} from "@/lib/supabase";

export const maxDuration = 60;

export async function POST() {
  try {
    const profile = await requireCurrentProfileFromCookies();
    const result = await changeMissionsForUser(profile.id);

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "ミッションの変更に失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
