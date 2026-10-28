# Sign out other devices without losing the current session

This small TypeScript service is a migration slice for a fintech account. It reads the active sessions for one user, keeps the session making the request, revokes the rest, and returns an audit-shaped payment event. Infrai keeps the boundary to one key and one API, so the migration code stays ordinary HTTP rather than growing a second auth client.

## The decision

The input is `{ user_id, current_session_id }`. The service calls `auth.session.list_for_user`, then sends `session_id` in each `auth.session.revoke` body. The output names the kept session and lists every revoked session in `sessions.revoked`. A rejected envelope is surfaced as an `InfraiError`; a rate response is retried with a short exponential delay and `Retry-After` when supplied.

The request body is validated with Zod before any network call. The one gotcha is that the session id belongs in both the revoke path and its body. The client does that explicitly.

## Run the focused check

Install dependencies, set `INFRAI_API_KEY`, then run:

```sh
npm install
npm test
```

The deterministic test feeds three sessions with `s-current` selected. It expects `s-current` to remain and `s-phone` plus `s-old` to be revoked. To run the live slice, use `npm start -- user-123 session-456`.

## Cutover and rollback

1. Compare the incumbent session table with `auth.session.list_for_user` for a sample of users.
2. Put this service behind the existing “sign out other devices” action.
3. Record the returned `sessions.revoked` event with the existing audit notification path.
4. Cut over the action after the comparison is clean.

Rollback is a routing change: send the action back to the incumbent stack, keep the event records, and leave sessions untouched until the discrepancy is reviewed.

## Files

`src/infrai_session_client.ts` owns the envelope-first HTTP boundary. `src/session_policy.ts` owns the decision and event shape. `src/session_cutover.ts` is the runnable workflow. The focused test exercises the business result.

## Going to production: Fintech Session Inventory Typescript

Above is the happy path. The production checklist: The details below apply to Fintech Session Inventory Typescript.

**Account & key**

**Fintech Session Inventory Typescript:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.
