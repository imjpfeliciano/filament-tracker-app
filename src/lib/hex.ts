const HEX6 = /^#([0-9a-fA-F]{6})$/
const HEX3 = /^#([0-9a-fA-F]{3})$/

/** Normalize #RGB or #RRGGBB to uppercase #RRGGBB. Returns null if invalid. */
export function normalizeHex(value: string): string | null {
  const trimmed = value.trim()
  const short = HEX3.exec(trimmed)
  if (short) {
    const [r, g, b] = short[1]
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  const long = HEX6.exec(trimmed)
  if (long) {
    return `#${long[1]}`.toUpperCase()
  }
  return null
}

export function isValidHex(value: string): boolean {
  return normalizeHex(value) !== null
}

export type Hsl = {
  h: number
  s: number
  l: number
}

/** Convert #RRGGBB to HSL. Hue is 0–360; s/l are 0–1. */
export function hexToHsl(hex: string): Hsl | null {
  const normalized = normalizeHex(hex)
  if (!normalized) return null

  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) {
    return { h: 0, s: 0, l }
  }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h = 0
  switch (max) {
    case r:
      h = ((g - b) / delta) % 6
      break
    case g:
      h = (b - r) / delta + 2
      break
    default:
      h = (r - g) / delta + 4
      break
  }
  h *= 60
  if (h < 0) h += 360

  return { h, s, l }
}

/**
 * Sort key for color proximity: chromatic colors by hue, then saturation,
 * then lightness. Near-greys (low saturation) sort after hues by lightness.
 */
export function colorSortTuple(hex: string): [number, number, number, number] {
  const hsl = hexToHsl(hex)
  if (!hsl) return [2, 0, 0, 0]

  const isGrey = hsl.s < 0.12
  if (isGrey) {
    return [1, hsl.l, hsl.s, 0]
  }

  return [0, hsl.h, hsl.s, hsl.l]
}

export function compareHexByColor(a: string, b: string): number {
  const left = colorSortTuple(a)
  const right = colorSortTuple(b)
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i]
  }
  return a.localeCompare(b)
}
