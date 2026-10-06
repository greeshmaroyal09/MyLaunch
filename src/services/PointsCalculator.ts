import type { ProgressEvent } from '../domain/progress'

export const skipPenalty = 10

export function calculateTaskReward(durationMinutes: number): { points: number; xp: number } {
  const reward = Math.max(0, Math.floor(durationMinutes))
  return { points: reward, xp: reward }
}

export function calculateBalance(events: ProgressEvent[], field: 'pointsDelta' | 'xpDelta'): number {
  return events.reduce((balance, event) => Math.max(0, balance + event[field]), 0)
}
