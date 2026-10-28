export type ActiveSession = {
  session_id: string;
  user_id: string;
  current?: boolean;
  device?: string;
  last_seen_at?: string;
};

export type SessionDecision = {
  keep: ActiveSession;
  revoke: ActiveSession[];
};

export function chooseSessions(sessions: ActiveSession[], currentSessionId: string): SessionDecision {
  const keep = sessions.find((session) => session.session_id === currentSessionId);
  if (!keep) throw new Error("Current session is not in the active session list");
  return { keep, revoke: sessions.filter((session) => session.session_id !== currentSessionId) };
}

export function paymentEvent(userId: string, revoked: ActiveSession[]) {
  return {
    type: "sessions.revoked",
    user_id: userId,
    count: revoked.length,
    session_ids: revoked.map((session) => session.session_id),
  };
}
