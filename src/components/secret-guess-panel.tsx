"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Icon } from "@/components/app-ui";
import type {
  MissionHuntRankingEntry,
  SecretGuessGame,
  SecretGuessScoreResult,
} from "@/lib/supabase";
import { buildCompetitionRanks } from "@/lib/ranking";

type ScoreRow = MissionHuntRankingEntry;

type SecretGuessPanelProps = {
  game: SecretGuessGame;
  initialRanking: MissionHuntRankingEntry[];
  initialResult: SecretGuessScoreResult | null;
  initialOpen?: boolean;
  winnerMessage: string | null;
  finishButton: ReactNode;
};

export default function SecretGuessPanel({
  game,
  initialRanking,
  initialResult,
  initialOpen = false,
  winnerMessage,
  finishButton,
}: SecretGuessPanelProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [draggingMissionId, setDraggingMissionId] = useState<string | null>(null);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [result, setResult] = useState<SecretGuessScoreResult | null>(initialResult);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const scoreRows: ScoreRow[] = result?.ranking ?? initialRanking;
  const scoreRanks = buildCompetitionRanks(
    scoreRows.map((row) => ({ points: row.total_points ?? row.mission_points })),
  );
  const currentWinnerMessage = result?.winner_message ?? winnerMessage;
  const assignedMissionIds = new Set(Object.keys(assignments));
  const hasHuntCandidates = game.members.length > 0 && game.missions.length > 0;
  const unassignedMissions = game.missions.filter(
    (mission) => !assignedMissionIds.has(String(mission.id)),
  );
  const missionsByMemberId = useMemo(() => {
    const grouped = new Map<string, typeof game.missions>();

    for (const member of game.members) {
      grouped.set(member.id, []);
    }

    for (const [missionId, userId] of Object.entries(assignments)) {
      const mission = game.missions.find((item) => String(item.id) === missionId);

      if (!mission) {
        continue;
      }

      grouped.set(userId, [...(grouped.get(userId) ?? []), mission]);
    }

    return grouped;
  }, [assignments, game]);

  function assignMission(targetUserId: string) {
    const missionId = draggingMissionId ?? selectedMissionId;

    if (!missionId) {
      return;
    }

    setAssignments((current) => ({
      ...current,
      [missionId]: targetUserId,
    }));
    setDraggingMissionId(null);
    setSelectedMissionId(null);
  }

  function unassignMission() {
    const missionId = draggingMissionId ?? selectedMissionId;

    if (!missionId) {
      return;
    }

    setAssignments((current) => {
      const next = { ...current };
      delete next[missionId];
      return next;
    });
    setDraggingMissionId(null);
    setSelectedMissionId(null);
  }

  async function submitGuesses() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/missions/secret-guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignments: Object.entries(assignments).map(
            ([missionId, targetUserId]) => ({
              missionId,
              targetUserId,
            }),
          ),
        }),
      });
      const data = (await response.json()) as
        | SecretGuessScoreResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "極秘ミッション当ての採点に失敗しました。",
        );
      }

      setResult(data as SecretGuessScoreResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "極秘ミッション当ての採点に失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase text-[#2f7d6b] dark:text-[#38bdf8]">
          Ranking
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[#14231f] dark:text-[#e6edf7]">
          ランキング
        </h2>
        {currentWinnerMessage ? (
          <p className="mt-3 rounded-md bg-[#fff4df] px-3 py-2 text-sm font-bold text-[#8b5a1f] dark:bg-[#3a2b13] dark:text-[#fbbf24]">
            {currentWinnerMessage}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
            ミッションハント未完了の参加者は +??? 点として表示中
          </p>
        )}
      </div>

      <ol className="mt-5 grid gap-3">
        {scoreRows.map((row, index) => (
          <li
            key={row.user_id}
            className={`grid min-h-16 grid-cols-[44px_1fr_auto] items-center gap-3 rounded-md border p-3 ${
              row.is_me
                ? "border-[#88b9a7] bg-[#eef6f1] dark:border-[#2563eb] dark:bg-[#102a56]"
                : "border-[#e0e6df] bg-[#fbfcf8] dark:border-[#26364f] dark:bg-[#0b1626]"
            }`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-md bg-white text-base font-bold text-[#2f7d6b] dark:bg-[#0f1b2d] dark:text-[#2dd4bf]">
              {scoreRanks[index]}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-[#14231f] dark:text-[#e6edf7]">
                {row.display_name}
                {row.is_me ? "（自分）" : ""}
              </p>
              <p className="text-xs text-[#5d6a63] dark:text-[#93a4b8]">
                {row.hunt_completed
                  ? `ハント ${formatSigned(row.guess_points ?? 0)} pt`
                  : "ハント +??? pt"}
              </p>
            </div>
            <p className="text-right text-lg font-bold text-[#14231f] dark:text-[#e6edf7]">
              {row.total_points ?? row.mission_points}
              <span className="ml-1 text-xs text-[#5d6a63] dark:text-[#93a4b8]">
                {row.total_points === null ? "+??? pt" : "pt"}
              </span>
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#315f9a] px-5 text-sm font-bold text-white transition hover:bg-[#294f80] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
        >
          <Icon name="target" />
          ミッションハント
        </button>
        {finishButton}
      </div>

      {result ? (
        <div className="mt-4 rounded-md border border-[#e0e6df] bg-[#fbfcf8] p-3 dark:border-[#26364f] dark:bg-[#0b1626]">
          <p className="text-sm font-bold text-[#14231f] dark:text-[#e6edf7]">
            自分のハント結果: {formatSigned(result.guess_delta)} pt
          </p>
        </div>
      ) : null}

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-[#08111f]/65 px-4 py-6"
        >
          <section className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-md border border-[#d8e0d9] bg-white p-4 shadow-xl dark:border-[#26364f] dark:bg-[#0f1b2d] sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#e1e6df] pb-4 dark:border-[#26364f]">
              <div>
                <p className="text-xs font-bold uppercase text-[#2f7d6b] dark:text-[#38bdf8]">
                  Drag & Drop
                </p>
                <h3 className="mt-1 text-2xl font-bold text-[#14231f] dark:text-[#e6edf7]">
                  自分以外のミッションをユーザーへ割り当て
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#cfd8d1] bg-white text-xl font-bold text-[#2e5149] transition hover:border-[#2f7d6b] hover:bg-[#eef5f1] dark:border-[#26364f] dark:bg-[#0f1b2d] dark:text-[#dbeafe]"
              >
                x
              </button>
            </div>

            {result ? (
              <MissionHuntResultView
                result={result}
                onClose={() => setIsOpen(false)}
              />
            ) : (
              <>
                <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
                  <DropZone
                    title="未割り当て"
                    onDrop={unassignMission}
                    onAssign={selectedMissionId ? unassignMission : undefined}
                    className="min-h-80"
                  >
                    {unassignedMissions.map((mission) => (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        isSelected={selectedMissionId === String(mission.id)}
                        onSelect={() =>
                          setSelectedMissionId((current) =>
                            current === String(mission.id) ? null : String(mission.id),
                          )
                        }
                        onDragStart={() => setDraggingMissionId(String(mission.id))}
                      />
                    ))}
                  </DropZone>

                  <div className="grid gap-4 md:grid-cols-2">
                    {game.members.map((member) => (
                      <DropZone
                        key={member.id}
                        title={member.display_name}
                        subtitle={`@${member.username}`}
                        onDrop={() => assignMission(member.id)}
                        onAssign={
                          selectedMissionId ? () => assignMission(member.id) : undefined
                        }
                      >
                        {(missionsByMemberId.get(member.id) ?? []).map((mission) => (
                          <MissionCard
                            key={mission.id}
                            mission={mission}
                            isSelected={selectedMissionId === String(mission.id)}
                            onSelect={() =>
                              setSelectedMissionId((current) =>
                                current === String(mission.id)
                                  ? null
                                  : String(mission.id),
                              )
                            }
                            onDragStart={() => setDraggingMissionId(String(mission.id))}
                          />
                        ))}
                      </DropZone>
                    ))}
                  </div>
                </div>

                {errorMessage ? (
                  <p className="mt-4 rounded-md border border-[#efc9c1] bg-[#fff6f3] px-3 py-2 text-sm font-medium text-[#9a3e2d] dark:border-[#7f2a2a] dark:bg-[#351515] dark:text-[#fca5a5]">
                    {errorMessage}
                  </p>
                ) : null}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={submitGuesses}
                    disabled={
                      isSubmitting ||
                      (hasHuntCandidates && Object.keys(assignments).length === 0)
                    }
                    className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-md bg-[#2f7d6b] px-5 text-sm font-bold text-white transition hover:bg-[#276452] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7]"
                  >
                    <Icon name="check" />
                    {isSubmitting ? "採点中..." : "採点する"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function MissionHuntResultView({
  result,
  onClose,
}: {
  result: SecretGuessScoreResult;
  onClose: () => void;
}) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-3">
        {result.results.map((item) => (
          <article
            key={item.mission_id}
            className={`rounded-md border p-4 ${
              item.correct
                ? "border-[#88b9a7] bg-[#eef6f1] dark:border-[#2563eb] dark:bg-[#102a56]"
                : "border-[#efc9c1] bg-[#fff6f3] dark:border-[#7f2a2a] dark:bg-[#351515]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[#14231f] dark:text-[#e6edf7]">
                  {item.mission_name}
                </p>
                {item.mission_description ? (
                  <p className="mt-2 text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
                    {item.mission_description}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-[#5d6a63] dark:text-[#93a4b8]">
                  {item.correct ? "正解" : "不正解"}
                  {item.target_display_name ? ` / 予想: ${item.target_display_name}` : ""}
                  {item.actual_display_name ? ` / 正解: ${item.actual_display_name}` : ""}
                </p>
              </div>
              <p
                className={`text-xl font-bold ${
                  item.correct
                    ? "text-[#2f7d6b] dark:text-[#2dd4bf]"
                    : "text-[#9a3e2d] dark:text-[#fca5a5]"
                }`}
              >
                {item.correct ? "○" : "×"} {formatSigned(item.points)} pt
              </p>
            </div>
          </article>
        ))}

        {result.revealed_missions.length > 0 ? (
          <section className="rounded-md border border-[#d8e0d9] bg-white p-4 dark:border-[#26364f] dark:bg-[#0f1b2d]">
            <p className="text-xs font-bold uppercase text-[#2f7d6b] dark:text-[#38bdf8]">
              Secret Missions
            </p>
            <h4 className="mt-1 text-lg font-bold text-[#14231f] dark:text-[#e6edf7]">
              極秘ミッション公開
            </h4>
            <div className="mt-3 grid gap-3">
              {result.revealed_missions.map((mission) => (
                <article
                  key={mission.mission_id}
                  className="rounded-md border border-[#e0e6df] bg-[#fbfcf8] p-3 dark:border-[#26364f] dark:bg-[#0b1626]"
                >
                  <p className="text-xs font-bold text-[#2f7d6b] dark:text-[#2dd4bf]">
                    {mission.owner_display_name}
                  </p>
                  <p className="mt-1 font-bold text-[#14231f] dark:text-[#e6edf7]">
                    {mission.mission_name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
                    {mission.mission_description}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <aside className="rounded-md border border-[#e0e6df] bg-[#fbfcf8] p-4 dark:border-[#26364f] dark:bg-[#0b1626]">
        <p className="text-xs font-bold uppercase text-[#2f7d6b] dark:text-[#38bdf8]">
          Mission Hunt Score
        </p>
        <p className="mt-3 text-4xl font-bold text-[#14231f] dark:text-[#e6edf7]">
          {formatSigned(result.guess_delta)} pt
        </p>
        <p className="mt-2 text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
          ミッションハントによる最終増減点です。
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2f7d6b] px-5 text-sm font-bold text-white transition hover:bg-[#276452] dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7]"
        >
          <Icon name="check" />
          ミッションハントを終了
        </button>
      </aside>
    </div>
  );
}

function DropZone({
  title,
  subtitle,
  className = "",
  children,
  onDrop,
  onAssign,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
  onDrop: () => void;
  onAssign?: () => void;
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={`rounded-md border border-dashed border-[#cfd8d1] bg-[#fbfcf8] p-3 dark:border-[#26364f] dark:bg-[#0b1626] ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[#14231f] dark:text-[#e6edf7]">{title}</p>
          {subtitle ? (
            <p className="text-xs text-[#5d6a63] dark:text-[#93a4b8]">{subtitle}</p>
          ) : null}
        </div>
        {onAssign ? (
          <button
            type="button"
            onClick={onAssign}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-md bg-[#315f9a] px-3 text-xs font-bold text-white transition hover:bg-[#294f80] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
          >
            <Icon name="arrow" />
            配置
          </button>
        ) : null}
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function MissionCard({
  mission,
  isSelected,
  onSelect,
  onDragStart,
}: {
  mission: SecretGuessGame["missions"][number];
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className={`cursor-grab rounded-md border p-3 shadow-sm transition active:cursor-grabbing ${
        isSelected
          ? "border-[#315f9a] bg-[#eef4fb] ring-2 ring-[#315f9a]/25 dark:border-[#38bdf8] dark:bg-[#132b45]"
          : "border-[#e0e6df] bg-white dark:border-[#26364f] dark:bg-[#0f1b2d]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-[#14231f] dark:text-[#e6edf7]">
          {mission.mission_name}
        </p>
        {isSelected ? (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#315f9a] text-white dark:bg-[#2563eb]">
            <Icon name="check" className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-5 text-[#5d6a63] dark:text-[#93a4b8]">
        {mission.mission_description}
      </p>
      <p className="mt-2 text-xs font-bold text-[#2f7d6b] dark:text-[#2dd4bf]">
        {Math.floor(mission.point / 2)} pt / miss -10 pt
      </p>
    </article>
  );
}
