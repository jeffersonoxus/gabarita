import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg)]">
      <div className="w-20 h-20 rounded-2xl bg-[var(--text)] flex items-center justify-center text-[var(--bg)] text-3xl font-bold mb-6">G</div>
      <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Gabarita+</h1>
      <p className="text-[var(--text-secondary)] text-center mb-8 max-w-xs">Simulados por disciplina e conteúdo. Do edital para a prática.</p>
      <Link href="/login" className="px-8 py-3.5 rounded-xl text-sm font-medium bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-all active:scale-[0.98]">
        Acessar
      </Link>
    </div>
  );
}
