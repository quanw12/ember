import { useEffect, useState } from 'react'
import { todayStr } from '../db'

/** Refresh the local date after midnight or returning from a suspended mobile tab. */
export function useToday(): string {
  const [today, setToday] = useState(todayStr)
  useEffect(() => {
    const refresh = () => setToday(todayStr())
    const timer = setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  return today
}
