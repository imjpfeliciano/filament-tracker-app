import { useEffect, useState, type FormEvent } from 'react'
import { isValidHex, normalizeHex } from '../lib/hex'
import { resolveType, resolveVariant } from '../lib/defaults'
import {
  DEFAULT_FILAMENT_TYPE,
  DEFAULT_FILAMENT_VARIANT,
  FILAMENT_TYPES,
  FILAMENT_VARIANTS,
  type Filament,
  type FilamentInput,
} from '../types/filament'
import { ColorSwatch } from './ColorSwatch'

type FilamentFormProps = {
  initial?: Filament | null
  onSubmit: (input: FilamentInput) => boolean
  onCancel?: () => void
  submitLabel: string
}

const empty: FilamentInput = {
  brand: '',
  colorName: '',
  hex: '#FFFFFF',
  available: true,
  type: DEFAULT_FILAMENT_TYPE,
  variant: DEFAULT_FILAMENT_VARIANT,
}

export function FilamentForm({ initial, onSubmit, onCancel, submitLabel }: FilamentFormProps) {
  const [brand, setBrand] = useState(initial?.brand ?? empty.brand)
  const [colorName, setColorName] = useState(initial?.colorName ?? empty.colorName)
  const [hex, setHex] = useState(initial?.hex ?? empty.hex)
  const [type, setType] = useState(resolveType(initial?.type))
  const [variant, setVariant] = useState(resolveVariant(initial?.variant))
  const [available, setAvailable] = useState(initial?.available ?? empty.available)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBrand(initial?.brand ?? empty.brand)
    setColorName(initial?.colorName ?? empty.colorName)
    setHex(initial?.hex ?? empty.hex)
    setType(resolveType(initial?.type))
    setVariant(resolveVariant(initial?.variant))
    setAvailable(initial?.available ?? empty.available)
    setError(null)
  }, [initial])

  const previewHex = normalizeHex(hex) ?? (isValidHex(hex) ? hex : null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const ok = onSubmit({
      brand,
      colorName,
      hex,
      available,
      type,
      variant,
    })
    if (!ok) {
      setError('Brand and a valid hex color (#RGB or #RRGGBB) are required.')
      return
    }
    if (!initial) {
      setBrand('')
      setColorName('')
      setHex('#FFFFFF')
      setType(DEFAULT_FILAMENT_TYPE)
      setVariant(DEFAULT_FILAMENT_VARIANT)
      setAvailable(true)
    }
    setError(null)
  }

  return (
    <form className="filament-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="brand">Brand</label>
        <input
          id="brand"
          name="brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="e.g. Bambu Lab"
          required
          autoComplete="off"
        />
      </div>

      <div className="form-grid-2">
        <div className="form-row">
          <label htmlFor="type">Type</label>
          <input
            id="type"
            name="type"
            list="filament-types"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="PLA"
            autoComplete="off"
          />
          <datalist id="filament-types">
            {FILAMENT_TYPES.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div className="form-row">
          <label htmlFor="variant">Variant</label>
          <input
            id="variant"
            name="variant"
            list="filament-variants"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="Basic"
            autoComplete="off"
          />
          <datalist id="filament-variants">
            {FILAMENT_VARIANTS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="colorName">Color name</label>
        <input
          id="colorName"
          name="colorName"
          value={colorName}
          onChange={(e) => setColorName(e.target.value)}
          placeholder="Optional, e.g. Ivory White"
          autoComplete="off"
        />
      </div>

      <div className="form-row hex-row">
        <label htmlFor="hex">Hex</label>
        <div className="hex-inputs">
          {previewHex ? <ColorSwatch hex={previewHex} /> : <span className="swatch swatch-md swatch-empty" />}
          <input
            id="hex"
            name="hex"
            type="color"
            value={previewHex ?? '#FFFFFF'}
            onChange={(e) => setHex(e.target.value.toUpperCase())}
            aria-label="Pick color"
          />
          <input
            name="hexText"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            placeholder="#RRGGBB"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
        />
        Available (included in share link)
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
