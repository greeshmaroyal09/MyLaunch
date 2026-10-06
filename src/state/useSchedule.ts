import { useContext } from 'react'
import { ScheduleContext } from './scheduleContext'

export function useSchedule() {
  const context = useContext(ScheduleContext)
  if (!context) throw new Error('useSchedule must be used within ScheduleProvider')
  return context
}
