export interface DatabaseEvent {
  id: string;
  title: string;
  category: string;
  description: string;
  base_prize: number;
  per_participant_bonus: number;
  image_url: string | null;
  participants_count?: number;
  total_prize?: number;
  rules?: string[];
}

export interface Faculty {
  id: string;
  name: string;
  designation: string;
  image_url: string;
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

// Keeping Original Event for specific usages initially if needed, but it should be migrated
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
