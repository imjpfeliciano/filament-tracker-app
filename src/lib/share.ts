import { deflateSync, inflateSync } from 'fflate'
import {
  DEFAULT_FILAMENT_TYPE,
  DEFAULT_FILAMENT_VARIANT,
  type Filament,
  type ShareFilament,
} from '../types/filament'
import { resolveType, resolveVariant } from './defaults'
import { normalizeHex } from './hex'

/**
 * v1 row (legacy): [brand, colorName, hex] | [brand, colorName, hex, type]
 * v2 row: [brand, colorName, hex, type, variant]
 * v3: deflated JSON { b: brands[], i: rows[] }
 *     row: [brandIdx, colorName, hexWithoutHash] |
 *          [brandIdx, colorName, hexWithoutHash, type] |
 *          [brandIdx, colorName, hexWithoutHash, type, variant]
 *     Empty type/variant mean defaults (PLA / Basic).
 */
type ShareRowV1 = [string, string, string] | [string, string, string, string]
type ShareRowV2 = [string, string, string, string, string]
type ShareRowV3 =
  | [number, string, string]
  | [number, string, string, string]
  | [number, string, string, string, string]

type SharePayloadV1 = { v: 1; i: ShareRowV1[] }
type SharePayloadV2 = { v: 2; i: ShareRowV2[] }
type SharePayloadV3 = { b: string[]; i: ShareRowV3[] }

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

function buildCompactPayload(items: ShareFilament[]): SharePayloadV3 {
  const brands: string[] = []
  const brandMap = new Map<string, number>()

  const rows: ShareRowV3[] = items.map((item) => {
    const brandIdx = dictionaryIndex(brands, brandMap, item.brand.trim())
    const colorName = item.colorName.trim()
    const hex = (normalizeHex(item.hex) ?? item.hex).replace(/^#/, '')
    const type = resolveType(item.type)
    const variant = resolveVariant(item.variant)

    const isDefaultType = type === DEFAULT_FILAMENT_TYPE
    const isDefaultVariant = variant === DEFAULT_FILAMENT_VARIANT

    if (isDefaultType && isDefaultVariant) {
      return [brandIdx, colorName, hex]
    }
    if (isDefaultVariant) {
      return [brandIdx, colorName, hex, isDefaultType ? '' : type]
    }
    return [brandIdx, colorName, hex, isDefaultType ? '' : type, variant]
  })

  return { b: brands, i: rows }
}

export function encodeSharePayload(items: ShareFilament[]): string {
  const json = JSON.stringify(buildCompactPayload(items))
  const compressed = deflateSync(new TextEncoder().encode(json), { level: 9 })
  return `v3.${toBase64Url(compressed)}`
}

export function buildShareUrl(items: ShareFilament[], origin = window.location.origin): string {
  const encoded = encodeSharePayload(items)
  return `${origin}/s#${encoded}`
}

export type DecodeResult =
  | { ok: true; items: ShareFilament[] }
  | { ok: false; error: string }

function buildShareItem(
  brand: string,
  colorName: string,
  hexRaw: string,
  type?: string,
  variant?: string,
): ShareFilament | null {
  if (typeof brand !== 'string' || typeof colorName !== 'string' || typeof hexRaw !== 'string') {
    return null
  }
  const hex = normalizeHex(hexRaw.startsWith('#') ? hexRaw : `#${hexRaw}`)
  if (!hex || !brand.trim()) return null

  return {
    brand: brand.trim(),
    colorName: colorName.trim(),
    hex,
    type: resolveType(typeof type === 'string' ? type : undefined),
    variant: resolveVariant(typeof variant === 'string' ? variant : undefined),
  }
}

function parseShareRowV1(row: unknown): ShareFilament | null {
  if (!Array.isArray(row) || (row.length !== 3 && row.length !== 4)) return null
  const [brand, colorName, hexRaw, type] = row
  return buildShareItem(
    brand as string,
    colorName as string,
    hexRaw as string,
    typeof type === 'string' ? type : undefined,
  )
}

function parseShareRowV2(row: unknown): ShareFilament | null {
  if (!Array.isArray(row) || row.length !== 5) return null
  const [brand, colorName, hexRaw, type, variant] = row
  if (
    typeof brand !== 'string' ||
    typeof colorName !== 'string' ||
    typeof hexRaw !== 'string' ||
    typeof type !== 'string' ||
    typeof variant !== 'string'
  ) {
    return null
  }
  return buildShareItem(brand, colorName, hexRaw, type, variant)
}

function parseShareRowV3(row: unknown, brands: string[]): ShareFilament | null {
  if (!Array.isArray(row) || row.length < 3 || row.length > 5) return null
  const [brandIdx, colorName, hexRaw, type, variant] = row
  if (typeof brandIdx !== 'number' || !Number.isInteger(brandIdx)) return null
  if (brandIdx < 0 || brandIdx >= brands.length) return null
  if (typeof colorName !== 'string' || typeof hexRaw !== 'string') return null
  if (type !== undefined && typeof type !== 'string') return null
  if (variant !== undefined && typeof variant !== 'string') return null

  return buildShareItem(
    brands[brandIdx],
    colorName,
    hexRaw,
    type === '' ? DEFAULT_FILAMENT_TYPE : type,
    variant === '' ? DEFAULT_FILAMENT_VARIANT : variant,
  )
}

function parseLegacyJsonPayload(
  version: 'v1' | 'v2',
  bytes: Uint8Array,
): DecodeResult {
  const json = new TextDecoder().decode(bytes)
  const parsed: unknown = JSON.parse(json)

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'This share link is invalid.' }
  }

  const payload = parsed as SharePayloadV1 | SharePayloadV2
  if (!Array.isArray(payload.i)) {
    return { ok: false, error: 'This share link is invalid.' }
  }

  const items: ShareFilament[] = []
  for (const row of payload.i) {
    const item = version === 'v2' ? parseShareRowV2(row) : parseShareRowV1(row)
    if (!item) {
      return { ok: false, error: 'This share link is invalid.' }
    }
    items.push(item)
  }

  return { ok: true, items }
}

function parseV3Payload(bytes: Uint8Array): DecodeResult {
  const json = new TextDecoder().decode(inflateSync(bytes))
  const parsed: unknown = JSON.parse(json)

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'This share link is invalid.' }
  }

  const payload = parsed as SharePayloadV3
  if (!Array.isArray(payload.b) || !Array.isArray(payload.i)) {
    return { ok: false, error: 'This share link is invalid.' }
  }
  if (!payload.b.every((brand) => typeof brand === 'string')) {
    return { ok: false, error: 'This share link is invalid.' }
  }

  const items: ShareFilament[] = []
  for (const row of payload.i) {
    const item = parseShareRowV3(row, payload.b)
    if (!item) {
      return { ok: false, error: 'This share link is invalid.' }
    }
    items.push(item)
  }

  return { ok: true, items }
}

export function decodeShareHash(hash: string): DecodeResult {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) {
    return { ok: false, error: 'This share link is invalid.' }
  }

  const match = /^(v[123])\.(.+)$/.exec(raw)
  if (!match) {
    return { ok: false, error: 'This share link is invalid.' }
  }

  const version = match[1] as 'v1' | 'v2' | 'v3'
  try {
    const bytes = fromBase64Url(match[2])
    if (version === 'v3') {
      return parseV3Payload(bytes)
    }
    return parseLegacyJsonPayload(version, bytes)
  } catch {
    return { ok: false, error: 'This share link is invalid.' }
  }
}
