import { createBrowserClient } from "@supabase/ssr";

const surl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const skey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!_client) {
    _client = createBrowserClient(surl, skey);
  }
  return _client;
}
