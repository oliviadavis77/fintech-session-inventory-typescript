import test from "node:test";
import assert from "node:assert/strict";
import { chooseSessions, paymentEvent } from "./session_policy.ts";

test("keeps the signed-in device and emits an auditable revoke event", () => {
  const sessions = [
    { session_id: "s-current", user_id: "u-7", device: "web" },
    { session_id: "s-phone", user_id: "u-7", device: "phone" },
    { session_id: "s-old", user_id: "u-7", device: "tablet" },
  ];
  const decision = chooseSessions(sessions, "s-current");
  assert.equal(decision.keep.session_id, "s-current");
  assert.deepEqual(decision.revoke.map((session) => session.session_id), ["s-phone", "s-old"]);
  assert.deepEqual(paymentEvent("u-7", decision.revoke), {
    type: "sessions.revoked", user_id: "u-7", count: 2, session_ids: ["s-phone", "s-old"],
  });
});
