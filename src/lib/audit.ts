import { supabase } from './supabase';

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
    const { error } = await supabase.from('audit_logs').insert({
      actor_id: actorId,
      action_type: actionType,
      target_id: targetId,
      details: details
    });
    
    if (error) console.error('Error recording audit log:', error);
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}
