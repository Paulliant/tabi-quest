"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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
      className="grid gap-4 rounded-lg border border-[#d9ddd0] bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <p className="text-sm font-semibold text-[#4f7668]">Login</p>
        <h1 className="mt-1 text-3xl font-bold text-[#17211f]">ログイン</h1>
        <p className="mt-2 text-sm leading-6 text-[#59645f]">
          ユーザー名とパスワードで TabiQuest に入ります。
        </p>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-[#24312d]">
        ユーザー名
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="h-11 rounded-md border border-[#cfd5ca] bg-[#fbfcf8] px-3 text-base outline-none transition focus:border-[#4f7668]"
          placeholder="ユーザー名を入力"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-[#24312d]">
        パスワード
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="h-11 rounded-md border border-[#cfd5ca] bg-[#fbfcf8] px-3 text-base outline-none transition focus:border-[#4f7668]"
          placeholder="パスワードを入力"
          required
        />
      </label>

      {errorMessage ? (
        <p className="rounded-md border border-[#ebc8c1] bg-[#fff5f3] px-3 py-2 text-sm text-[#9a3e2d]">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-[#236b5b] text-sm font-bold text-white transition hover:bg-[#1c5649] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "ログイン中..." : "ログイン"}
      </button>

      <p className="text-sm text-[#59645f]">
        初めての方は{" "}
        <Link href="/signup" className="font-semibold text-[#236b5b]">
          新規登録
        </Link>
      </p>
    </form>
  );
}
