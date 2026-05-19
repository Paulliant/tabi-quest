"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

import { Icon } from "@/components/app-ui";

type MissionCompleteButtonProps = {
  missionId: string;
  process: 0 | 1 | 2;
  missionType?: 0 | 1 | 2 | 3;
};

export default function MissionCompleteButton({
  missionId,
  process,
  missionType = 0,
}: MissionCompleteButtonProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isPhotoUploadStep = missionType === 2 && process === 0;

  async function submitMission(additional: Record<string, unknown> = {}) {
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
          additional,
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

  function handleComplete() {
    if (isPhotoUploadStep) {
      fileInputRef.current?.click();
      return;
    }

    void submitMission();
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("写真の読み込みに失敗しました。"));
      };
      reader.onerror = () => reject(new Error("写真の読み込みに失敗しました。"));
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("画像ファイルを選択してください。");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const [, photoBase64 = dataUrl] = dataUrl.split(",", 2);

      await submitMission({
        photo_base64: photoBase64,
        photo_mime_type: file.type,
        photo_name: file.name,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "写真のアップロードに失敗しました。",
      );
    }
  }

  const isDone = process === 2;
  const disabled = isSubmitting || isDone;
  const activeStep =
    missionType === 2 && process === 0
      ? {
          label: "写真アップロード",
          icon: "photo" as const,
        }
      : missionType === 1 || (missionType === 2 && process === 1)
        ? {
            label: "投票",
            icon: "vote" as const,
          }
        : {
            label: "完了する",
            icon: "target" as const,
          };
  const label = isSubmitting
    ? "処理中..."
    : isDone
      ? "完了済み"
      : activeStep.label;

  return (
    <div className="grid gap-2">
      {isPhotoUploadStep ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handlePhotoSelected}
          disabled={disabled}
        />
      ) : null}

      <button
        type="button"
        onClick={handleComplete}
        disabled={disabled}
        className={`inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold transition ${
          isDone
            ? "bg-[#edf0eb] text-[#59645f] dark:bg-[#172033] dark:text-[#b6c2d2]"
            : "bg-[#2f7d6b] text-white hover:bg-[#276452] dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7]"
        } disabled:cursor-not-allowed disabled:opacity-75`}
      >
        <Icon name={isDone ? "check" : activeStep.icon} />
        {label}
      </button>

      {errorMessage ? (
        <p className="max-w-40 text-sm font-medium text-[#9a3e2d]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
