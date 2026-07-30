import {
  DEFAULT_FILAMENT_TYPE,
  DEFAULT_FILAMENT_VARIANT,
  type Filament,
  type ShareFilament,
} from '../types/filament'

export function resolveType(value?: string): string {
  return value?.trim() || DEFAULT_FILAMENT_TYPE
}

export function resolveVariant(value?: string): string {
  return value?.trim() || DEFAULT_FILAMENT_VARIANT
}

export function withFilamentDefaults<T extends Pick<Filament, 'type' | 'variant'>>(item: T): T {
  return {
    ...item,
    type: resolveType(item.type),
    variant: resolveVariant(item.variant),
  }
}

export function typeVariantLabel(item: Pick<ShareFilament, 'type' | 'variant'>): string {
  return `${resolveType(item.type)} · ${resolveVariant(item.variant)}`
}
