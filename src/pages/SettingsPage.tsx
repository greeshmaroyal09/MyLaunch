import { HardDrive, Moon, Sun } from 'lucide-react'
import type { AppTheme } from '../domain/appState'
import './settings.css'

type SettingsPageProps = {
  theme: AppTheme
  onThemeChange: (theme: AppTheme) => void
}

export function SettingsPage({ theme, onThemeChange }: SettingsPageProps) {
  return (
    <div className="settings-page">
      <header className="settings-heading">
        <div>
          <p className="settings-eyebrow">MYLAUNCH / PREFERENCES</p>
          <h1>Settings</h1>
          <p>Adjust how MyLaunch looks on this device.</p>
        </div>
      </header>

      <section className="settings-panel" aria-labelledby="settings-appearance-title">
        <div className="settings-panel-heading">
          <div className="settings-panel-icon"><Sun size={18} aria-hidden="true" /></div>
          <div>
            <h2 id="settings-appearance-title">Appearance</h2>
            <p>Choose the theme used across MyLaunch.</p>
          </div>
        </div>
        <fieldset className="settings-theme-fieldset">
          <legend>Theme</legend>
          <div className="settings-theme-options">
            <label className={theme === 'light' ? 'is-selected' : ''}>
              <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => onThemeChange('light')} />
              <Sun size={17} aria-hidden="true" />
              <span>Light</span>
            </label>
            <label className={theme === 'dark' ? 'is-selected' : ''}>
              <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => onThemeChange('dark')} />
              <Moon size={17} aria-hidden="true" />
              <span>Dark</span>
            </label>
          </div>
        </fieldset>
      </section>

      <section className="settings-panel settings-data-panel" aria-labelledby="settings-data-title">
        <div className="settings-panel-heading">
          <div className="settings-panel-icon is-mint"><HardDrive size={18} aria-hidden="true" /></div>
          <div>
            <h2 id="settings-data-title">Data</h2>
            <p>Preparation information stays in this browser.</p>
          </div>
        </div>
        <div className="settings-data-detail">
          <strong>Stored locally</strong>
          <span>Progress, schedules, projects, tests, and career tracking use MyLaunch's existing browser storage. Theme preference is saved with the same data.</span>
        </div>
      </section>
    </div>
  )
}