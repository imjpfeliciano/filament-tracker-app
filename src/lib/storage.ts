import {
  DEFAULT_FILAMENT_TYPE,
  DEFAULT_FILAMENT_VARIANT,
  type Filament,
} from '../types/filament'

const STORAGE_KEY = 'filament-tracker:inventory:v1'

function normalizeStoredFilament(value: unknown): Filament | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>

  if (
    typeof item.id !== 'string' ||
    typeof item.brand !== 'string' ||
    typeof item.colorName !== 'string' ||
    typeof item.hex !== 'string' ||
    typeof item.available !== 'boolean'
  ) {
    return null
  }

  // Migrate legacy `material` → `type`; default empty type/variant
  const rawType =
    typeof item.type === 'string'
      ? item.type.trim()
      : typeof item.material === 'string'
        ? item.material.trim()
        : ''
  const rawVariant = typeof item.variant === 'string' ? item.variant.trim() : ''

  return {
    id: item.id,
    brand: item.brand,
    colorName: item.colorName,
    hex: item.hex,
    available: item.available,
    type: rawType || DEFAULT_FILAMENT_TYPE,
    variant: rawVariant || DEFAULT_FILAMENT_VARIANT,
  }
}

export function loadFilaments(): Filament[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeStoredFilament).filter((item): item is Filament => item !== null)
  } catch {
    return []
  }
}

export function saveFilaments(filaments: Filament[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filaments))
}
