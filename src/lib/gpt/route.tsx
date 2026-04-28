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
	generationMode?: "common" | "secret";
	playerName?: string;
	username?: string;
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
	const envKey = process.env.OPENAI_API_KEY?.trim();

	if (envKey) {
		return envKey;
	}

	const keyPath = path.join(process.cwd(), "src", "lib", "gpt", ".openai.key");

	try {
		const key = readFileSync(keyPath, "utf-8").trim();
		if (key) {
			return key;
		}
	} catch {
		// `.openai.key` がない場合は環境変数へフォールバックする。
	}

	return "";
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const OPENAI_REQUEST_TIMEOUT_MS = 30_000;
const OPENAI_MAX_RETRY_WINDOW_MS = 55_000;
const OPENAI_RETRY_DELAY_MS = 1_000;

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

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number) {
	return status === 408 || status === 409 || status === 429 || status >= 500;
}

function shouldRetryError(error: Error) {
	const message = error.message.toLowerCase();

	return (
		error.name === "AbortError" ||
		message.includes("timeout") ||
		message.includes("timed out") ||
		message.includes("econnreset") ||
		message.includes("enotfound") ||
		message.includes("socket hang up") ||
		message.includes("temporarily unavailable")
	);
}

function getDefaultMissionCount(mode: MissionGenerationInput["generationMode"]) {
	return mode === "secret" ? 3 : 3;
}

function getMissionLabel(mode: MissionGenerationInput["generationMode"]) {
	return mode === "secret" ? "極秘ミッション" : "共通ミッション";
}

