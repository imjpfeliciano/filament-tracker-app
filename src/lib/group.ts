import { compareHexByColor } from './hex'
import type { ShareFilament } from '../types/filament'

function compareShareFilaments(a: ShareFilament, b: ShareFilament): number {
  const byColor = compareHexByColor(a.hex, b.hex)
  if (byColor !== 0) return byColor

  const byName = a.colorName.trim().localeCompare(b.colorName.trim(), undefined, {
    sensitivity: 'base',
  })
  if (byName !== 0) return byName

  const byType = (a.type ?? '').localeCompare(b.type ?? '', undefined, { sensitivity: 'base' })
  if (byType !== 0) return byType

  return (a.variant ?? '').localeCompare(b.variant ?? '', undefined, { sensitivity: 'base' })
}

/** Group by brand (A–Z), items sorted by color proximity (hue), then name. */
export function groupByBrand(items: ShareFilament[]): Array<{ brand: string; items: ShareFilament[] }> {
  const map = new Map<string, ShareFilament[]>()

  for (const item of items) {
    const brand = item.brand.trim() || 'Unknown'
    const list = map.get(brand) ?? []
    list.push(item)
    map.set(brand, list)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([brand, groupItems]) => ({
      brand,
      items: [...groupItems].sort(compareShareFilaments),
    }))
}
