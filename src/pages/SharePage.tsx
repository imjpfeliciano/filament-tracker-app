import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FilamentSheet } from '../components/FilamentSheet'
import { decodeShareHash } from '../lib/share'

export function SharePage() {
  const { hash } = useLocation()
  const result = useMemo(() => decodeShareHash(hash), [hash])

  if (!result.ok) {
    return (
      <div className="page page-narrow">
        <section className="panel error-panel">
          <h1>Invalid share link</h1>
          <p>{result.error}</p>
          <Link className="btn btn-primary" to="/">
            Go to Filament Tracker
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="page page-share">
      <FilamentSheet items={result.items} title="Available filaments" />
      <p className="viewer-footer">
        <Link to="/">Open Filament Tracker</Link>
        {' — '}create your own collection, or return to your inventory if you already have one.
      </p>
    </div>
  )
}
