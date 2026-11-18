#!/usr/bin/env node

import { randomUUID } from "node:crypto";

type JsonObject = Record<string, unknown>;

interface ApiEnvelope<T> {
  data: T;
}

interface AcceptedGeneration {
  request_id: string;
  accepted_at?: string;
}

interface GenerationTask {
  song_id?: string;
  [key: string]: unknown;
}

interface FinalRequest {
  status: string;
  tasks?: GenerationTask[];
  [key: string]: unknown;
}

interface MediaData {
  url: string;
  [key: string]: unknown;
}

interface RequestOptions {
  body?: JsonObject;
  idempotencyKey?: string;
  timeoutMs?: number;
}

const BASE_URL = (
  process.env.SUNO_API_BASE_URL ?? "https://www.suno-api.io"
).replace(/\/+$/, "");
const API_KEY = process.env.SUNO_API_KEY?.trim();
const MODEL = process.env.SUNO_API_MODEL ?? "suno-v6";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTransient(error: unknown): boolean {
  return errorMessage(error).startsWith("transient ");
}

function headers(idempotencyKey?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  };
}

async function requestJson<T>(
  method: "GET" | "POST",
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(options.idempotencyKey),
    body: options.body === undefined ? null : JSON.stringify(options.body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 300_000),
  });

  const traceId = response.headers.get("x-oneapi-request-id") ?? "";
  if (response.status === 429 || response.status >= 500) {
    throw new Error(
      `transient ${response.status}: ${await response.text()} trace=${traceId}`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `permanent ${response.status}: ${await response.text()} trace=${traceId}`,
    );
  }
  return (await response.json()) as T;
}

async function acceptGeneration(
  description: string,
): Promise<{ accepted: AcceptedGeneration; idempotencyKey: string }> {
  const idempotencyKey = randomUUID();
  let delayMs = 5_000;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await requestJson<ApiEnvelope<AcceptedGeneration>>(
        "POST",
        "/api/music/create",
        {
          idempotencyKey,
          body: {
            description,
            model: MODEL,
            accept_mode: "async",
          },
        },
      );
      return { accepted: response.data, idempotencyKey };
    } catch (error) {
      if (!isTransient(error) || attempt === 5) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 60_000);
    }
  }

  throw new Error("unreachable");
}

async function waitForRequest(
  requestId: string,
  maxAttempts = 72,
): Promise<FinalRequest> {
  let delayMs = 5_000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await requestJson<ApiEnvelope<FinalRequest>>(
        "GET",
        `/api/music/requests/${encodeURIComponent(requestId)}`,
        { timeoutMs: 60_000 },
      );
      if (["completed", "failed"].includes(response.data.status)) {
        return response.data;
      }
    } catch (error) {
      if (!isTransient(error) || attempt === maxAttempts - 1) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs + 5_000, 30_000);
  }

  throw new Error(`request still running after polling: ${requestId}`);
}

async function main(): Promise<void> {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (prompt === "--help") {
    console.log(
      'Usage: node --experimental-strip-types index.ts "music description"',
    );
    return;
  }
  if (!API_KEY) {
    throw new Error("SUNO_API_KEY is required");
  }
  if (!prompt) {
    throw new Error('Usage: index.ts "music description"');
  }

  const { accepted, idempotencyKey } = await acceptGeneration(prompt);
  console.log(
    JSON.stringify(
      {
        request_id: accepted.request_id,
        idempotency_key: idempotencyKey,
        accepted_at: accepted.accepted_at ?? null,
      },
      null,
      2,
    ),
  );

  const final = await waitForRequest(accepted.request_id);
  console.log(JSON.stringify(final, null, 2));

  for (const task of final.tasks ?? []) {
    if (!task.song_id) {
      continue;
    }
    const media = await requestJson<ApiEnvelope<MediaData>>(
      "POST",
      "/api/music/download-url",
      {
        body: { song_id: task.song_id, kind: "song" },
        timeoutMs: 60_000,
      },
    );
    console.log(JSON.stringify(media.data, null, 2));
  }
}

main().catch((error: unknown) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
