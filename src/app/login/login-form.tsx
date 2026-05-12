"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { BrandMark, Icon } from "@/components/app-ui";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "ログインに失敗しました。");
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "ログインに失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 rounded-md border border-[#d8e0d9] bg-white p-6 shadow-sm dark:border-[#26364f] dark:bg-[#0f1b2d] sm:p-8"
    >
      <div className="grid gap-6">
        <BrandMark />
        <div>
          <p className="text-xs font-bold uppercase text-[#2f7d6b] dark:text-[#38bdf8]">Login</p>
          <h1 className="mt-1 text-3xl font-bold text-[#14231f] dark:text-[#e6edf7]">ログイン</h1>
          <p className="mt-2 text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
            ユーザー名とパスワードで TabiQuest に入ります。
          </p>
        </div>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-[#24312d] dark:text-[#dbeafe]">
        ユーザー名
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="h-11 rounded-md border border-[#cfd8d1] bg-[#fbfcf8] px-3 text-base outline-none transition focus:border-[#2f7d6b] focus:ring-3 focus:ring-[#2f7d6b]/15 dark:border-[#26364f] dark:bg-[#0b1626] dark:text-[#e6edf7] dark:placeholder:text-[#64748b] dark:focus:border-[#38bdf8] dark:focus:ring-[#38bdf8]/15"
          placeholder="ユーザー名を入力"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-[#24312d] dark:text-[#dbeafe]">
        パスワード
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="h-11 rounded-md border border-[#cfd8d1] bg-[#fbfcf8] px-3 text-base outline-none transition focus:border-[#2f7d6b] focus:ring-3 focus:ring-[#2f7d6b]/15 dark:border-[#26364f] dark:bg-[#0b1626] dark:text-[#e6edf7] dark:placeholder:text-[#64748b] dark:focus:border-[#38bdf8] dark:focus:ring-[#38bdf8]/15"
          placeholder="パスワードを入力"
          required
        />
      </label>

      {errorMessage ? (
        <p className="rounded-md border border-[#efc9c1] bg-[#fff6f3] px-3 py-2 text-sm font-medium text-[#9a3e2d] dark:border-[#7f2a2a] dark:bg-[#351515] dark:text-[#fca5a5]">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2f7d6b] px-4 text-sm font-bold text-white transition hover:bg-[#276452] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7]"
      >
        <Icon name="arrow" />
        {isSubmitting ? "ログイン中..." : "ログイン"}
      </button>

      <p className="text-sm text-[#5d6a63] dark:text-[#93a4b8]">
        初めての方は{" "}
        <Link href="/signup" className="font-semibold text-[#2f7d6b] dark:text-[#38bdf8]">
          新規登録
        </Link>
      </p>
    </form>
  );
}
