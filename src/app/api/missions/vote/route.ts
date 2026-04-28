import { NextResponse } from "next/server";

import {
  ApiError,
  requireCurrentProfileFromCookies,
  voteMissionForUser,
} from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const profile = await requireCurrentProfileFromCookies();
    const body = (await request.json()) as {
      missionId?: string;
      approved?: boolean;
    };

    if (!body.missionId) {
      return NextResponse.json(
        { error: "missionId が必要です。" },
        { status: 400 },
      );
    }

    const result = await voteMissionForUser({
      userId: profile.id,
      missionId: body.missionId,
      approved: body.approved ?? true,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "投票処理に失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
