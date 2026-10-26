import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { EXERCISE_SEED, SEED_REV } from './data/exercises.seed'
import { ROUTINE_TEMPLATES } from './data/routines.seed'
import { FlameIcon, DumbbellIcon, RouteIcon, TrendIcon, UserIcon } from './components/icons'
import Onboarding from './views/Onboarding'
import Today from './views/Today'
import Gym from './views/Gym'
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
  const [tab, setTab] = useState<Tab>('today')
  const profile = useLiveQuery(() => db.profile.get(1))

  useEffect(() => {
    void (async () => {
      const row = await db.settings.get('seedRev')
      if ((row?.value as number | undefined) === SEED_REV) return
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

      const routinesSeeded = await db.settings.get('routinesSeeded')
      if (!routinesSeeded) {
        for (const t of ROUTINE_TEMPLATES) {
          await db.routines.add({ name: t.name, source: 'template', days: t.days, createdAt: new Date() })
        }
        await db.settings.put({ key: 'routinesSeeded', value: true })
      }
    })()
  }, [])

  if (profile === undefined) return null // Dexie đang nạp

  if (!profile) return <Onboarding />

  return (
    <>
      <div className="app">
        {tab === 'today' && <Today onGoGym={() => setTab('gym')} />}
        {tab === 'gym' && <Gym />}
        {tab === 'run' && <Run />}
        {tab === 'progress' && <Progress />}
        {tab === 'profile' && <ProfileView />}
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
