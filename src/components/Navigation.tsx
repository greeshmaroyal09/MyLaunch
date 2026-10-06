import { useState } from 'react'
import {
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  Compass,
  GraduationCap,
  House,
  Layers3,
  ListChecks,
  MoreHorizontal,
  Settings,
  Sparkles,
  BookOpenText,
  ClipboardCheck,
  Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { sections, type Section } from '../types'
import './components.css'

type NavigationProps = {
  activeSection: Section
  onNavigate: (section: Section) => void
}

const sectionIcons: Record<Section, LucideIcon> = {
  Home: House,
  Today: ListChecks,
  Roadmaps: Compass,
  Calendar: CalendarDays,
  Progress: ChartNoAxesCombined,
  Tests: ClipboardCheck,
  Projects: Layers3,
  Career: Target,
  Internships: GraduationCap,
  Jobs: BriefcaseBusiness,
  Resources: BookOpenText,
  Settings,
}

const mobileSections: Section[] = ['Home', 'Today', 'Roadmaps', 'Progress']

export function Navigation({ activeSection, onNavigate }: NavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const extraSections = sections.filter((section) => !mobileSections.includes(section))

  function chooseSection(section: Section) {
    onNavigate(section)
    setMoreOpen(false)
  }

  return (
    <>
      <aside className="sidebar" aria-label="Main navigation">
        <button className="brand-lockup" type="button" onClick={() => chooseSection('Home')} aria-label="MyLaunch home">
          <span className="brand-icon"><Sparkles size={18} aria-hidden="true" /></span>
          <span className="brand-name">my<span>launch</span></span>
        </button>
        <div className="sidebar-caption">YOUR JOURNEY</div>
        <nav className="side-nav">
          {sections.slice(0, 5).map((section) => {
            const Icon = sectionIcons[section]
            return <NavButton key={section} section={section} icon={Icon} active={activeSection === section} onClick={() => chooseSection(section)} />
          })}
        </nav>
        <div className="sidebar-caption toolkit-caption">CAREER TOOLKIT</div>
        <nav className="side-nav">
          {sections.slice(5).map((section) => {
            const Icon = sectionIcons[section]
            return <NavButton key={section} section={section} icon={Icon} active={activeSection === section} onClick={() => chooseSection(section)} />
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="footer-sparkle"><Sparkles size={14} aria-hidden="true" /></div>
          <span>A little progress, every day.</span>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileSections.map((section) => {
          const Icon = sectionIcons[section]
          return <NavButton key={section} section={section} icon={Icon} active={activeSection === section} onClick={() => chooseSection(section)} compact />
        })}
        <button className={`mobile-more ${moreOpen ? 'is-open' : ''}`} type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}>
          <MoreHorizontal size={20} aria-hidden="true" /><span>More</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="mobile-more-menu" aria-label="More sections">
          {extraSections.map((section) => {
            const Icon = sectionIcons[section]
            return <NavButton key={section} section={section} icon={Icon} active={activeSection === section} onClick={() => chooseSection(section)} />
          })}
        </div>
      )}
    </>
  )
}

type NavButtonProps = {
  section: Section
  icon: LucideIcon
  active: boolean
  onClick: () => void
  compact?: boolean
}

function NavButton({ section, icon: Icon, active, onClick, compact = false }: NavButtonProps) {
  return (
    <button className={`nav-item${active ? ' active' : ''}${compact ? ' compact' : ''}`} type="button" onClick={onClick} aria-current={active ? 'page' : undefined}>
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
      <span>{section}</span>
    </button>
  )
}
