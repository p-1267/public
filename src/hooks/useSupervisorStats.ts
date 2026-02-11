import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface SupervisorStats {
  currentState: {
    care_state: string
    emergency_state: string
    offline_online_state: string
    state_version: number
  } | null
  recentTransitions24h: number
  pendingAIInputs: number
  emergencyEventCount: number
}

export function useSupervisorStats() {
  const [stats, setStats] = useState<SupervisorStats>({
    currentState: null,
    recentTransitions24h: 0,
    pendingAIInputs: 0,
    emergencyEventCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true)
        setError(null)

        const [
          currentStateResult,
          historyResult,
          aiInputsResult,
          emergencyResult,
        ] = await Promise.all([
          supabase.from('brain_state').select('*').single(),
          supabase
            .from('brain_state_history')
            .select('changed_at')
            .gte('changed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from('ai_learning_inputs')
            .select('id', { count: 'exact', head: true })
            .eq('acknowledged', false),
          supabase
            .from('brain_state_history')
            .select('emergency_state', { count: 'exact', head: true })
            .neq('emergency_state', 'NONE'),
        ])

        setStats({
          currentState: currentStateResult.data
            ? {
                care_state: currentStateResult.data.care_state,
                emergency_state: currentStateResult.data.emergency_state,
                offline_online_state: currentStateResult.data.offline_online_state,
                state_version: currentStateResult.data.state_version,
              }
            : null,
          recentTransitions24h: historyResult.data?.length || 0,
          pendingAIInputs: aiInputsResult.count || 0,
          emergencyEventCount: emergencyResult.count || 0,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, isLoading, error }
}
