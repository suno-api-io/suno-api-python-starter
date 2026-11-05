#!/usr/bin/env node

import { randomUUID } from "node:crypto";

const BASE_URL = (process.env.SUNO_API_BASE_URL || "https://www.suno-api.io").replace(/\/+$/, "");
const API_KEY = process.env.SUNO_API_KEY?.trim();
const model = process.env.SUNO_API_MODEL || "suno-v6";

if (!API_KEY) {
  console.error("SUNO_API_KEY is required");
  process.exit(1);
}

const prompt = process.argv.slice(2).join(" ").trim();
if (!prompt) {
  console.error('Usage: node index.mjs "music description"');
  process.exit(1);
}

function headers(idempotencyKey) {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  };
}

async function requestJson(method, path, { body, idempotencyKey, timeoutMs = 300_000 } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(idempotencyKey),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const traceId = response.headers.get("x-oneapi-request-id") || "";
  if (response.status === 429 || response.status >= 500) {
    throw new Error(`transient ${response.status}: ${await response.text()} trace=${traceId}`);
  }
  if (!response.ok) {
    throw new Error(`permanent ${response.status}: ${await response.text()} trace=${traceId}`);
  }
  return response.json();
}

async function acceptGeneration(description) {
  const idempotencyKey = randomUUID();
  let delayMs = 5_000;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await requestJson("POST", "/api/music/create", {
        idempotencyKey,
        body: { description, model, accept_mode: "async" },
      });
      return { accepted: response.data, idempotencyKey };
    } catch (error) {
      if (!String(error).includes("transient") || attempt === 5) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 60_000);
    }
  }

  throw new Error("unreachable");
}

async function waitForRequest(requestId, maxAttempts = 72) {
  let delayMs = 5_000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await requestJson(
        "GET",
        `/api/music/requests/${encodeURIComponent(requestId)}`,
        { timeoutMs: 60_000 },
      );
      if (["completed", "failed"].includes(response.data.status)) {
        return response.data;
      }
    } catch (error) {
      if (!String(error).includes("transient") || attempt === maxAttempts - 1) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs + 5_000, 30_000);
  }

  throw new Error(`request still running after polling: ${requestId}`);
}

async function main() {
  const { accepted, idempotencyKey } = await acceptGeneration(prompt);
  console.log(JSON.stringify({
    request_id: accepted.request_id,
    idempotency_key: idempotencyKey,
    accepted_at: accepted.accepted_at ?? null,
  }, null, 2));

  const final = await waitForRequest(accepted.request_id);
  console.log(JSON.stringify(final, null, 2));

  for (const task of final.tasks || []) {
    if (!task.song_id) {
      continue;
    }
    const media = await requestJson("POST", "/api/music/download-url", {
      body: { song_id: task.song_id, kind: "song" },
      timeoutMs: 60_000,
    });
    console.log(JSON.stringify(media.data, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

