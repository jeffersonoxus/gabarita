const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(
  key: string,
  max: number = 60,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}
