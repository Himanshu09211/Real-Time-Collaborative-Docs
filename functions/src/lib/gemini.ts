import * as functions from "firebase-functions";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

type GeminiResult = {
  text: string;
  raw: unknown;
};

export async function callGemini(prompt: string): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY - set in .runtimeconfig or deployment");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 512 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini call failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned empty response");

  return { text, raw: payload };
}