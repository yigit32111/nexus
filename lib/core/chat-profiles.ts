const profiles = {
  fast: { maxTokens: 1024, instruction: "\nKısa ve doğrudan yanıt ver.", routingHint: "" },
  balanced: { maxTokens: 4096, instruction: "", routingHint: "" },
  deep: {
    maxTokens: 4096,
    instruction: "\nVarsayımları ve belirsizlikleri açıkla. Sonucu uygun örnekler veya hesaplarla destekle.",
    routingHint: " analiz",
  },
};

export function thinkingProfile(mode: unknown) {
  if (mode === "fast" || mode === "deep") return profiles[mode];
  return profiles.balanced;
}

export function canRetryFreeModel(status: number) {
  // Free-model rate limits can be shared across the entire provider account.
  // Do not spend another request on a 429; let the user retry after the cooldown.
  return [408, 500, 502, 503, 504].includes(status);
}

export function retryAfterSeconds(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return undefined;
  const n = Number(value);
  return n >= 1 && n <= 3600 ? String(n) : undefined;
}
