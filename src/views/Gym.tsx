import { useState } from 'react'
import Library from './gym/Library'
import ExerciseDetail from './gym/ExerciseDetail'
import SessionRunner from './gym/SessionRunner'

type GymView =
  | { kind: 'library' }
  | { kind: 'detail'; slug: string }
  | { kind: 'session'; id: number }

export default function Gym() {
  const [view, setView] = useState<GymView>({ kind: 'library' })

  if (view.kind === 'library') {
    return (
      <Library
        onOpen={slug => setView({ kind: 'detail', slug })}
        onStart={id => setView({ kind: 'session', id })}
        onResume={id => setView({ kind: 'session', id })}
      />
    )
  }
  if (view.kind === 'detail') {
    return <ExerciseDetail slug={view.slug} onBack={() => setView({ kind: 'library' })} />
  }
  return <SessionRunner id={view.id} onDone={() => setView({ kind: 'library' })} />
}
