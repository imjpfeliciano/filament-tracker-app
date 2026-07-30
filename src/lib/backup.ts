import { withFilamentDefaults } from './defaults'
import { normalizeHex } from './hex'
import type { Filament } from '../types/filament'

export const BACKUP_VERSION = 1 as const

export type InventoryBackup = {
  v: typeof BACKUP_VERSION
  exportedAt: string
  filaments: Filament[]
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function parseFilament(value: unknown): Filament | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>

  if (typeof item.brand !== 'string' || typeof item.hex !== 'string') {
    return null
  }

  const hex = normalizeHex(item.hex)
  const brand = item.brand.trim()
  if (!hex || !brand) return null

  const colorName = typeof item.colorName === 'string' ? item.colorName : ''
  const available = typeof item.available === 'boolean' ? item.available : true
  const type =
    typeof item.type === 'string'
      ? item.type
      : typeof item.material === 'string'
        ? item.material
        : ''
  const variant = typeof item.variant === 'string' ? item.variant : ''
  const id = typeof item.id === 'string' && item.id.trim() ? item.id : createId()

  return withFilamentDefaults({
    id,
    brand,
    colorName,
    hex,
    available,
    type,
    variant,
  })
}

export function buildBackup(filaments: Filament[]): InventoryBackup {
  return {
    v: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    filaments: filaments.map(withFilamentDefaults),
  }
}

export function exportBackupJson(filaments: Filament[]): string {
  return `${JSON.stringify(buildBackup(filaments), null, 2)}\n`
}

export type ParseBackupResult =
  | { ok: true; filaments: Filament[] }
  | { ok: false; error: string }

export function parseBackupJson(raw: string): ParseBackupResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }

  let rows: unknown[]
  if (Array.isArray(parsed)) {
    rows = parsed
  } else if (parsed && typeof parsed === 'object') {
    const backup = parsed as { v?: unknown; filaments?: unknown }
    if (!Array.isArray(backup.filaments)) {
      return {
        ok: false,
        error: 'JSON must be a filament array or an export with a filaments list.',
      }
    }
    if (backup.v !== undefined && backup.v !== BACKUP_VERSION) {
      return { ok: false, error: 'This backup version is not supported.' }
    }
    rows = backup.filaments
  } else {
    return { ok: false, error: 'JSON must be a filament array or an export with a filaments list.' }
  }

  const filaments = rows.map(parseFilament).filter((item): item is Filament => item !== null)
  if (filaments.length === 0 && rows.length > 0) {
    return { ok: false, error: 'No valid filaments found in that file.' }
  }

  return { ok: true, filaments }
}

export function downloadBackup(filaments: Filament[]): void {
  const blob = new Blob([exportBackupJson(filaments)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `filament-inventory-${stamp}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
