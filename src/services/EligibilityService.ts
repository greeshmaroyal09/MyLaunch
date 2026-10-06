import type { Opportunity } from '../domain/opportunity'

export type EligibilityOutcome = 'ELIGIBLE' | 'INELIGIBLE' | 'UNKNOWN'

export type EligibilityEvaluation = {
  outcome: EligibilityOutcome
  explanation: string
}

export function evaluateOpportunityEligibility(opportunity: Opportunity, graduationYear = 2028): EligibilityEvaluation {
  const eligibility = opportunity.eligibility ?? {}
  const explicitYears = [...new Set([...(eligibility.eligibleGraduationYears ?? []), ...extractYearsFromText(eligibility.batchText ?? '')])]
  const minimumYear = eligibility.minimumGraduationYear
  const maximumYear = eligibility.maximumGraduationYear

  if (explicitYears.length > 0) {
    if (explicitYears.includes(graduationYear)) {
      return {
        outcome: 'ELIGIBLE',
        explanation: `Graduation year ${graduationYear} is included.`,
      }
    }

    return {
      outcome: 'INELIGIBLE',
      explanation: `Opportunity specifies ${explicitYears.join(', ')} as the eligible graduation year${explicitYears.length > 1 ? 's' : ''}.`,
    }
  }

  if (typeof minimumYear === 'number' || typeof maximumYear === 'number') {
    if (typeof minimumYear === 'number' && graduationYear < minimumYear) {
      return {
        outcome: 'INELIGIBLE',
        explanation: `Opportunity specifies ${minimumYear} as the minimum graduation year.`,
      }
    }

    if (typeof maximumYear === 'number' && graduationYear > maximumYear) {
      return {
        outcome: 'INELIGIBLE',
        explanation: `Opportunity specifies ${maximumYear} as the maximum graduation year.`,
      }
    }

    if (typeof minimumYear === 'number' && typeof maximumYear === 'number' && graduationYear >= minimumYear && graduationYear <= maximumYear) {
      return {
        outcome: 'ELIGIBLE',
        explanation: `Graduation year ${graduationYear} falls within the recorded range of ${minimumYear} to ${maximumYear}.`,
      }
    }

    if (typeof minimumYear === 'number' && graduationYear >= minimumYear) {
      return {
        outcome: 'ELIGIBLE',
        explanation: `Graduation year ${graduationYear} meets the minimum graduation year of ${minimumYear}.`,
      }
    }

    if (typeof maximumYear === 'number' && graduationYear <= maximumYear) {
      return {
        outcome: 'ELIGIBLE',
        explanation: `Graduation year ${graduationYear} is within the maximum graduation year of ${maximumYear}.`,
      }
    }
  }

  if (eligibility.batchText && eligibility.batchText.trim().length > 0) {
    const parsedYears = extractYearsFromText(eligibility.batchText)
    if (parsedYears.length > 0) {
      if (parsedYears.includes(graduationYear)) {
        return {
          outcome: 'ELIGIBLE',
          explanation: `Graduation year ${graduationYear} is included in the batch text.`,
        }
      }

      return {
        outcome: 'INELIGIBLE',
        explanation: `Opportunity specifies ${parsedYears.join(', ')} in the batch text and does not include ${graduationYear}.`,
      }
    }
  }

  return {
    outcome: 'UNKNOWN',
    explanation: 'No graduation-year requirement is recorded.',
  }
}

function extractYearsFromText(value: string): number[] {
  const matches = value.match(/\b20\d{2}\b/g)
  if (!matches) return []
  return [...new Set(matches.map((match) => Number(match)))].filter((year) => Number.isFinite(year))
}
