import Link from "next/link";

export default function MissionGenerationErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] px-4 py-8 text-[#18211f]">
      <section className="w-full max-w-lg rounded-lg border border-[#ebc8c1] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-[#9a3e2d]">Mission Error</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal">
          ミッション生成に失敗しました
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#59645f]">
          AI によるミッション生成を3回試しましたが、完了できませんでした。
          時間をおいてからもう一度お試しください。
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-[#236b5b] px-5 text-sm font-bold text-white transition hover:bg-[#1c5649]"
        >
          トップへ戻る
        </Link>
      </section>
    </main>
  );
}
