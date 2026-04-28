import { NextResponse } from "next/server";

import {
  ApiError,
  completeMissionForUser,
  requireCurrentProfileFromCookies,
} from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const profile = await requireCurrentProfileFromCookies();
    const body = (await request.json()) as {
      missionId?: string;
      extraData?: unknown;
      additional?: unknown;
    };

    if (!body.missionId) {
      return NextResponse.json(
        { error: "missionId が必要です。" },
        { status: 400 },
      );
    }

    const mission = await completeMissionForUser({
      userId: profile.id,
      missionId: body.missionId,
      extraData: body.extraData,
      additional: body.additional,
    });

    return NextResponse.json({ mission });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "ミッションの完了処理に失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
