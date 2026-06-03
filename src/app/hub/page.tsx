import { createSupabaseServer } from "@/lib/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Building2, Wrench } from "lucide-react";

export default async function HubPage() {
  const sup = await createSupabaseServer();
  const { data: { user } } = await sup.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sup.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: concursos } = await sup.from("concursos").select("*").order("created_at", { ascending: false });
  const role = profile?.role || "free";

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {role === "free" && (
          <Card className="mb-8 border-dashed bg-muted/30">
            <CardContent className="flex items-center justify-between flex-wrap gap-4 p-5">
              <div>
                <p className="font-semibold flex items-center gap-2">Plano Pro <Badge variant="default">R$ 14,90/mês</Badge></p>
                <p className="text-sm text-muted-foreground mt-1">Acesso ilimitado a todos os simulados com gabarito comentado.</p>
              </div>
              <form action="/api/stripe/checkout" method="POST"><Button>Assinar Pro</Button></form>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Concursos</h1>
            <p className="text-sm text-muted-foreground mt-1">Escolha um concurso para praticar</p>
          </div>
        </div>

        {!concursos || concursos.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">Nenhum concurso disponivel.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {concursos.map((c: any) => (
              <ConcursoCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ConcursoCard({ c }: { c: any }) {
  const isBreve = c.status === "breve";
  const isManutencao = c.status === "manutenção";

  const card = (
    <Card className={`hover:shadow-md transition-all duration-200 group h-full ${isBreve ? "opacity-50" : "hover:border-primary/50 cursor-pointer"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{c.nome}</CardTitle>
          {isManutencao && <span className="text-xs flex items-center gap-1 text-amber-600 shrink-0"><Wrench className="w-3 h-3" />Em atualização</span>}
          {isBreve && <span className="text-xs text-muted-foreground shrink-0">Em breve</span>}
        </div>
        {c.descricao && <CardDescription className="text-xs line-clamp-2">{c.descricao}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {c.banca && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{c.banca}</span>}
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.data_prova ? new Date(c.data_prova + "T00:00:00").toLocaleDateString("pt-BR") : "Previsto"}</span>
        </div>
        <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
          {isBreve ? "Disponivel em breve" : isManutencao ? <>Acessar <ArrowRight className="w-3.5 h-3.5" /></> : <>Iniciar simulado <ArrowRight className="w-3.5 h-3.5" /></>}
        </span>
      </CardContent>
    </Card>
  );

  if (isBreve) return <div>{card}</div>;
  return <Link href={`/simulado/${c.slug || c.id}`}>{card}</Link>;
}
