import { useMemo } from 'react'
import { typeVariantLabel, withFilamentDefaults } from '../lib/defaults'
import { compareHexByColor } from '../lib/hex'
import type { Filament } from '../types/filament'

type FilamentListProps = {
  filaments: Filament[]
  editingId: string | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleAvailable: (id: string) => void
}

export function FilamentList({
  filaments,
  editingId,
  onEdit,
  onDelete,
  onToggleAvailable,
}: FilamentListProps) {
  const items = useMemo(
    () =>
      filaments
        .map(withFilamentDefaults)
        .sort((a, b) => {
          const byColor = compareHexByColor(a.hex, b.hex)
          if (byColor !== 0) return byColor
          return a.brand.localeCompare(b.brand, undefined, { sensitivity: 'base' })
        }),
    [filaments],
  )

  if (items.length === 0) {
    return (
      <p className="empty-hint">
        No filaments yet. Use the form to add your first brand and color — data stays in this
        browser only.
      </p>
    )
  }

  return (
    <ul className="inventory-grid">
      {items.map((item) => {
        const label = item.colorName || item.hex
        return (
          <li
            key={item.id}
            className={`inventory-card ${item.available ? '' : 'unavailable'} ${editingId === item.id ? 'editing' : ''}`.trim()}
          >
            <button
              type="button"
              className="inventory-card-swatch"
              onClick={() => onEdit(item.id)}
              aria-label={`Edit ${item.brand} ${label}`}
            >
              <span className="inventory-card-color" style={{ backgroundColor: item.hex }} />
              <span className="inventory-card-meta">
                <span className="inventory-card-brand">{item.brand}</span>
                <span className="inventory-card-name">{label}</span>
                <span className="inventory-card-details">{typeVariantLabel(item)}</span>
                <span className="inventory-card-hex">{item.hex}</span>
                {!item.available ? <span className="badge">Hidden from share</span> : null}
              </span>
            </button>
            <div className="inventory-card-actions">
              <button
                type="button"
                className="btn btn-small"
                onClick={() => onToggleAvailable(item.id)}
              >
                {item.available ? 'Hide' : 'Show'}
              </button>
              <button type="button" className="btn btn-small" onClick={() => onEdit(item.id)}>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-small btn-danger"
                onClick={() => {
                  if (window.confirm(`Delete ${item.brand} — ${label}?`)) {
                    onDelete(item.id)
                  }
                }}
              >
                Delete
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
