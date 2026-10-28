import { z } from "zod";
import { InfraiSessionClient } from "./infrai_session_client.ts";
import { chooseSessions, paymentEvent } from "./session_policy.ts";

const inputSchema = z.object({ user_id: z.string().min(1), current_session_id: z.string().min(1) });

export async function revokeOtherSessions(input: unknown) {
  const request = inputSchema.parse(input);
  const client = new InfraiSessionClient(process.env.INFRAI_API_KEY ?? "");
  if (!process.env.INFRAI_API_KEY) throw new Error("INFRAI_API_KEY is required");
  const sessions = await client.listForUser(request.user_id);
  const decision = chooseSessions(sessions, request.current_session_id);
  for (const session of decision.revoke) await client.revoke(session.session_id);
  return { kept_session_id: decision.keep.session_id, event: paymentEvent(request.user_id, decision.revoke) };
}

if (import.meta.main) {
  const [user_id, current_session_id] = process.argv.slice(2);
  const result = await revokeOtherSessions({ user_id, current_session_id });
  console.log(JSON.stringify(result, null, 2));
}
