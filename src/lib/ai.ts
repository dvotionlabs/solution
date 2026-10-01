// Small wrapper around the Anthropic Messages API used by the matcher.
const MODEL = "claude-haiku-4-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function askJson<T>(system: string, user: string, maxTokens = 1024): Promise<T> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text: string = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI response contained no JSON");
  return JSON.parse(match[0]) as T;
}
