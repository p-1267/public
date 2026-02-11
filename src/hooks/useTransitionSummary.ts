import { useMemo } from 'react'
import type { BrainStateHistoryEntry } from '../lib/database.types'

interface TransitionSummary {
  totalTransitions: number
  careTransitions: number
  emergencyTransitions: number
  offlineOnlineTransitions: number
  last24h: number
  last7d: number
}

export function useTransitionSummary(history: BrainStateHistoryEntry[]): TransitionSummary {
  return useMemo(() => {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    let careTransitions = 0
    let emergencyTransitions = 0
    let offlineOnlineTransitions = 0
    let count24h = 0
    let count7d = 0

    for (let i = 1; i < history.length; i++) {
      const current = history[i - 1]
      const previous = history[i]
      const changeDate = new Date(current.changed_at)

      if (current.care_state !== previous.care_state) {
        careTransitions++
      }
      if (current.emergency_state !== previous.emergency_state) {
        emergencyTransitions++
      }
      if (current.offline_online_state !== previous.offline_online_state) {
        offlineOnlineTransitions++
      }

      if (changeDate >= last24h) {
        count24h++
      }
      if (changeDate >= last7d) {
        count7d++
      }
    }

    return {
      totalTransitions: history.length,
      careTransitions,
      emergencyTransitions,
      offlineOnlineTransitions,
      last24h: count24h,
      last7d: count7d,
    }
  }, [history])
}
