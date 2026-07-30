import { useEffect, useState } from 'react'
import { resolveType, resolveVariant, withFilamentDefaults } from '../lib/defaults'
import { normalizeHex } from '../lib/hex'
import { loadFilaments, saveFilaments } from '../lib/storage'
import type { Filament, FilamentInput } from '../types/filament'

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function sanitizeInput(input: FilamentInput): Omit<Filament, 'id'> | null {
  const brand = input.brand.trim()
  const hex = normalizeHex(input.hex)
  if (!brand || !hex) return null

  return {
    brand,
    colorName: input.colorName.trim(),
    hex,
    available: input.available,
    type: resolveType(input.type),
    variant: resolveVariant(input.variant),
  }
}

export function useFilaments() {
  const [filaments, setFilaments] = useState<Filament[]>(() =>
    loadFilaments().map(withFilamentDefaults),
  )

  useEffect(() => {
    saveFilaments(filaments.map(withFilamentDefaults))
  }, [filaments])

  function addFilament(input: FilamentInput): boolean {
    const clean = sanitizeInput(input)
    if (!clean) return false
    setFilaments((prev) => [
      ...prev,
      {
        id: createId(),
        ...clean,
      },
    ])
    return true
  }

  function updateFilament(id: string, input: FilamentInput): boolean {
    const clean = sanitizeInput(input)
    if (!clean) return false
    setFilaments((prev) =>
      prev.map((item) => (item.id === id ? { id: item.id, ...clean } : item)),
    )
    return true
  }

  function deleteFilament(id: string): void {
    setFilaments((prev) => prev.filter((item) => item.id !== id))
  }

  function toggleAvailable(id: string): void {
    setFilaments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item,
      ),
    )
  }

  function replaceFilaments(next: Filament[]): void {
    setFilaments(next.map(withFilamentDefaults))
  }

  return {
    filaments,
    addFilament,
    updateFilament,
    deleteFilament,
    toggleAvailable,
    replaceFilaments,
  }
}
