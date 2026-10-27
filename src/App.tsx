import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr, getActiveSlot, activateSlotDb, migrateLegacyIfNeeded } from './db'
import { EXERCISE_SEED, SEED_REV } from './data/exercises.seed'
import { importLibrary, LIB_REV } from './data/library-import'
import { tickReminder } from './lib/reminders'
import { FlameIcon, DumbbellIcon, RouteIcon, TrendIcon, UserIcon } from './components/icons'
import FirstRun from './views/FirstRun'
import Onboarding from './views/Onboarding'
import Today from './views/Today'
import Gym, { type GymView } from './views/Gym'
import Run from './views/Run'
import Progress from './views/Progress'
import ProfileView from './views/Profile'

export type Tab = 'today' | 'gym' | 'run' | 'progress' | 'profile'

const TABS: { id: Tab; label: string; Icon: (p: { className?: string }) => React.ReactNode }[] = [
  { id: 'today', label: 'Hôm nay', Icon: FlameIcon },
  { id: 'gym', label: 'Gym', Icon: DumbbellIcon },
  { id: 'run', label: 'Chạy', Icon: RouteIcon },
  { id: 'progress', label: 'Tiến trình', Icon: TrendIcon },
  { id: 'profile', label: 'Hồ sơ', Icon: UserIcon }
]

export default function App() {
  const [tick, setTick] = useState(0)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    void (async () => {
      await migrateLegacyIfNeeded()
      const slot = getActiveSlot()
      if (slot) activateSlotDb(slot.id)
      setBooted(true)
    })()
  }, [])

  if (!booted) return null
  const slot = getActiveSlot()
  if (!slot) return <FirstRun onDone={() => setTick(t => t + 1)} />
  return <AppShell key={`${slot.id}:${tick}`} onUsersChanged={() => setTick(t => t + 1)} />
}

function AppShell({ onUsersChanged }: { onUsersChanged: () => void }) {
  const [tab, setTab] = useState<Tab>('today')
  const [gymInit, setGymInit] = useState<GymView | undefined>()
  const profile = useLiveQuery(() => db.profile.get(1))

  const startSession = async (slugs: string[], name: string) => {
    const id = await db.sessions.add({ date: todayStr(), startedAt: new Date(), name, slugs })
    setGymInit({ kind: 'session', id })
    setTab('gym')
  }

  // Seed riêng cho từng hồ sơ (chạy khi AppShell của hồ sơ đó mount)
  useEffect(() => {
    void (async () => {
      const row = await db.settings.get('seedRev')
      if ((row?.value as number | undefined) !== SEED_REV) {
        const existing = await db.exercises.toArray()
        const bySlug = new Map(existing.map(e => [e.slug, e]))
        for (const seed of EXERCISE_SEED) {
          const cur = bySlug.get(seed.slug)
          if (cur?.id != null) {
            await db.exercises.update(cur.id, { ...seed, id: cur.id, pinnedVideoUrl: cur.pinnedVideoUrl })
          } else {
            await db.exercises.add(seed)
          }
        }
        await db.settings.put({ key: 'seedRev', value: SEED_REV })
      }

      const libRow = await db.settings.get('libRev')
      if ((libRow?.value as number | undefined) !== LIB_REV) {
        try {
          await importLibrary()
          await db.settings.put({ key: 'libRev', value: LIB_REV })
        } catch { /* offline lần đầu — sẽ thử lại ở lần mở sau */ }
      }
    })()
  }, [])

  useEffect(() => {
    const t = setInterval(() => { void tickReminder() }, 30_000)
    return () => clearInterval(t)
  }, [])

  if (profile === undefined) return null // Dexie đang nạp

  if (!profile) return <Onboarding />

  return (
    <>
      <div className="app">
        {tab === 'today' && <Today onGoGym={() => setTab('gym')} onQuickStart={startSession} />}
        {tab === 'gym' && <Gym initial={gymInit} startSession={startSession} />}
        {tab === 'run' && <Run />}
        {tab === 'progress' && <Progress />}
        {tab === 'profile' && <ProfileView onUsersChanged={onUsersChanged} />}
      </div>
      <nav className="tabbar" aria-label="Điều hướng chính">
        <div className="inner">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
              <Icon className={undefined} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
