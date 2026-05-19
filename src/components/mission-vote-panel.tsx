"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/app-ui";
import type { MissionVoteCandidate } from "@/lib/supabase";

type MissionVotePanelProps = {
  missionId: string;
  missionType: 1 | 2;
  selectedTargetUserId: string | null;
  candidates: MissionVoteCandidate[];
  onVoted?: () => void;
};

export default function MissionVotePanel({
  missionId,
  missionType,
  selectedTargetUserId,
  candidates,
  onVoted,
}: MissionVotePanelProps) {
  const router = useRouter();
  const [pendingTargetUserId, setPendingTargetUserId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function vote(targetUserId: string) {
    setErrorMessage("");
    setPendingTargetUserId(targetUserId);

    try {
      const response = await fetch("/api/missions/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          missionId,
          targetUserId,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "投票に失敗しました。");
      }

      router.refresh();
      onVoted?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "投票に失敗しました。",
      );
    } finally {
      setPendingTargetUserId("");
    }
  }

  return (
    <div className="grid gap-4">
      {candidates.map((candidate) => {
        const isSelected = candidate.user_id === selectedTargetUserId;
        const disabled = !candidate.can_vote || Boolean(pendingTargetUserId);

        return (
          <article
            key={candidate.user_id}
            className={`grid gap-4 rounded-md border p-4 ${
              isSelected
                ? "border-[#88b9a7] bg-[#eef6f1] dark:border-[#2563eb] dark:bg-[#102a56]"
                : "border-[#e0e6df] bg-[#fbfcf8] dark:border-[#26364f] dark:bg-[#0b1626]"
            } ${missionType === 2 ? "sm:grid-cols-[180px_1fr_auto]" : "sm:grid-cols-[1fr_auto]"}`}
          >
            {missionType === 2 ? (
              candidate.photo_base64 ? (
                <Image
                  src={candidate.photo_base64}
                  alt={`${candidate.display_name}の投稿写真`}
                  width={176}
                  height={132}
                  unoptimized
                  className="aspect-[4/3] w-full rounded-md border border-[#d8e0d9] object-cover dark:border-[#26364f] sm:w-44"
                />
              ) : (
                <div className="grid aspect-[4/3] w-full place-items-center rounded-md border border-dashed border-[#cfd8d1] bg-white text-center text-sm font-semibold text-[#66736c] dark:border-[#26364f] dark:bg-[#0f1b2d] dark:text-[#93a4b8] sm:w-44">
                  未アップロード
                </div>
              )
            ) : null}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[#14231f] dark:text-[#e6edf7]">
                  {candidate.display_name}
                </h2>
                {candidate.is_me ? (
                  <span className="rounded-md bg-[#edf0eb] px-2 py-1 text-xs font-bold text-[#59645f] dark:bg-[#172033] dark:text-[#b6c2d2]">
                    自分
                  </span>
                ) : null}
                {isSelected ? (
                  <span className="rounded-md bg-[#2f7d6b] px-2 py-1 text-xs font-bold text-white dark:bg-[#0ea5e9]">
                    投票中
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[#5d6a63] dark:text-[#93a4b8]">
                @{candidate.username}
              </p>
              {candidate.can_vote ? (
                <p className="mt-3 text-sm font-semibold text-[#2f7d6b] dark:text-[#2dd4bf]">
                  投票できます
                </p>
              ) : (
                <p className="mt-3 text-sm font-semibold text-[#66736c] dark:text-[#93a4b8]">
                  {candidate.is_me
                    ? "自分には投票できません"
                    : "投票対象外"}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => vote(candidate.user_id)}
              disabled={disabled}
              className="inline-flex h-11 min-w-28 items-center justify-center gap-2 self-center rounded-md bg-[#315f9a] px-5 text-sm font-bold text-white transition hover:bg-[#294f80] disabled:cursor-not-allowed disabled:bg-[#d8ded8] disabled:text-[#66736c] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8] dark:disabled:bg-[#172033] dark:disabled:text-[#93a4b8]"
            >
              <Icon name="vote" />
              {pendingTargetUserId === candidate.user_id
                ? "投票中..."
                : isSelected
                  ? "投票済み"
                  : "投票"}
            </button>
          </article>
        );
      })}

      {errorMessage ? (
        <p className="rounded-md border border-[#efc9c1] bg-[#fff6f3] px-3 py-2 text-sm font-medium text-[#9a3e2d] dark:border-[#7f2a2a] dark:bg-[#351515] dark:text-[#fca5a5]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
