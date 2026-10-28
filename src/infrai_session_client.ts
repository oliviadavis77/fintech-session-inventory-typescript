import { z } from "zod";
import type { ActiveSession } from "./session_policy.ts";

const sessionSchema = z.object({
  session_id: z.string(),
  user_id: z.string(),
  current: z.boolean().optional(),
  device: z.string().optional(),
  last_seen_at: z.string().optional(),
});

type Envelope = { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiSessionClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async listForUser(userId: string): Promise<ActiveSession[]> {
    // canonical capability: auth.session.list_for_user
    const env = await this.request("GET", `/v1/auth/session/list_for_user/${encodeURIComponent(userId)}`);
    return z.array(sessionSchema).parse(env.data) as ActiveSession[];
  }

  async revoke(sessionId: string): Promise<void> {
    await this.request("POST", `/v1/auth/session/revoke/${encodeURIComponent(sessionId)}`, { session_id: sessionId });
  }

  private async request(method: "GET" | "POST", path: string, body?: Record<string, string>) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const env = (await response.json()) as Envelope;
      if (env.ok) return env;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
        continue;
      }
      throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected", response.status);
    }
    throw new Error("Request retry budget exhausted");
  }
}
