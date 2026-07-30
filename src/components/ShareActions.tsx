import { useState } from 'react'
import { Link } from 'react-router-dom'
import { copyText } from '../lib/clipboard'

type ShareActionsProps = {
  url: string
  shareHash: string
  disabled?: boolean
  showOpen?: boolean
}

export function ShareActions({
  url,
  shareHash,
  disabled = false,
  showOpen = true,
}: ShareActionsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  async function handleCopy() {
    if (disabled || !url) return
    const ok = await copyText(url)
    setCopyState(ok ? 'copied' : 'error')
    window.setTimeout(() => setCopyState('idle'), ok ? 2000 : 2500)
  }

  return (
    <div className="share-actions-block">
      <div className="toolbar-group" aria-label="Share">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleCopy()}
          disabled={disabled}
        >
          {copyState === 'copied' ? 'Link copied' : 'Copy link'}
        </button>
        {showOpen && !disabled ? (
          <Link className="btn btn-ghost" to={{ pathname: '/s', hash: shareHash }}>
            Open share
          </Link>
        ) : (
          <button type="button" className="btn btn-ghost" disabled>
            Open share
          </button>
        )}
      </div>
      {copyState === 'error' ? (
        <p className="form-error">Could not copy — try Open share and copy the URL from the address bar.</p>
      ) : null}
    </div>
  )
}
