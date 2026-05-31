"use client";

import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} className="w-9 h-9 rounded-lg flex items-center justify-center text-sm border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-theme text-[var(--text-secondary)]" title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

export function HeaderNav() {
  return (
    <Link href="/api/auth/logout" className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-theme">
      Sair
    </Link>
  );
}
