"use client";

import { useEffect, useSyncExternalStore } from "react";

import { Icon } from "@/components/app-ui";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("tabiquest-theme");
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("tabiquest-theme-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("tabiquest-theme-change", onStoreChange);
  };
}

function getServerSnapshot(): Theme {
  return "light";
}

export default function ThemeToggleButton() {
  const theme = useSyncExternalStore(
    subscribe,
    getInitialTheme,
    getServerSnapshot,
  );
  const isDark = theme === "dark";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleClick() {
    const nextTheme = isDark ? "light" : "dark";
    window.localStorage.setItem("tabiquest-theme", nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("tabiquest-theme-change"));
  }

  return (
    <button
      type="button"
      title={isDark ? "ライトモード" : "ダークモード"}
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      aria-pressed={isDark}
      onClick={handleClick}
      className="grid h-10 w-10 place-items-center rounded-md border border-[#cfd8d1] bg-white text-[#2e5149] transition hover:border-[#2f7d6b] hover:bg-[#eef5f1] dark:border-[#26364f] dark:bg-[#0f1b2d] dark:text-[#dbeafe] dark:hover:border-[#38bdf8] dark:hover:bg-[#172033]"
    >
      <Icon name={isDark ? "sun" : "moon"} />
    </button>
  );
}
