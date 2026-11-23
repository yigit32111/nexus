
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";

type Attachment = {
  name: string;
  type: string;
  dataUrl: string;
};

type SafeMessage = {
  role: "user" | "assistant";
  content: any;
};

const MAX_PDF_SIZE = 8 * 1024 * 1024;
const MAX_TEXT_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 30000;
const MAX_ATTACHMENTS = 3;

const SUPPORTED_IMAGES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Supabase oturum kontrolü
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "Bu işlem için giriş yapmalısın.",
        401
      );
    }

    // 2. İstek verilerini al
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return errorResponse("İstek verileri geçersiz.");
    }

    const {
      messages,
      memory,
      preferences,
      attachments = [],
    } = body;

    const key = process.env.AI_API_KEY;

    if (!key) {
      return errorResponse(
        "AI_API_KEY sunucuda ayarlanmamış.",
        500
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("Mesaj biçimi geçersiz.");
    }

    if (
      !Array.isArray(attachments) ||
      attachments.length > MAX_ATTACHMENTS
    ) {
      return errorResponse(
        "En fazla 3 dosya ekleyebilirsin."
      );
    }

    // 3. Mesajları doğrula
    const safeMessages: SafeMessage[] = messages
      .slice(-24)
      .map((message: any) => {
        if (
          !["user", "assistant"].includes(message?.role) ||
          typeof message?.content !== "string"
        ) {
          throw new Error("Geçersiz mesaj biçimi.");
        }

        return {
          role: message.role as "user" | "assistant",
          content: message.content.slice(0, 20000),
        };
      });

    let lastUserIndex = -1;

    for (let i = safeMessages.length - 1; i >= 0; i--) {
      if (safeMessages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) {
      return errorResponse(
        "Bir kullanıcı mesajı gerekli."
      );
    }

    // 4. Dosyaları işle
    const imageParts: any[] = [];
    const extractedTexts: string[] = [];

    for (const file of attachments as Attachment[]) {
      // Frontend dataUrl gönderiyor.
      if (
        !file ||
        typeof file.name !== "string" ||
        typeof file.type !== "string" ||
        typeof file.dataUrl !== "string"
      ) {
        return errorResponse(
          "Dosya bilgileri geçersiz. Dosyayı tekrar ekle."
        );
      }

      // Dosya adı ve MIME türünü kontrol et
      if (
        file.name.length > 255 ||
        file.name.trim().length === 0
      ) {
        return errorResponse("Dosya adı geçersiz.");
      }

      const match = file.dataUrl.match(
        /^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/
      );

      if (!match || match[1] !== file.type) {
        return errorResponse(
          `Dosya verisi geçersiz: ${file.name}`
        );
      }

      const buffer = Buffer.from(match[2], "base64");

      if (buffer.length === 0) {
        return errorResponse(
          `Dosya boş veya okunamıyor: ${file.name}`
        );
      }

      // PDF
      if (file.type === "application/pdf") {
        if (buffer.length > MAX_PDF_SIZE) {
          return errorResponse(
            "PDF dosyası en fazla 8 MB olabilir.",
            413
          );
        }

        if (
          buffer.length < 5 ||
          buffer.subarray(0, 5).toString() !== "%PDF-"
        ) {
          return errorResponse(
            "Geçerli bir PDF dosyası değil."
          );
        }

        try {
          const pdfModule = await import("pdf-parse");

          const pdfParse = (
            pdfModule as any
          ).default ?? pdfModule;

          const result = await pdfParse(buffer);

          const pdfText = String(
            result?.text || ""
          ).slice(0, MAX_TEXT_LENGTH);

          extractedTexts.push(
            `PDF DOSYASI: ${file.name}\n${pdfText || "PDF içerisinden metin çıkarılamadı."}`
          );
        } catch (error) {
          console.error("PDF PARSE ERROR:", error);

          return errorResponse(
            `PDF okunamadı: ${file.name}`,
            422
          );
        }
      }

      // TXT
      else if (file.type === "text/plain") {
        if (buffer.length > MAX_TEXT_SIZE) {
          return errorResponse(
            "TXT dosyası en fazla 8 MB olabilir.",
            413
          );
        }

        const textContent = buffer
          .toString("utf8")
          .slice(0, MAX_TEXT_LENGTH);

        extractedTexts.push(
          `TXT DOSYASI: ${file.name}\n${textContent}`
        );
      }

      // JPG / PNG / WEBP
      else if (SUPPORTED_IMAGES.includes(file.type)) {
        if (buffer.length > MAX_IMAGE_SIZE) {
          return errorResponse(
            "Görsel dosyası en fazla 5 MB olabilir.",
            413
          );
        }

        let validImage = false;

        if (file.type === "image/jpeg") {
          validImage =
            buffer.length >= 3 &&
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff;
        }

        if (file.type === "image/png") {
          validImage =
            buffer.length >= 8 &&
            buffer.subarray(0, 8).equals(
              Buffer.from([
                137, 80, 78, 71,
                13, 10, 26, 10,
              ])
            );
        }

        if (file.type === "image/webp") {
          validImage =
            buffer.length >= 12 &&
            buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP";
        }

        if (!validImage) {
          return errorResponse(
            `Görsel dosyasının biçimi geçersiz: ${file.name}`
          );
        }

        imageParts.push({
          type: "image_url",
          image_url: {
            url: `data:${file.type};base64,${buffer.toString("base64")}`,
          },
        });
      }

      // Desteklenmeyen dosya
      else {
        return errorResponse(
          `Desteklenmeyen dosya türü: ${file.name}`
        );
      }
    }

    // 5. Sistem talimatları
    const style =
      preferences?.style === "concise"
        ? "Kısa ve öz cevap ver."
        : preferences?.style === "detailed"
        ? "Konuyu gerektiğinde kapsamlı ve adım adım açıkla."
        : "Dengeli uzunlukta cevap ver.";

    const tone =
      preferences?.tone === "professional"
        ? "Profesyonel bir dil kullan."
        : preferences?.tone === "friendly"
        ? "Sıcak ve doğal konuş."
        : "Doğal ve net konuş.";

    const system = `Sen NEXUS adlı kişisel yapay zekâ asistanısın.

Türkçe konuş.
${style}
${tone}

Bilmediğin şeyleri uydurma.
Kullanıcının sorularına açık ve anlaşılır cevaplar ver.
Eklenen dosyaların içeriğini dikkate al.
Dosyada olmayan bilgileri varmış gibi gösterme.
Görselleri dikkatlice incele ve yalnızca görebildiğin bilgilere dayanarak cevap ver.

${
  memory
    ? `Kullanıcının kişisel bağlamı:\n${String(memory).slice(0, 5000)}`
    : ""
}`;

    // 6. PDF ve TXT metinlerini son kullanıcı mesajına ekle
    if (extractedTexts.length > 0) {
      const combinedText = extractedTexts
        .join("\n\n")
        .slice(0, MAX_TEXT_LENGTH);

      safeMessages[lastUserIndex].content +=
        "\n\nEKLENEN DOSYALAR:\n" + combinedText;
    }

    // 7. Görselleri son kullanıcı mesajına ekle
    if (imageParts.length > 0) {
      const lastMessage = safeMessages[lastUserIndex];

      safeMessages[lastUserIndex] = {
        ...lastMessage,
        content: [
          {
            type: "text",
            text: lastMessage.content,
          },
          ...imageParts,
        ],
      };
    }

    // 8. Groq bağlantısı
    const base = (
      process.env.AI_BASE_URL ||
      "https://api.groq.com/openai/v1"
    ).replace(/\/+$/, "");

    // Görsel varsa Groq Vision modeli kullanılır.
    // Normal mesajlarda mevcut GPT-OSS modeli kullanılır.
    const model = imageParts.length > 0
      ? process.env.AI_VISION_MODEL || "qwen/qwen3.8-27b"
      : process.env.AI_MODEL || "openai/gpt-oss-120b";

    const rawTemperature = Number(
      preferences?.temperature ?? 0.7
    );

    const temperature = Number.isFinite(rawTemperature)
      ? Math.max(0, Math.min(1, rawTemperature))
      : 0.7;

    // 9. Groq API isteği
    const response = await fetch(
      `${base}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: system,
            },
            ...safeMessages,
          ],
          temperature,
        }),
        signal: AbortSignal.timeout(90000),
      }
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        "GROQ API ERROR:",
        response.status,
        payload
      );

      return NextResponse.json(
        {
          error:
            payload?.error?.message ||
            `AI sağlayıcı hatası (${response.status})`,
        },
        { status: 502 }
      );
    }

    // 10. Yanıtı al
    const reply = payload?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json(
        {
          error: "NEXUS yanıt oluşturamadı. Tekrar dene.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply,
    });

  } catch (error: any) {
    console.error("NEXUS CHAT ERROR:", error);

    let message = "Bilinmeyen bir sunucu hatası oluştu.";

    if (error?.name === "TimeoutError") {
      message = "İstek zaman aşımına uğradı. Tekrar dene.";
    } else if (
      error?.message === "Geçersiz mesaj biçimi."
    ) {
      message = error.message;
    } else if (error?.message) {
      message = error.message;
    }

    return NextResponse.json(
      {
        error: "Sunucu hatası: " + message,
      },
      { status: 500 }
    );
  }
}
