import type { LevelProgress } from '../domain/progress'

const fixedThresholds = [0, 100, 250, 450, 700, 1000]

export function calculateLevel(xpTotal: number): LevelProgress {
  const xp = Math.max(0, Math.floor(xpTotal))
  for (let index = 0; index < fixedThresholds.length - 1; index += 1) {
    const lower = fixedThresholds[index]
    const next = fixedThresholds[index + 1]
    if (xp < next) return progressFor(xp, index + 1, lower, next)
  }

  let level = 6
  let lower = 1000
  let interval = 350
  let next = lower + interval
  while (xp >= next) {
    lower = next
    level += 1
    interval += 50
    next = lower + interval
  }
  return progressFor(xp, level, lower, next)
}

function progressFor(xp: number, level: number, lower: number, next: number): LevelProgress {
  const xpIntoLevel = xp - lower
  const xpForNextLevel = next - lower
  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    nextLevelXP: next,
    progressPercent: Math.floor(xpIntoLevel / xpForNextLevel * 100),
  }
}
