import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type MissionGenerationInput = {
	travelNotes?: string;
	notes?: string;
	description?: string;
	text?: string;
	body?: string;
	language?: string;
	tripTitle?: string;
	missionCount?: number;
};

export type GeneratedMission = {
	missionName: string;
	description: string;
	type1: string;
	points: number;
	type2: string;
	additional: [string, string, string];
};

export type GeneratedMissionResponse = {
	missions: GeneratedMission[];
};

const MISSION_POINT_VALUES = [10, 20, 30, 40, 50] as const;

const MISSION_CLEAR_METHODS = [0, 1, 2, 3] as const;

function getOpenAIApiKey() {
	const keyPath = path.join(process.cwd(), "src", "lib", "gpt", ".openai.key");

	try {
		const key = readFileSync(keyPath, "utf-8").trim();
		if (key) {
			return key;
		}
	} catch {
		// `.openai.key` がない場合は環境変数へフォールバックする。
	}

	return process.env.OPENAI_API_KEY ?? "";
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTextCandidate(value: unknown): string {
	if (typeof value === "string") {
		return value.trim();
	}

	if (Array.isArray(value)) {
		return value
			.map((item) => normalizeTextCandidate(item))
			.filter(Boolean)
			.join("\n");
	}

	if (isRecord(value)) {
		const prioritizedKeys = [
			"travelNotes",
			"notes",
			"description",
			"text",
			"body",
			"content",
			"memo",
			"freeText",
			"tripTitle",
			"title",
		];

		const fromKnownKeys = prioritizedKeys
			.map((key) => normalizeTextCandidate(value[key]))
			.filter(Boolean)
			.join("\n");

		if (fromKnownKeys) {
			return fromKnownKeys;
		}

		return Object.values(value)
			.map((item) => normalizeTextCandidate(item))
			.filter(Boolean)
			.join("\n");
	}

	return String(value ?? "").trim();
}

function parseJsonLike(text: string) {
	const trimmed = text.trim();

	if (!trimmed) {
		return "";
	}

	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		return trimmed;
	}
}

function normalizeMissionCount(value: unknown) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return 3;
	}

	return Math.min(10, Math.max(1, Math.trunc(value)));
}

function extractBlockValue(block: string, label: string) {
	const pattern = new RegExp(`${label}：?\\s*([\\s\\S]*?)(?:\\n(?:ミッション名|説明|ミッション種別|ポイント|クリア方法|---|$))`);
	const match = block.match(pattern);

	return match?.[1]?.trim() ?? "";
}

function parseMissionResponseText(content: string): GeneratedMissionResponse {
	const normalized = content.replace(/\r\n/g, "\n").trim();
	if (!normalized) {
		throw new Error("OpenAI から空の応答を受け取りました。");
	}

	const blocks = normalized
		.split(/\n---\n/g)
		.map((block) => block.trim())
		.filter(Boolean);

	if (blocks.length === 0) {
		throw new Error("ミッションの応答を解析できませんでした。");
	}

	const missions = blocks.map((block) => {
		const missionName = extractBlockValue(block, "ミッション名");
		const description = extractBlockValue(block, "説明");
		const type1 = extractBlockValue(block, "ミッション種別");
		const pointsRaw = extractBlockValue(block, "ポイント");
		const clearMethodRaw = extractBlockValue(block, "クリア方法");

		const points = Number(pointsRaw);
		const clearMethod = Number(clearMethodRaw);

		if (!missionName || !description || !type1) {
			throw new Error("ミッションの必須項目が不足しています。");
		}

		if (!MISSION_POINT_VALUES.includes(points as (typeof MISSION_POINT_VALUES)[number])) {
			throw new Error("ポイントは 10, 20, 30, 40, 50 のいずれかである必要があります。");
		}

		if (!MISSION_CLEAR_METHODS.includes(clearMethod as (typeof MISSION_CLEAR_METHODS)[number])) {
			throw new Error("クリア方法は 0〜3 の数値である必要があります。");
		}

		return {
			missionName,
			description,
			type1,
			points,
			type2: "",
			additional: [String(clearMethod), "", ""] as [string, string, string],
		};
	});

	return { missions };
}

