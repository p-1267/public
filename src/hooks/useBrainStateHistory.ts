import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { BrainStateHistoryEntry } from '../lib/database.types'

export function useBrainStateHistory() {
  const [history, setHistory] = useState<BrainStateHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {

    async function fetchHistory() {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('brain_state_history')
          .select('*')
          .order('changed_at', { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        setHistory(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch history')
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [])

  return { history, isLoading, error }
}
