export function localChatResponse(reply: string, stream: boolean): Response {
  const headers = { "Cache-Control": "no-store" };
  if (!stream) return Response.json({ reply }, { headers });
  const frame = JSON.stringify({ type: "content", text: reply });
  return new Response(`data: ${frame}\n\ndata: [DONE]\n\n`, {
    headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8" },
  });
}