async function readInputFromRequest(request: Request) {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData();
		const file = formData.get("file");

		if (file instanceof File) {
			const text = await file.text();
			return normalizeTextCandidate(parseJsonLike(text));
		}

		const formObject: Record<string, unknown> = {};
		for (const [key, value] of formData.entries()) {
			formObject[key] = value instanceof File ? await value.text() : value;
		}

		return normalizeTextCandidate(formObject);
	}

	if (contentType.includes("application/json")) {
		const body = (await request.json()) as unknown;
		return normalizeTextCandidate(body);
	}

	const fallbackText = await request.text();
	return normalizeTextCandidate(parseJsonLike(fallbackText));
}

async function callOpenAI(travelText: string, input: MissionGenerationInput) {
	const apiKey = getOpenAIApiKey();
	const missionCount = normalizeMissionCount(input.missionCount);

	if (!apiKey) {
		throw new Error(".openai.key か OPENAI_API_KEY が設定されていません。");
	}

	const response = await fetch(OPENAI_API_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: OPENAI_MODEL,
			temperature: 0.7,
			messages: [
				{
					role: "system",
					content:
						"あなたは旅行を盛り上げるミッション生成AIです。ユーザーから与えられた旅行名と自由記述をもとに、安全で倫理的な共通ミッションを生成してください。出力は指定フォーマットのみで、余計な説明は一切書かないでください。",
				},
				{
					role: "user",
					content: [
						"ユーザーから『旅行名』と『自由記述』が与えられます。",
						"それをもとに、旅行中に実行できる共通ミッションを生成してください。",
						"",
						"# 目的",
						"- 全員で協力・共有して楽しめる体験を作る",
						"- 観光・行動・発見・軽い交流の要素を含める",
						"- 安全で倫理的に問題のない内容のみを生成する",
						"",
						"# 安全性・倫理ルール（必ず守る）",
						"以下に該当するミッションは禁止",
						"- 違法行為",
						"- 危険行為",
						"- 迷惑行為",
						"- ハラスメント、差別、侮辱",
						"- 性的・わいせつな内容",
						"- 個人情報の取得や無断撮影",
						"- 飲酒・賭博の強要",
						"- 立入禁止区域への侵入",
						"- 文化財や自然を傷つける行為",
						"",
						"# 出力形式（厳守）",
						"各ミッションを1つずつ、以下の形式で出力してください。",
						"余計な説明は一切書かないでください。",
						"",
						"ミッション名：",
						"（ここに記述）",
						"",
						"説明：",
						"（ここに記述）",
						"",
						"ミッション種別：",
						"共通ミッション",
						"",
						"ポイント：",
						"（10,20,30,40,50の数値）",
						"",
						"クリア方法：",
						"（0〜3の数値）",
						"",
						"---（区切り線として必ず出力）",
						"",
						"# ルール",
						`- 共通ミッションは${missionCount}個生成する`,
						"- 全員で同時または協力して達成できる内容にする",
						"- 内容はバリエーションを持たせる",
						"",
						"# クリア方法",
						"0：そのまま完了",
						"1：投票",
						"2：写真付き投票",
						"",
						"# 入力",
						`旅行名: ${input.tripTitle ?? "（未指定）"}`,
						`自由記述: ${travelText}`,
						"",
					]
						.filter(Boolean)
						.join("\n"),
				},
			],
		}),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(
			`OpenAI API へのリクエストに失敗しました。${errorText ? ` ${errorText}` : ""}`.trim(),
		);
	}

	const data = (await response.json()) as {
		choices?: Array<{
			message?: {
				content?: string | null;
			};
		}>;
	};

	const content = data.choices?.[0]?.message?.content;

	if (!content) {
		throw new Error("OpenAI から有効な応答を受け取れませんでした。");
	}

	return parseMissionResponseText(content);
}

export async function generateMissionFromTravelInput(
	input: MissionGenerationInput | unknown,
) {
	const travelText = normalizeTextCandidate(input);

	if (!travelText) {
		throw new Error("旅行に関する自由記述が見つかりませんでした。");
	}

	return callOpenAI(travelText, isRecord(input) ? input : {});
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
