export const sections = [
  'Home',
  'Today',
  'Roadmaps',
  'Calendar',
  'Progress',
  'Tests',
  'Projects',
  'Career',
  'Internships',
  'Jobs',
  'Resources',
  'Settings',
] as const

export type Section = (typeof sections)[number]
