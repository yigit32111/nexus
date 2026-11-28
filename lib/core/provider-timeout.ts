import { canRetryFreeModel } from "./chat-profiles.ts";

export async function fetchUntilHeaders(
  open: (signal: AbortSignal) => Promise<Response>,
  overall: AbortSignal,
  timeoutMs = 20_000,
): Promise<Response> {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(new DOMException("Provider timeout", "TimeoutError")), timeoutMs);
  try {
    return await open(AbortSignal.any([overall, deadline.signal]));
  } catch (error) {
    if (deadline.signal.aborted && !overall.aborted) return new Response(null, { status: 504 });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function retryCompletion(
  response: Response,
  signal: AbortSignal,
  next: () => Promise<Response | null>,
): Promise<Response> {
  if (signal.aborted || !canRetryFreeModel(response.status)) return response;
  await response.body?.cancel().catch(() => {});
  return (await next()) ?? response;
}
