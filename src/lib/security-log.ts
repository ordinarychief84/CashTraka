/**
 * Security audit logger.
 *
 * Logs security-relevant events (login, password change, role change,
 * suspension, etc.) with structured data. Currently writes to
 * console + optionally to the AuditLog table if it exists.
 *
 * In production, these logs are captured by Vercel's log drain and can
 * be forwarded to a SIEM (Datadog, Sentry, etc.) for alerting.
 */
import { prisma } from './prisma';

export type SecurityEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_VERIFIED'
  | 'INVITE_SENT'
  | 'INVITE_ACCEPTED'
  | 'INVITE_REVOKED'
  | 'ROLE_CHANGED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_REACTIVATED'
  | 'ACCOUNT_DELETED'
  | 'RATE_LIMITED'
  | 'CSRF_BLOCKED'
  | 'SESSION_EXPIRED';

type LogPayload = {
  event: SecurityEvent;
  /** The user or staff ID who performed the action. */
  actorId?: string;
  /** The user ID whose data was affected (the tenant). */
  targetId?: string;
  /** Client IP address. */
  ip?: string;
  /** Additional context (role, email, etc.). Never include passwords. */
  meta?: Record<string, unknown>;
};

/**
 * Log a security event. Fire-and-forget — never throws.
 */
export function securityLog(payload: LogPayload): void {
  const entry = {
    ts: new Date().toISOString(),
    ...payload,
  };

  // Structured console log for Vercel log drain
  console.log(`[SECURITY] ${JSON.stringify(entry)}`);

  // Best-effort write to AuditLog table (won't fail if table missing)
  if (payload.actorId || payload.targetId) {
    prisma.auditLog
      .create({
        data: {
          adminId: payload.actorId || 'system',
          action: payload.event,
          targetId: payload.targetId || undefined,
          details: payload.meta ? JSON.stringify(payload.meta) : undefined,
          ipAddress: payload.ip || undefined,
        },
      })
      .catch(() => null); // never let audit failure break the main flow
  }
}
