import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { BrainState } from '../lib/database.types'
import { SHOWCASE_MODE } from '../config/showcase'
import { useShowcase } from '../contexts/ShowcaseContext'

interface UseBrainStateResult {
  brainState: BrainState | null
  version: number | null
  isLoading: boolean
  error: string | null
}

const BRAIN_STATE_ID = '00000000-0000-0000-0000-000000000001'

export function useBrainState(): UseBrainStateResult {
  const showcaseContext = SHOWCASE_MODE ? useShowcase() : null
  const [brainState, setBrainState] = useState<BrainState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (SHOWCASE_MODE && showcaseContext?.scenarioData?.brainState) {
      setBrainState({
        ...showcaseContext.scenarioData.brainState,
        id: BRAIN_STATE_ID,
        state_version: 1,
        emergency_state: showcaseContext.scenarioData.brainState.emergency_state || 'NONE',
        last_state_transition: showcaseContext.scenarioData.brainState.last_transition || new Date().toISOString()
      } as BrainState)
      setIsLoading(false)
      return
    }

    async function fetchInitialState() {
      const { data, error: fetchError } = await supabase
        .from('brain_state')
        .select('*')
        .eq('id', BRAIN_STATE_ID)
        .maybeSingle()

      if (fetchError) {
        setError(fetchError.message)
      } else if (data) {
        setBrainState(data)
      }
      setIsLoading(false)
    }

    fetchInitialState()

    if (SHOWCASE_MODE) {
      return
    }

    const channel = supabase
      .channel('brain_state_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'brain_state',
          filter: `id=eq.${BRAIN_STATE_ID}`,
        },
        (payload) => {
          setBrainState(payload.new as BrainState)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showcaseContext])

  const version = brainState?.state_version ?? null

  return { brainState, version, isLoading, error }
}
