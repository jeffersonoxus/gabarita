"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { getBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

type Concurso = Record<string, any>;

export default function HubPage() {
  const [data, setData] = useState<Concurso[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const sup = getBrowserClient();
    const { data: concursos, error: err } = await sup.from("concursos").select();
    if (err) {
      setError(err.message);
      return;
    }
    setData(concursos);
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <AppShell>
        <ErrorState message={error} retry={load} />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <LoadingScreen message="Carregando concursos..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main aria-label="Lista de concursos">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Seus Concursos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione um concurso para iniciar os simulados
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-16">
              Nenhum concurso encontrado.
            </p>
          )}

          {data.map((concurso) => (
            <Link
              key={concurso.id}
              href={`/simulado/${concurso.slug}`}
              className="group"
              aria-label={`Ver simulados de ${concurso.nome || concurso.slug}`}
            >
              <Card className="transition-all hover:shadow-md hover:border-primary/50">
                <CardHeader className="">
                  <CardTitle className="text-base flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen
                        className="w-5 h-5 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="line-clamp-2">
                      {concurso.nome || concurso.slug}
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
