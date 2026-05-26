import { NextResponse } from "next/server";

import {
  ApiError,
  requireCurrentProfileFromCookies,
  scoreSecretMissionGuessesForUser,
} from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const profile = await requireCurrentProfileFromCookies();
    const body = (await request.json()) as {
      assignments?: Array<{
        missionId?: string;
        targetUserId?: string;
      }>;
    };

    const assignments = (body.assignments ?? [])
      .filter((assignment) => assignment.missionId && assignment.targetUserId)
      .map((assignment) => ({
        missionId: assignment.missionId ?? "",
        targetUserId: assignment.targetUserId ?? "",
      }));

    const result = await scoreSecretMissionGuessesForUser({
      userId: profile.id,
      assignments,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "極秘ミッション当ての採点に失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
