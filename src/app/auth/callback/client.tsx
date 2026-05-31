"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const surl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const skey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function AuthCallbackClient() {
  const router = useRouter();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const pr = new URLSearchParams(hash.substring(1));
      const at = pr.get("access_token");
      const rt = pr.get("refresh_token");
      if (at && rt) {
        createBrowserClient(surl, skey).auth.setSession({ access_token: at, refresh_token: rt }).then(({ error }) => {
          if (error) router.replace("/login?error="+encodeURIComponent(error.message));
          else router.replace("/hub");
        });
        return;
      }
    }

    createBrowserClient(surl, skey).auth.getSession().then(({ data: { session }, error }) => {
      if (session) router.replace("/hub");
      else router.replace("/login?error=no_session");
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[var(--text)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[var(--text-secondary)]">Autenticando...</p>
      </div>
    </div>
  );
}
