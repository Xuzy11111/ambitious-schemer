const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_WIRE_API = "chat_completions";

function normalizeEndpoint(baseUrl = DEFAULT_BASE_URL, wireApi = DEFAULT_WIRE_API) {
  const trimmed = String(baseUrl).replace(/\/$/, "");
  if (trimmed.endsWith("/chat/completions") || trimmed.endsWith("/responses")) {
    return trimmed;
  }
  return wireApi === "responses" ? `${trimmed}/responses` : `${trimmed}/chat/completions`;
}

function resolveConfig(options = {}) {
  const apiKey = options.apiKey || "";
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const model = options.model || DEFAULT_MODEL;
  const wireApi = options.wireApi || DEFAULT_WIRE_API;

  return {
    apiKey,
    baseUrl: normalizeEndpoint(baseUrl, wireApi),
    model,
    wireApi,
    timeoutMs: options.timeoutMs || 20000,
  };
}

function buildRequestBody(config, { system, user, schemaHint, temperature }) {
  const systemText = `${system}\nReturn strict JSON only.${schemaHint ? `\nSchema hint: ${schemaHint}` : ""}`;

  if (config.wireApi === "responses") {
    return {
      model: config.model,
      temperature,
      instructions: systemText,
      input: user,
    };
  }

  return {
    model: config.model,
    temperature,
    messages: [
      {
        role: "system",
        content: systemText,
      },
      {
        role: "user",
        content: user,
      },
    ],
  };
}

function extractTextFromResponse(payload = {}, wireApi = DEFAULT_WIRE_API) {
  if (wireApi === "responses") {
    if (payload.output_text) return payload.output_text;
    return (payload.output || [])
      .flatMap((item) => item.content || [])
      .map((content) => content.text || "")
      .filter(Boolean)
      .join("\n");
  }

  return payload.choices?.[0]?.message?.content || "";
}

function extractJson(text = "") {
  const trimmed = String(text).trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error("LLM response did not contain valid JSON.");
  }
}

export function isLlmConfigured(options = {}) {
  return Boolean(resolveConfig(options).apiKey);
}

export async function callJsonLlm({
  system,
  user,
  schemaHint = "",
  options = {},
  temperature = 0.2,
}) {
  const config = resolveConfig(options);
  if (!config.apiKey) {
    return {
      available: false,
      reason: "missing user-provided LLM API key",
      data: null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequestBody(config, { system, user, schemaHint, temperature })),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        available: false,
        reason: `llm api request failed: ${response.status}`,
        data: null,
      };
    }

    const payload = await response.json();
    const content = extractTextFromResponse(payload, config.wireApi);
    return {
      available: true,
      reason: "",
      data: extractJson(content),
      model: config.model,
      wireApi: config.wireApi,
    };
  } catch (error) {
    return {
      available: false,
      reason: error.name === "AbortError" ? "llm api request timed out" : error.message,
      data: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
