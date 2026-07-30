import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilamentForm } from '../components/FilamentForm'
import { FilamentList } from '../components/FilamentList'
import { FilamentSheet } from '../components/FilamentSheet'
import { useFilaments } from '../hooks/useFilaments'
import { downloadBackup, parseBackupJson } from '../lib/backup'
import { buildShareUrl, encodeSharePayload, toShareFilaments } from '../lib/share'

export function InventoryPage() {
  const {
    filaments,
    addFilament,
    updateFilament,
    deleteFilament,
    toggleAvailable,
    replaceFilaments,
  } = useFilaments()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [backupMessage, setBackupMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(
    null,
  )
  const importInputRef = useRef<HTMLInputElement>(null)

  const editing = filaments.find((f) => f.id === editingId) ?? null
  const shareItems = useMemo(() => toShareFilaments(filaments), [filaments])
  const availableCount = shareItems.length

  async function copyShareLink() {
    const url = buildShareUrl(shareItems)
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 2500)
    }
  }

  function handleExport() {
    downloadBackup(filaments)
    setBackupMessage({
      kind: 'ok',
      text: `Exported ${filaments.length} filament${filaments.length === 1 ? '' : 's'} as JSON.`,
    })
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const result = parseBackupJson(text)
      if (!result.ok) {
        setBackupMessage({ kind: 'error', text: result.error })
        return
      }

      if (
        filaments.length > 0 &&
        !window.confirm(
          `Replace your current inventory (${filaments.length}) with ${result.filaments.length} filament${result.filaments.length === 1 ? '' : 's'} from this file?`,
        )
      ) {
        return
      }

      replaceFilaments(result.filaments)
      setEditingId(null)
      setBackupMessage({
        kind: 'ok',
        text: `Imported ${result.filaments.length} filament${result.filaments.length === 1 ? '' : 's'}.`,
      })
    } catch {
      setBackupMessage({ kind: 'error', text: 'Could not read that file.' })
    }
  }

  return (
    <div className="page page-workspace">
      <header className="app-header">
        <div className="app-header-main">
          <div>
            <p className="eyebrow">Local only</p>
            <h1>Filament Tracker</h1>
            <p className="lede">
              {filaments.length} in inventory · {availableCount} available to share. Data stays in
              this browser.
            </p>
          </div>

          <div className="header-toolbar">
            <div className="toolbar-group" aria-label="Share">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void copyShareLink()}
                disabled={availableCount === 0}
              >
                {copyState === 'copied' ? 'Link copied' : 'Copy share link'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowPreview((v) => !v)}
                disabled={availableCount === 0}
              >
                {showPreview ? 'Hide preview' : 'Preview'}
              </button>
              {availableCount > 0 ? (
                <Link
                  className="btn btn-ghost"
                  to={{ pathname: '/s', hash: encodeSharePayload(shareItems) }}
                >
                  Open share
                </Link>
              ) : null}
            </div>

            <div className="toolbar-divider" aria-hidden="true" />

            <div className="toolbar-group" aria-label="Backup">
              <button type="button" className="btn btn-ghost" onClick={handleExport}>
                Export JSON
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => importInputRef.current?.click()}
              >
                Import JSON
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void handleImportFile(file)
                }}
              />
            </div>
          </div>
        </div>

        {(copyState === 'error' || backupMessage) && (
          <div className="header-messages">
            {copyState === 'error' ? (
              <p className="form-error">
                Could not copy — try opening the share view and copying the URL.
              </p>
            ) : null}
            {backupMessage ? (
              <p className={backupMessage.kind === 'error' ? 'form-error' : 'muted'}>
                {backupMessage.text}
              </p>
            ) : null}
          </div>
        )}
      </header>

      {showPreview && availableCount > 0 ? (
        <section className="panel preview-panel">
          <FilamentSheet
            items={shareItems}
            title="Available filaments"
            subtitle="Preview of what viewers will see from your share link."
          />
        </section>
      ) : null}

      <div className="workspace">
        <section className="panel inventory-panel">
          <div className="panel-heading">
            <h2>Your inventory</h2>
            <p className="muted">Sorted by color. Click a swatch to edit it in the form.</p>
          </div>
          <div className="inventory-scroll">
            <FilamentList
              filaments={filaments}
              editingId={editingId}
              onEdit={setEditingId}
              onDelete={(id) => {
                deleteFilament(id)
                if (editingId === id) setEditingId(null)
              }}
              onToggleAvailable={toggleAvailable}
            />
          </div>
        </section>

        <aside className="panel form-panel">
          <div className="panel-heading">
            <h2>{editing ? 'Edit filament' : 'Add filament'}</h2>
          </div>
          <FilamentForm
            key={editing?.id ?? 'new'}
            initial={editing}
            submitLabel={editing ? 'Save changes' : 'Add filament'}
            onCancel={editing ? () => setEditingId(null) : undefined}
            onSubmit={(input) => {
              if (editing) {
                const ok = updateFilament(editing.id, input)
                if (ok) setEditingId(null)
                return ok
              }
              return addFilament(input)
            }}
          />
        </aside>
      </div>
    </div>
  )
}
