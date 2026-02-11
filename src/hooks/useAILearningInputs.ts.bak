import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AILearningInput } from '../lib/database.types'

interface UseAILearningInputsResult {
  inputs: AILearningInput[]
  isLoading: boolean
  error: string | null
  acknowledgeInput: (inputId: string) => Promise<{ success: boolean; error?: string }>
  refetch: () => void
}

export function useAILearningInputs(): UseAILearningInputsResult {
  const [inputs, setInputs] = useState<AILearningInput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInputs = useCallback(async () => {

    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('ai_learning_inputs')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setInputs([])
    } else {
      setInputs(data ?? [])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchInputs()
  }, [fetchInputs])

  const acknowledgeInput = useCallback(async (inputId: string): Promise<{ success: boolean; error?: string }> => {
    const { error: rpcError } = await supabase.rpc('acknowledge_ai_input', {
      p_input_id: inputId,
    })

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }

    await fetchInputs()
    return { success: true }
  }, [fetchInputs])

  return {
    inputs,
    isLoading,
    error,
    acknowledgeInput,
    refetch: fetchInputs,
  }
}
