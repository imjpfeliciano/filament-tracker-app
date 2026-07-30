import type { Filament, ShareFilament } from '../types/filament'
import { resolveType, resolveVariant } from './defaults'
import { normalizeHex } from './hex'

/**
 * v1 row (legacy): [brand, colorName, hex] | [brand, colorName, hex, type]
 * v2 row: [brand, colorName, hex, type, variant]
 */
type ShareRowV1 = [string, string, string] | [string, string, string, string]
type ShareRowV2 = [string, string, string, string, string]

type SharePayloadV1 = { v: 1; i: ShareRowV1[] }
type SharePayloadV2 = { v: 2; i: ShareRowV2[] }

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

export function encodeSharePayload(items: ShareFilament[]): string {
  const payload: SharePayloadV2 = {
    v: 2,
    i: items.map((item) => [
      item.brand,
      item.colorName,
      item.hex,
      item.type ?? '',
      item.variant ?? '',
    ]),
  }
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)
  return `v2.${toBase64Url(bytes)}`
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
  const hex = normalizeHex(hexRaw)
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

export function decodeShareHash(hash: string): DecodeResult {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) {
    return { ok: false, error: 'This share link is invalid.' }
  }

  const match = /^(v[12])\.(.+)$/.exec(raw)
  if (!match) {
    return { ok: false, error: 'This share link is invalid.' }
  }

  const version = match[1]
  try {
    const bytes = fromBase64Url(match[2])
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
  } catch {
    return { ok: false, error: 'This share link is invalid.' }
  }
}
