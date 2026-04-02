export type AppRole = 'admin' | 'payment_reviewer' | 'content_reviewer' | 'user';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type SubmissionStatus = 'locked' | 'ready' | 'submitted';
export type ReviewStatus = 'not_started' | 'selected' | 'eliminated';
export type QualificationStage =
  | 'not_started'
  | 'round_1_qualified'
  | 'round_2_qualified'
  | 'semifinal'
  | 'final'
  | 'eliminated';

export interface DatabaseEvent {
  id: string;
  title: string;
  slug?: string | null;
  category: string;
  description: string;
  entry_fee: number;
  image_url: string | null;
  rules?: string[];
  max_team_size?: number;
  payment_account_name?: string | null;
  payment_account_number?: string | null;
  payment_ifsc?: string | null;
  payment_upi_id?: string | null;
  drive_folder_id?: string | null;
  drive_embed_hint?: string | null;
  is_active?: boolean;
  participants_count?: number;
}

export interface Faculty {
  id?: string;
  name: string;
  designation: string;
  image_url?: string;
  image?: string;
  department?: string;
}

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  image_url: string;
  display_order: number;
}

export interface GeneralRule {
  id: string;
  rule_text: string;
  display_order: number;
}

export interface HeroSlide {
  id: string;
  image_url: string;
  duration_seconds: number;
  display_order: number;
}

export interface SiteContent {
  id?: string;
  content_key: string;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  secondary_body?: string | null;
  image_url?: string | null;
  metadata?: Record<string, any>;
}

export interface Event {
  id: string;
  title: string;
  category: string;
  description: string;
  longDescription?: string;
  date?: string;
  time?: string;
  venue?: string;
  image?: string;
  rules?: string[];
  prizes?: string[];
  coordinators?: { name: string; contact: string }[];
}
