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
  return [408, 429, 500, 502, 503, 504].includes(status);
}
