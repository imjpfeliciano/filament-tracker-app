import { useState } from 'react'
import { typeVariantLabel } from '../lib/defaults'
import { groupByBrand } from '../lib/group'
import type { ShareFilament } from '../types/filament'

type FilamentSheetProps = {
  items: ShareFilament[]
  title?: string
  subtitle?: string
}

export function FilamentSheet({
  items,
  title = 'Available filaments',
  subtitle,
}: FilamentSheetProps) {
  const groups = groupByBrand(items)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  async function copyHex(hex: string, key: string) {
    try {
      await navigator.clipboard.writeText(hex)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500)
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  if (items.length === 0) {
    return (
      <section className="sheet">
        <header className="sheet-header">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
        <p className="empty-hint">No available filaments to show.</p>
      </section>
    )
  }

  return (
    <section className="sheet">
      <header className="sheet-header">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        <p className="sheet-meta">
          {items.length} color{items.length === 1 ? '' : 's'} · {groups.length} brand
          {groups.length === 1 ? '' : 's'}
        </p>
      </header>

      <div className="sheet-groups">
        {groups.map((group) => (
          <div key={group.brand} className="brand-group">
            <h2>{group.brand}</h2>
            <ul className="swatch-grid">
              {group.items.map((item, index) => {
                const label = item.colorName || item.hex
                const key = `${group.brand}-${item.hex}-${item.colorName}-${index}`
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className="swatch-tile"
                      onClick={() => void copyHex(item.hex, key)}
                      aria-label={`${label}, ${typeVariantLabel(item)}, ${item.hex}. Click to copy hex.`}
                    >
                      <span className="swatch-tile-color" style={{ backgroundColor: item.hex }} />
                      <span className="swatch-tile-meta">
                        <span className="swatch-tile-name">{label}</span>
                        <span className="swatch-tile-details">{typeVariantLabel(item)}</span>
                        <span className="swatch-tile-hex">
                          {copiedKey === key ? 'Copied' : item.hex}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
