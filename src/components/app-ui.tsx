import type { ReactNode } from "react";

type IconName =
  | "arrow"
  | "check"
  | "flag"
  | "join"
  | "map"
  | "medal"
  | "moon"
  | "settings"
  | "spark"
  | "sun"
  | "target"
  | "user";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-[#d8e4dc] bg-white shadow-sm dark:border-[#26364f] dark:bg-[#0f1b2d]">
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          className="h-8 w-8"
          fill="none"
        >
          <path
            d="M8 32.5 19.5 8l20 7.5L28 40 8 32.5Z"
            fill="#f5b44c"
            stroke="#17342f"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="m19.5 8 2 22.5M39.5 15.5 21.5 30.5"
            stroke="#17342f"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="28.5" cy="20.5" r="4.5" fill="#2f7d6b" />
        </svg>
      </div>
      <div>
        <p className="text-xl font-bold leading-6 text-[#14231f] dark:text-[#e6edf7]">TabiQuest</p>
        {!compact ? (
          <p className="text-xs font-medium text-[#607069] dark:text-[#93a4b8]">
            旅先のひとときを、ミッションでもっと面白く。
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    ),
    check: (
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    ),
    flag: (
      <path d="M6 21V5m0 1h10l-1.5 4L16 14H6" strokeLinecap="round" strokeLinejoin="round" />
    ),
    join: (
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
    ),
    map: (
      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6" strokeLinecap="round" strokeLinejoin="round" />
    ),
    medal: (
      <path d="M8 3h8l-2 5H10L8 3Zm2 5 2 3 2-3m-7 9a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
    moon: (
      <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 9 9 0 1 0 20.5 15.5Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
    settings: (
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M1 12h3m16 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" strokeLinecap="round" strokeLinejoin="round" />
    ),
    spark: (
      <path d="M12 2 9.8 8.8 3 11l6.8 2.2L12 20l2.2-6.8L21 11l-6.8-2.2L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
    sun: (
      <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m14.4-6.4 1.4-1.4M4.2 19.8l1.4-1.4m12.8 0 1.4 1.4M4.2 4.2l1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
    target: (
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
    user: (
      <path d="M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {paths[name]}
    </svg>
  );
}

export function AuthShell({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <main className="relative min-h-screen bg-[#f4f6f1] text-[#14231f] dark:bg-[#08111f] dark:text-[#e6edf7]">
      {action ? (
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">{action}</div>
      ) : null}
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8 sm:px-6">
        <div className="w-full">{children}</div>
      </div>
    </main>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#14231f] dark:bg-[#08111f] dark:text-[#e6edf7]">
      {children}
    </main>
  );
}

export function AppHeader({ children }: { children: ReactNode }) {
  return (
    <header className="border-b border-[#d8e0d9] bg-white/95 dark:border-[#26364f] dark:bg-[#0b1626]/95">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <BrandMark compact />
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}

export function SettingsButton() {
  return (
    <button
      type="button"
      title="設定"
      aria-label="設定"
      className="grid h-10 w-10 place-items-center rounded-md border border-[#cfd8d1] bg-white text-[#2e5149] transition hover:border-[#2f7d6b] hover:bg-[#eef5f1] dark:border-[#26364f] dark:bg-[#0f1b2d] dark:text-[#dbeafe] dark:hover:border-[#38bdf8] dark:hover:bg-[#172033]"
    >
      <Icon name="settings" />
    </button>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#e1e6df] pb-4 dark:border-[#26364f] sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase text-[#2f7d6b] dark:text-[#38bdf8]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-normal text-[#14231f] dark:text-[#e6edf7]">
          {title}
        </h2>
      </div>
      {description ? (
        <p className="max-w-md text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">{description}</p>
      ) : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  detail,
  icon,
  tone = "green",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: IconName;
  tone?: "green" | "amber" | "blue";
}) {
  const toneClass = {
    green: "bg-[#eef6f1] text-[#2f7d6b] dark:bg-[#12313f] dark:text-[#2dd4bf]",
    amber: "bg-[#fff4df] text-[#9b6423] dark:bg-[#3a2b13] dark:text-[#fbbf24]",
    blue: "bg-[#eef4fb] text-[#315f9a] dark:bg-[#132b45] dark:text-[#38bdf8]",
  }[tone];

  return (
    <div className="grid min-h-28 grid-rows-[2rem_1fr_2rem] rounded-md border border-[#e0e6df] bg-white p-4 dark:border-[#26364f] dark:bg-[#0f1b2d]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase text-[#66736c] dark:text-[#93a4b8]">{label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-md ${toneClass}`}>
          <Icon name={icon} />
        </span>
      </div>
      <div className="flex items-center">
        <p className="break-words text-3xl font-bold leading-none text-[#14231f] dark:text-[#e6edf7]">
          {value}
        </p>
      </div>
      <div className="flex items-end">
        {detail ? (
          <p className="text-sm leading-5 text-[#5d6a63] dark:text-[#93a4b8]">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "blue" | "dark" | "amber" | "muted";
}) {
  const toneClass = {
    amber: "bg-[#fff4df] text-[#8b5a1f] dark:bg-[#3a2b13] dark:text-[#fbbf24]",
    blue: "bg-[#eef4fb] text-[#315f9a] dark:bg-[#132b45] dark:text-[#38bdf8]",
    dark: "bg-[#1f2d29] text-white dark:bg-[#dbeafe] dark:text-[#08111f]",
    green: "bg-[#e2f0e8] text-[#276452] dark:bg-[#12313f] dark:text-[#2dd4bf]",
    muted: "bg-[#edf0eb] text-[#59645f] dark:bg-[#172033] dark:text-[#b6c2d2]",
  }[tone];

  return (
    <span className={`inline-flex min-h-7 items-center rounded-md px-2.5 py-1 text-xs font-bold ${toneClass}`}>
      {children}
    </span>
  );
}
