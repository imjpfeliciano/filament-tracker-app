import { deflateSync, inflateSync } from 'fflate'
import {
  DEFAULT_FILAMENT_TYPE,
  DEFAULT_FILAMENT_VARIANT,
  FILAMENT_TYPES,
  FILAMENT_VARIANTS,
  type Filament,
  type ShareFilament,
} from '../types/filament'
import { resolveType, resolveVariant } from './defaults'
import { normalizeHex } from './hex'

/**
 * Compact binary share format (deflated, base64url as `f1.<payload>`):
 * brands: u8 count + length-prefixed utf8 strings
 * items: u16 count + for each:
 *   brandIdx u8, name (u8 len + utf8), rgb 3 bytes,
 *   typeCode u8, variantCode u8
 *     0x00.. = index into known FILAMENT_TYPES / FILAMENT_VARIANTS
 *     0xFF = custom string follows (u8 len + utf8)
 */

const CUSTOM = 0xff

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  const binary = atob(padded + '='.repeat(padLength))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function dictionaryIndex(values: string[], map: Map<string, number>, value: string): number {
  const existing = map.get(value)
  if (existing !== undefined) return existing
  const index = values.length
  values.push(value)
  map.set(value, index)
  return index
}

function knownIndex(list: readonly string[], value: string): number {
  const idx = list.findIndex((item) => item.toLowerCase() === value.toLowerCase())
  return idx >= 0 ? idx : -1
}

function writeString(parts: number[], value: string): void {
  const bytes = new TextEncoder().encode(value)
  if (bytes.length > 255) {
    throw new Error('Share field too long')
  }
  parts.push(bytes.length, ...bytes)
}

function readString(bytes: Uint8Array, offset: { i: number }): string {
  if (offset.i >= bytes.length) throw new Error('truncated')
  const length = bytes[offset.i]
  offset.i += 1
  if (offset.i + length > bytes.length) throw new Error('truncated')
  const value = new TextDecoder().decode(bytes.subarray(offset.i, offset.i + length))
  offset.i += length
  return value
}

function writeCodedString(parts: number[], value: string, known: readonly string[]): void {
  const idx = knownIndex(known, value)
  if (idx >= 0 && idx < CUSTOM) {
    parts.push(idx)
    return
  }
  parts.push(CUSTOM)
  writeString(parts, value)
}

function readCodedString(
  bytes: Uint8Array,
  offset: { i: number },
  known: readonly string[],
  fallback: string,
): string {
  if (offset.i >= bytes.length) throw new Error('truncated')
  const code = bytes[offset.i]
  offset.i += 1
  if (code === CUSTOM) {
    const custom = readString(bytes, offset).trim()
    return custom || fallback
  }
  if (code < known.length) return known[code]
  return fallback
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function toShareFilaments(filaments: Filament[]): ShareFilament[] {
  return filaments
    .filter((f) => f.available)
    .map((f) => ({
      brand: f.brand,
      colorName: f.colorName,
      hex: f.hex,
      type: resolveType(f.type),
      variant: resolveVariant(f.variant),
    }))
}

function encodeBinary(items: ShareFilament[]): Uint8Array {
  const brands: string[] = []
  const brandMap = new Map<string, number>()
  const parts: number[] = []

  for (const item of items) {
    dictionaryIndex(brands, brandMap, item.brand.trim())
  }

  if (brands.length > 255 || items.length > 65535) {
    throw new Error('Share payload too large')
  }

  parts.push(brands.length)
  for (const brand of brands) {
    writeString(parts, brand)
  }

  parts.push((items.length >> 8) & 0xff, items.length & 0xff)

  for (const item of items) {
    const brandIdx = brandMap.get(item.brand.trim())
    const rgb = hexToRgb(item.hex)
    if (brandIdx === undefined || !rgb) {
      throw new Error('Invalid share item')
    }

    parts.push(brandIdx)
    writeString(parts, item.colorName.trim())
    parts.push(rgb[0], rgb[1], rgb[2])
    writeCodedString(parts, resolveType(item.type), FILAMENT_TYPES)
    writeCodedString(parts, resolveVariant(item.variant), FILAMENT_VARIANTS)
  }

  return Uint8Array.from(parts)
}

function decodeBinary(bytes: Uint8Array): ShareFilament[] {
  const offset = { i: 0 }
  if (offset.i >= bytes.length) throw new Error('truncated')

  const brandCount = bytes[offset.i]
  offset.i += 1
  const brands: string[] = []
  for (let i = 0; i < brandCount; i += 1) {
    brands.push(readString(bytes, offset))
  }

  if (offset.i + 2 > bytes.length) throw new Error('truncated')
  const itemCount = (bytes[offset.i] << 8) | bytes[offset.i + 1]
  offset.i += 2

  const items: ShareFilament[] = []
  for (let i = 0; i < itemCount; i += 1) {
    if (offset.i >= bytes.length) throw new Error('truncated')
    const brandIdx = bytes[offset.i]
    offset.i += 1
    if (brandIdx >= brands.length) throw new Error('bad brand')

    const colorName = readString(bytes, offset)
    if (offset.i + 3 > bytes.length) throw new Error('truncated')
    const r = bytes[offset.i]
    const g = bytes[offset.i + 1]
    const b = bytes[offset.i + 2]
    offset.i += 3

    const type = readCodedString(bytes, offset, FILAMENT_TYPES, DEFAULT_FILAMENT_TYPE)
    const variant = readCodedString(bytes, offset, FILAMENT_VARIANTS, DEFAULT_FILAMENT_VARIANT)
    const brand = brands[brandIdx]?.trim()
    if (!brand) throw new Error('bad brand')

    items.push({
      brand,
      colorName,
      hex: rgbToHex(r, g, b),
      type: resolveType(type),
      variant: resolveVariant(variant),
    })
  }

  return items
}

export function encodeSharePayload(items: ShareFilament[]): string {
  const packed = encodeBinary(items)
  const compressed = deflateSync(packed, { level: 9 })
  return `f1.${toBase64Url(compressed)}`
}

export function buildShareUrl(items: ShareFilament[], origin = window.location.origin): string {
  const encoded = encodeSharePayload(items)
  return `${origin}/s#${encoded}`
}

export type DecodeResult =
  | { ok: true; items: ShareFilament[] }
  | { ok: false; error: string }

export function decodeShareHash(hash: string): DecodeResult {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) {
    return { ok: false, error: 'This share link is invalid.' }
  }

  const match = /^f1\.(.+)$/.exec(raw)
  if (!match) {
    return { ok: false, error: 'This share link is invalid.' }
  }

  try {
    const compressed = fromBase64Url(match[1])
    const items = decodeBinary(inflateSync(compressed))
    return { ok: true, items }
  } catch {
    return { ok: false, error: 'This share link is invalid.' }
  }
}
