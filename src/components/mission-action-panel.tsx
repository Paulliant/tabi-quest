"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useRef, useState } from "react";

import { Icon } from "@/components/app-ui";
import MissionVotePanel from "@/components/mission-vote-panel";
import { photoInputAccept, preparePhotoUpload } from "@/lib/photo-upload";
import type { MissionVoteCandidate } from "@/lib/supabase";

type MissionActionPanelProps = {
  missionId: string;
  process: 0 | 1 | 2;
  missionType: 0 | 1 | 2 | 3;
  photoBase64?: string | null;
  selectedTargetUserId?: string | null;
  voteCandidates?: MissionVoteCandidate[];
};

export default function MissionActionPanel({
  missionId,
  process,
  missionType,
  photoBase64,
  selectedTargetUserId = null,
  voteCandidates = [],
}: MissionActionPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoteOpen, setIsVoteOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function completeMission() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/missions/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          missionId,
          additional: {},
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "ミッションの更新に失敗しました。");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ミッションの更新に失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const photo = await preparePhotoUpload(file);

      const response = await fetch("/api/missions/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          missionId,
          additional: {
            photo_base64: photo.dataUrl,
            photo_name: photo.name,
            photo_type: photo.type,
            photo_size: photo.size,
          },
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "写真のアップロードに失敗しました。");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "写真のアップロードに失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
      event.target.value = "";
    }
  }

  if (missionType === 1) {
    const isVoted = process === 2;

    return (
      <div className="grid gap-2 justify-items-start sm:justify-items-end">
        <button
          type="button"
          onClick={() => setIsVoteOpen(true)}
          className="inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-md bg-[#315f9a] px-5 text-sm font-bold text-white transition hover:bg-[#294f80] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
        >
          <Icon name={isVoted ? "check" : "vote"} />
          {isVoted ? "投票を変更" : "投票する"}
        </button>
        <VoteModal
          isOpen={isVoteOpen}
          missionId={missionId}
          missionType={1}
          selectedTargetUserId={selectedTargetUserId}
          candidates={voteCandidates}
          onClose={() => setIsVoteOpen(false)}
        />
      </div>
    );
  }

  if (missionType === 2) {
    const hasPhoto = Boolean(photoBase64);
    const isVoted = process === 2;

    return (
      <div className="grid max-w-48 gap-3 justify-items-start sm:justify-items-end">
        {hasPhoto ? (
          <>
            <button
              type="button"
              onClick={() => setIsVoteOpen(true)}
              className="inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-md bg-[#315f9a] px-5 text-sm font-bold text-white transition hover:bg-[#294f80] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
            >
              <Icon name={isVoted ? "check" : "vote"} />
              {isVoted ? "投票を変更" : "投票する"}
            </button>
            <VoteModal
              isOpen={isVoteOpen}
              missionId={missionId}
              missionType={2}
              selectedTargetUserId={selectedTargetUserId}
              candidates={voteCandidates}
              onClose={() => setIsVoteOpen(false)}
            />
          </>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={photoInputAccept}
              onChange={uploadPhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-md bg-[#2f7d6b] px-5 text-sm font-bold text-white transition hover:bg-[#276452] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7]"
            >
              <Icon name="photo" />
              {isSubmitting ? "アップロード中..." : "写真アップロード"}
            </button>
          </>
        )}

        {errorMessage ? (
          <p className="max-w-48 text-sm font-medium text-[#9a3e2d] dark:text-[#fca5a5]">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  const isDone = process === 2;
  const disabled = isSubmitting || isDone;
  const label = isSubmitting
    ? "処理中..."
    : isDone
      ? "完了済み"
      : "完了する";

  return (
    <div className="grid gap-2 justify-items-start sm:justify-items-end">
      <button
        type="button"
        onClick={completeMission}
        disabled={disabled}
        className={`inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold transition ${
          isDone
            ? "bg-[#edf0eb] text-[#59645f] dark:bg-[#172033] dark:text-[#b6c2d2]"
            : "bg-[#2f7d6b] text-white hover:bg-[#276452] dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7]"
        } disabled:cursor-not-allowed disabled:opacity-75`}
      >
        <Icon name={isDone ? "check" : "target"} />
        {label}
      </button>

      {errorMessage ? (
        <p className="max-w-40 text-sm font-medium text-[#9a3e2d] dark:text-[#fca5a5]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function VoteModal({
  isOpen,
  missionId,
  missionType,
  selectedTargetUserId,
  candidates,
  onClose,
}: {
  isOpen: boolean;
  missionId: string;
  missionType: 1 | 2;
  selectedTargetUserId: string | null;
  candidates: MissionVoteCandidate[];
  onClose: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#08111f]/65 px-4 py-6"
    >
      <section className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-md border border-[#d8e0d9] bg-white p-4 shadow-xl dark:border-[#26364f] dark:bg-[#0f1b2d] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#e1e6df] pb-4 dark:border-[#26364f]">
          <div>
            <p className="text-xs font-bold uppercase text-[#2f7d6b] dark:text-[#38bdf8]">
              Vote
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#14231f] dark:text-[#e6edf7]">
              投票先を選択
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
              {missionType === 2
                ? "写真をアップロード済みのメンバーに投票できます。"
                : "自分以外のメンバーに投票できます。"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#cfd8d1] bg-white text-xl font-bold text-[#2e5149] transition hover:border-[#2f7d6b] hover:bg-[#eef5f1] dark:border-[#26364f] dark:bg-[#0f1b2d] dark:text-[#dbeafe] dark:hover:border-[#38bdf8] dark:hover:bg-[#172033]"
          >
            x
          </button>
        </div>

        <MissionVotePanel
          missionId={missionId}
          missionType={missionType}
          selectedTargetUserId={selectedTargetUserId}
          candidates={candidates}
          onVoted={onClose}
        />
      </section>
    </div>
  );
}
