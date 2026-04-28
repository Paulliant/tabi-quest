import { NextResponse } from "next/server";

import {
  ApiError,
  listMissionsForUser,
  requireCurrentProfileFromCookies,
} from "@/lib/supabase";

export async function GET() {
  try {
    const profile = await requireCurrentProfileFromCookies();
    const result = await listMissionsForUser(profile.id);

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "ミッション一覧を取得できませんでした。";

    return NextResponse.json({ error: message }, { status });
  }
}
