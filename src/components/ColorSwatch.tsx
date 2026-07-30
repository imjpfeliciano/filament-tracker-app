type ColorSwatchProps = {
  hex: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ColorSwatch({ hex, size = 'md', className = '' }: ColorSwatchProps) {
  return (
    <span
      className={`swatch swatch-${size} ${className}`.trim()}
      style={{ backgroundColor: hex }}
      title={hex}
      aria-hidden="true"
    />
  )
}
