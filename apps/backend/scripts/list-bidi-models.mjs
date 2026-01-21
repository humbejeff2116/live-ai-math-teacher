const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("Missing GEMINI_API_KEY");

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
);
if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

const data = await res.json();
const models = data.models ?? [];

const bidi = models.filter((m) =>
  Array.isArray(m.supportedGenerationMethods) &&
  m.supportedGenerationMethods.includes("bidiGenerateContent")
);

console.log("BidiGenerateContent-supported models:");
for (const m of bidi) {
  console.log(`- ${m.name}`);
}