function getMissionModePrompt(mode: MissionGenerationInput["generationMode"]) {
	if (mode === "secret") {
		return [
			"あなたは旅行を盛り上げるミッション生成AIです。",
			"ユーザーから『旅行名』と『自由記述』が与えられます。",
			"それをもとに、個人にだけ与えられる極秘ミッションを生成してください。",
			"個人で実行できる内容にし、他メンバーにバレない範囲で実行できるようにしてください。",
			"安全で倫理的に問題のない内容のみを生成してください。",
		].join("\n");
	}

	return [
		"あなたは旅行を盛り上げるミッション生成AIです。",
		"ユーザーから『旅行名』と『自由記述』が与えられます。",
		"それをもとに、旅行中に実行できる共通ミッションを生成してください。",
		"安全で倫理的に問題のない内容のみを生成してください。",
	].join("\n");
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

function getMissionJsonSchema(missionCount: number) {
	return {
		name: "trip_mission_generation",
		strict: true,
		schema: {
			type: "object",
			additionalProperties: false,
			required: ["missions"],
			properties: {
				missions: {
					type: "array",
					minItems: missionCount,
					maxItems: missionCount,
					items: {
						type: "object",
						additionalProperties: false,
						required: [
							"missionName",
							"description",
							"type1",
							"points",
							"type2",
							"additional",
						],
						properties: {
							missionName: { type: "string" },
							description: { type: "string" },
							type1: { type: "string" },
							points: {
								type: "number",
								enum: [...MISSION_POINT_VALUES],
							},
							type2: { type: "string" },
							additional: {
								type: "array",
								minItems: 3,
								maxItems: 3,
								items: { type: "string" },
							},
						},
					},
				},
			},
		},
	};
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

function validateMission(value: unknown): GeneratedMission {
	if (!isRecord(value)) {
		throw new Error("GPT の応答が JSON オブジェクトではありませんでした。");
	}

	const additional = value.additional;

	if (
		typeof value.missionName !== "string" ||
		typeof value.description !== "string" ||
		typeof value.type1 !== "string" ||
		typeof value.type2 !== "string" ||
		typeof value.points !== "number" ||
		!Array.isArray(additional) ||
		additional.length !== 3 ||
		additional.some((item) => typeof item !== "string")
	) {
		throw new Error("GPT の応答形式が期待値と一致しませんでした。");
	}

	return {
		missionName: value.missionName,
		description: value.description,
		type1: value.type1,
		points: value.points,
		type2: value.type2,
		additional: additional as [string, string, string],
	};
}

function validateMissionResponse(
	value: unknown,
	missionCount?: number,
): GeneratedMissionResponse {
	if (Array.isArray(value)) {
		const response = {
			missions: value.map((item) => validateMission(item)),
		};

		if (
			typeof missionCount === "number" &&
			response.missions.length < missionCount
		) {
			throw new Error("GPT の応答ミッション数が不足しています。");
		}

		return response;
	}

	if (!isRecord(value)) {
		throw new Error("GPT の応答が JSON オブジェクトではありませんでした。");
	}

	const missions = value.missions;

	if (!Array.isArray(missions) || missions.length === 0) {
		throw new Error("GPT の応答に missions 配列がありませんでした。");
	}

	const response = {
		missions: missions.map((item) => validateMission(item)),
	};

	if (typeof missionCount === "number" && response.missions.length < missionCount) {
		throw new Error("GPT の応答ミッション数が不足しています。");
	}

	return response;
}

async function callOpenAI(travelText: string, input: MissionGenerationInput) {
	const apiKey = getOpenAIApiKey();
	const missionCount = normalizeMissionCount(
		input.missionCount ?? getDefaultMissionCount(input.generationMode),
	);
	const missionLabel = getMissionLabel(input.generationMode);
	const missionModePrompt = getMissionModePrompt(input.generationMode);
	const playerName = input.playerName ?? input.username ?? "（未指定）";

	if (!apiKey) {
		throw new Error(".openai.key か OPENAI_API_KEY が設定されていません。");
	}

	let lastError: Error | null = null;
	const retryDeadline = Date.now() + OPENAI_MAX_RETRY_WINDOW_MS;
	let attempt = 0;

	while (Date.now() < retryDeadline) {
		attempt += 1;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS);

		try {
			const response = await fetch(OPENAI_API_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				signal: controller.signal,
				body: JSON.stringify({
					model: OPENAI_MODEL,
					temperature: 0.4,
					response_format: {
						type: "json_schema",
						json_schema: getMissionJsonSchema(missionCount),
					},
					messages: [
						{
							role: "system",
							content: missionModePrompt,
						},
						{
							role: "user",
							content: [
								`それをもとに、旅行中に実行できる${missionLabel}を生成してください。`,
								input.generationMode === "secret"
									? `対象ユーザー: ${playerName}`
									: "",
								"",
								"# 目的",
								input.generationMode === "secret"
									? "- 個人ごとに違う行動を促してゲーム性を高める"
									: "- 全員で協力・共有して楽しめる体験を作る",
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
								"# 出力ルール",
								input.generationMode === "secret"
									? `- 極秘ミッションはちょうど${missionCount}個生成する`
									: `- 共通ミッションはちょうど${missionCount}個生成する`,
								input.generationMode === "secret"
									? "- 個人で実行できる内容にする"
									: "- 全員で同時または協力して達成できる内容にする",
								"- 内容はバリエーションを持たせる",
								input.generationMode === "secret"
									? "- 迷惑にならない範囲で行動する内容にする"
									: "",
								input.generationMode === "secret"
									? "- 行き先がわかるなら行先に関連したミッションにする"
									: "",
								"- missionName は短く具体的にする",
								"- description は1〜2文で具体的に書く",
								"- type1 は内容分類の短い文字列にする",
								"- type2 は空文字でよい",
								"- points は 10,20,30,40,50 のいずれか",
								"- additional[0] にはクリア方法の数値を文字列で入れる",
								"- additional[1], additional[2] は空文字でよい",
								"",
								"# クリア方法",
								"0：そのまま完了",
								"1：投票",
								"2：写真付き投票",
								input.generationMode === "secret"
									? "3：位置情報で判定"
									: "",
								"",
								"# 入力",
								`旅行名: ${input.tripTitle ?? "（未指定）"}`,
								`自由記述: ${travelText}`,
							]
								.filter(Boolean)
								.join("\n"),
						},
					],
				}),
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text().catch(() => "");

				if (shouldRetryStatus(response.status) && Date.now() < retryDeadline) {
					await sleep(Math.min(OPENAI_RETRY_DELAY_MS * attempt, 5_000));
					continue;
				}

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

			try {
				const parsed = JSON.parse(content) as unknown;
				return validateMissionResponse(parsed, missionCount);
			} catch (jsonError) {
				try {
					return parseMissionResponseText(content);
				} catch {
					throw jsonError;
				}
			}
		} catch (error) {
			clearTimeout(timeoutId);
			lastError =
				error instanceof Error ? error : new Error("OpenAI 呼び出しに失敗しました。");

			if (error instanceof Error && error.name === "AbortError") {
				lastError = new Error("OpenAI API の応答がタイムアウトしました。");
			}

			if (shouldRetryError(lastError) && Date.now() < retryDeadline) {
				await sleep(Math.min(OPENAI_RETRY_DELAY_MS * attempt, 5_000));
				continue;
			}

			throw lastError;
		}
	}

	throw (
		lastError ??
		new Error(
			`OpenAI からミッションを生成できませんでした。${Math.floor(
				OPENAI_MAX_RETRY_WINDOW_MS / 1000,
			)}秒以内に有効な応答を取得できませんでした。`,
		)
	);
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
