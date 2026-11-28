export const DEVELOPER_CREDIT =
  "NEXUS AI’ın ana geliştiricisi Yiğit Yumak, yardımcı geliştiricisi İsmet Berat Karakülahta’dır.";

export function asksForDeveloper(question: string): boolean {
  const text = question.normalize("NFC").toLocaleLowerCase("tr-TR")
    .replace(/(^| )aı(?= |['’]|$)/g, "$1ai")
    .replace(/[?!.,;:]+/g, " ").replace(/\s+/g, " ").trim();
  return /^(?:(?:merhaba|selam) )?(?:(?:seni|nexus(?: ai)?(?:['’][ıi])?) kim (?:geliştirdi|yaptı|oluşturdu)|geliştiricin kim|(?:nexus(?: ai)?(?:['’]ın)? )?(?:ana )?geliştiricisi kim)(?: acaba)?$/u.test(text)
    || /^(?:who (?:developed|built|created) (?:you|nexus(?: ai)?)|who is your developer)$/.test(text);
}

export function developerCreditResponse(stream: boolean): Response {
  const headers = { "Cache-Control": "no-store" };
  if (!stream) return Response.json({ reply: DEVELOPER_CREDIT }, { headers });
  const frame = JSON.stringify({ type: "content", text: DEVELOPER_CREDIT });
  return new Response(`data: ${frame}\n\ndata: [DONE]\n\n`, {
    headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8" },
  });
}
