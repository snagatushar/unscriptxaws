import { api } from './api';

export type AuditAction = 
  | 'PAYMENT_APPROVE' 
  | 'PAYMENT_REJECT' 
  | 'JUDGE_PROMOTE' 
  | 'JUDGE_ELIMINATE' 
  | 'ASSIGNMENT_CREATE' 
  | 'ASSIGNMENT_DELETE'
  | 'EVENT_CREATE'
  | 'EVENT_UPDATE'
  | 'EVENT_DELETE'
  | 'ROLE_UPDATE'
  | 'REGISTRATION_DELETE'
  | 'SITE_CONTENT_UPDATE';

export async function logAdminAction(
  actorId: string, 
  actionType: AuditAction, 
  targetId: string, 
  details: Record<string, any> = {}
) {
  try {
    // Audit logs are stored via the admin API
    await api.post('/api/admin', {
      action: 'insert',
      table: 'audit_logs',
      record: {
        actor_id: actorId,
        action_type: actionType,
        target_id: targetId,
        details: details
      }
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}
