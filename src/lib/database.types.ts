export interface BrainState {
  id: string
  care_state: string
  emergency_state: string
  offline_online_state: string
  state_version: number
  last_transition_at: string | null
  last_transition_by: string | null
  created_at: string
}

export interface AuditLogEntry {
  id: string
  action_type: string
  actor_id: string | null
  target_type: string | null
  target_id: string | null
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  brain_state_version: number | null
  created_at: string
}

export interface AILearningInput {
  id: string
  input_type: string
  input_data: Record<string, unknown>
  source_user_id: string | null
  acknowledged: boolean
  acknowledged_by_user_id: string | null
  acknowledged_at: string | null
  brain_state_version: number | null
  created_at: string
}

export interface BrainStateHistoryEntry {
  id: string
  brain_state_id: string
  care_state: string
  emergency_state: string
  offline_online_state: string
  state_version: number
  changed_at: string
  changed_by: string | null
  change_reason: string | null
}

export interface Database {
  public: {
    Tables: {
      brain_state: {
        Row: BrainState
        Insert: Partial<BrainState>
        Update: Partial<BrainState>
      }
      audit_log: {
        Row: AuditLogEntry
        Insert: Partial<AuditLogEntry>
        Update: Partial<AuditLogEntry>
      }
      ai_learning_inputs: {
        Row: AILearningInput
        Insert: Partial<AILearningInput>
        Update: Partial<AILearningInput>
      }
    }
  }
}
