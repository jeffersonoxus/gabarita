"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Moon, Sun } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const s = getBrowserClient();
    s.auth.getSession().then((res: any) => { if (res.data?.session) router.replace("/hub"); });
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
      <Button variant="ghost" size="icon" onClick={toggle} className="absolute top-4 right-4" aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}>
        <Sun className="w-5 h-5 dark:hidden" aria-hidden="true" /><Moon className="w-5 h-5 hidden dark:block" aria-hidden="true" />
      </Button>

      <Card className="w-full max-w-sm border-0 shadow-none bg-transparent">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-foreground text-background flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">G</div>
          <CardTitle className="text-2xl tracking-tight">Gabarita+</CardTitle>
          <CardDescription>Simulados inteligentes para concursos públicos</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <LoginButton loading={loading} setLoading={setLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

function LoginButton({ loading, setLoading }: { loading: boolean; setLoading: (v: boolean) => void }) {
  const login = async () => {
    setLoading(true);
    const s = getBrowserClient();
    await s.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/auth/callback" } });
    setLoading(false);
  };

  return (
    <Button onClick={login} disabled={loading} size="lg" className="w-full gap-3">
      <GoogleIcon />
      {loading ? "Redirecionando..." : "Entrar com Google"}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
