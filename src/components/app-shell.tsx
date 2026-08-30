"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getBrowserClient } from "@/lib/supabase-browser";
import {
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  Home,
} from "lucide-react";

interface UserData {
  nome: string;
  role: string;
  avatar_url: string | null;
  email: string;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const sup = getBrowserClient();
    sup.auth.getUser().then((res: any) => { const data = res.data;
      if (!data.user) return;
      sup
        .from("profiles")
        .select("nome, role, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle()
        .then((res2: any) => { const p = res2.data;
          setUser({
            nome:
              p?.nome || data.user.email?.split("@")[0] || "U",
            role: p?.role || "free",
            avatar_url: p?.avatar_url,
            email: data.user.email || "",
          });
        });
    });
  }, []);

  const navItems = [
    { href: "/hub", label: "Concursos", icon: BookOpen },
    { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
    ...(user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Settings }]
      : []),
  ];

  const roleBadgeMap: Record<
    string,
    { label: string; variant: "destructive" | "default" | "secondary" }
  > = {
    admin: { label: "Admin", variant: "destructive" },
    premium: { label: "Pro", variant: "default" },
    free: { label: "Free", variant: "secondary" },
  };
  const rb = roleBadgeMap[user?.role || "free"];

  const sidebar = (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r bg-card z-30"
      aria-label="Navegação principal"
    >
      <div className="h-16 flex items-center gap-3 px-6 border-b">
        <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm shrink-0">
          G
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none truncate">
            Gabarita<span className="italic font-black text-blue-500">+</span>
          </p>
          <p className="text-[10px] text-muted-foreground">Simulados</p>
        </div>
      </div>

      <div className="p-3 border-b">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {user?.nome?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate max-w-[120px]">
              {user?.nome}
            </p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              {user?.email}
            </p>
            <Badge
              variant={rb.variant}
              className="text-[10px] h-4 px-1.5 mt-0.5"
            >
              {rb.label}
            </Badge>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(item.href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
            aria-current={
              pathname.startsWith(item.href) ? "page" : undefined
            }
          >
            <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="p-3 border-t">
        <div className="flex items-center gap-2 px-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="w-8 h-8"
            aria-label={
              theme === "dark"
                ? "Mudar para modo claro"
                : "Mudar para modo escuro"
            }
          >
            <Sun className="w-4 h-4 dark:hidden" aria-hidden="true" />
            <Moon
              className="w-4 h-4 hidden dark:block"
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground text-xs"
            onClick={() => router.push("/api/auth/logout")}
            aria-label="Sair"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
            Sair
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      {sidebar}

      <MobileHeader
        navItems={navItems}
        pathname={pathname}
        user={user}
        roleBadge={rb}
        theme={theme}
        onToggleTheme={toggle}
        onLogout={() => router.push("/api/auth/logout")}
      />

      <div className="lg:pl-64 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}

function MobileHeader({
  navItems,
  pathname,
  user,
  roleBadge,
  theme,
  onToggleTheme,
  onLogout,
}: {
  navItems: { href: string; label: string; icon: any }[];
  pathname: string;
  user: UserData | null;
  roleBadge: { label: string; variant: "destructive" | "default" | "secondary" };
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const router = useRouter();

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
      <div className="flex items-center justify-between h-14 px-4">
        <Sheet>
            <SheetTrigger
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors inline-flex shrink-0 items-center justify-center"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="h-16 flex items-center gap-3 px-6 border-b">
              <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm shrink-0">
                G
              </div>
              <p className="text-sm font-semibold">GabaritaMais</p>
            </div>
            <nav className="p-3 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith(item.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                  aria-current={
                    pathname.startsWith(item.href) ? "page" : undefined
                  }
                >
                  <item.icon
                    className="w-4 h-4"
                    aria-hidden="true"
                  />
                  {item.label}
                </a>
              ))}
            </nav>
            <Separator />
            <div className="p-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {user?.nome?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium truncate max-w-[140px]">
                    {user?.nome}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                    {user?.email}
                  </p>
                  <Badge
                    variant={roleBadge.variant}
                    className="text-[10px] h-4 px-1.5 mt-0.5"
                  >
                    {roleBadge.label}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start mt-2"
                onClick={onLogout}
                aria-label="Sair"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <a
          href="/hub"
          className="flex items-center gap-2"
          aria-label="Ir para o hub"
        >
          <div className="w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-xs">
            G
          </div>
          <span className="text-sm font-semibold">
            Gabarita
            <span className="italic font-black text-blue-500">+</span>
          </span>
        </a>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          aria-label={
            theme === "dark"
              ? "Mudar para modo claro"
              : "Mudar para modo escuro"
          }
        >
          <Sun className="w-4 h-4 dark:hidden" aria-hidden="true" />
          <Moon className="w-4 h-4 hidden dark:block" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
