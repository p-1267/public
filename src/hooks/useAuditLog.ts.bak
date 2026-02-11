import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AuditLogEntry } from '../lib/database.types'

type SortColumn = 'created_at' | 'action_type' | 'target_type' | 'brain_state_version'
type SortDirection = 'asc' | 'desc'

interface UseAuditLogResult {
  entries: AuditLogEntry[]
  isLoading: boolean
  error: string | null
  sortColumn: SortColumn
  sortDirection: SortDirection
  setSort: (column: SortColumn, direction: SortDirection) => void
  refetch: () => void
}

export function useAuditLog(): UseAuditLogResult {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const fetchEntries = useCallback(async () => {

    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('audit_log')
      .select('*')
      .order(sortColumn, { ascending: sortDirection === 'asc' })

    if (fetchError) {
      setError(fetchError.message)
      setEntries([])
    } else {
      setEntries(data ?? [])
    }
    setIsLoading(false)
  }, [sortColumn, sortDirection])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const setSort = useCallback((column: SortColumn, direction: SortDirection) => {
    setSortColumn(column)
    setSortDirection(direction)
  }, [])

  return {
    entries,
    isLoading,
    error,
    sortColumn,
    sortDirection,
    setSort,
    refetch: fetchEntries,
  }
}
