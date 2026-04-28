import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  accessTokenCookieName,
  ApiError,
  completeSettlementForUser,
  getCurrentProfileFromAccessToken,
  getPendingSettlementForUser,
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
    const pendingSettlement = await getPendingSettlementForUser(profile.id);

    if (!pendingSettlement) {
      return NextResponse.json(
        { error: "結算対象の trip がありません。" },
        { status: 404 },
      );
    }

    await completeSettlementForUser({
      userId: profile.id,
      tripId: pendingSettlement.trip.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "結算の完了に失敗しました。";

    return NextResponse.json({ error: message }, { status });
  }
}
