import { useEffect, useState } from 'react'
import Library from './gym/Library'
import ExerciseDetail from './gym/ExerciseDetail'
import SessionRunner from './gym/SessionRunner'
import PlansHome from './gym/PlansHome'
import PlanEditor from './gym/PlanEditor'

export type GymView =
  | { kind: 'plans' }
  | { kind: 'library' }
  | { kind: 'detail'; slug: string }
  | { kind: 'plan'; id: number }
  | { kind: 'session'; id: number }

export default function Gym({ initial, startSession }: {
  initial?: GymView
  startSession: (slugs: string[], name: string) => void
}) {
  const [view, setView] = useState<GymView>(initial ?? { kind: 'plans' })
  useEffect(() => { if (initial) setView(initial) }, [initial])

  const content = (() => {
    switch (view.kind) {
      case 'plans':
        return <PlansHome onStart={startSession} onEdit={id => setView({ kind: 'plan', id })} />
      case 'library':
        return (
          <Library
            onOpen={slug => setView({ kind: 'detail', slug })}
            onStart={id => setView({ kind: 'session', id })}
            onResume={id => setView({ kind: 'session', id })}
          />
        )
      case 'detail':
        return <ExerciseDetail slug={view.slug} onBack={() => setView({ kind: 'library' })} />
      case 'plan':
        return <PlanEditor id={view.id} onBack={() => setView({ kind: 'plans' })} />
      case 'session':
        return <SessionRunner id={view.id} onDone={() => setView({ kind: 'plans' })} />
    }
  })()

  if (view.kind === 'session') return <>{content}</>

  return (
    <>
      <div className="seg" style={{ marginTop: 16 }}>
        <button type="button" className={view.kind === 'plans' || view.kind === 'plan' ? 'on' : ''} onClick={() => setView({ kind: 'plans' })}>Kế hoạch</button>
        <button type="button" className={view.kind === 'library' || view.kind === 'detail' ? 'on' : ''} onClick={() => setView({ kind: 'library' })}>Thư viện</button>
      </div>
      {content}
    </>
  )
}
