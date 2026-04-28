import { NextResponse } from "next/server";

import { generateMissionFromTravelInput } from "@/lib/gpt/route";

export const dynamic = "force-dynamic";

async function readInputFromRequest(request: Request) {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData();
		const file = formData.get("file");

		if (file instanceof File) {
			return {
				travelNotes: await file.text(),
				tripTitle: formData.get("tripTitle")?.toString() ?? "",
				missionCount: Number(formData.get("missionCount") ?? 3),
			};
		}

		return Object.fromEntries(formData.entries());
	}

	if (contentType.includes("application/json")) {
		return (await request.json()) as unknown;
	}

	return { travelNotes: await request.text() };
}

export async function POST(request: Request) {
	try {
		const input = await readInputFromRequest(request);
		const result = await generateMissionFromTravelInput(input);

		return NextResponse.json({ ok: true, ...result });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "ミッション生成に失敗しました。";

		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}