export type Filament = {
  id: string
  brand: string
  colorName: string
  hex: string
  available: boolean
  /** Material type, e.g. PLA, PETG */
  type: string
  /** Finish/variant, e.g. Matte, Silk */
  variant: string
}

export type FilamentInput = {
  brand: string
  colorName: string
  hex: string
  available: boolean
  type: string
  variant: string
}

/** Display-only fields encoded in share links */
export type ShareFilament = {
  brand: string
  colorName: string
  hex: string
  type?: string
  variant?: string
}

export const DEFAULT_FILAMENT_TYPE = 'PLA'
export const DEFAULT_FILAMENT_VARIANT = 'Basic'

export const FILAMENT_TYPES = [
  'PLA',
  'PETG',
  'ABS',
  'ASA',
  'TPU',
  'Nylon',
  'PC',
  'PVA',
  'HIPS',
] as const

export const FILAMENT_VARIANTS = [
  'Basic',
  'Matte',
  'Glossy',
  'Silk',
  'Metallic',
  'Transparent',
  'Galaxy',
  'Gradient',
] as const
