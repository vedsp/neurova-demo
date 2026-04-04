import { forwardRef } from 'react'
import './ui.css'

const Button = forwardRef(function Button(
  { children, variant = 'primary', size = 'md', fullWidth = false, loading = false, disabled = false, type = 'button', ...props },
  ref
) {
  const classNames = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full',
    loading && 'btn--loading'
  ].filter(Boolean).join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      <span className={loading ? 'btn__text--hidden' : 'btn__text'}>
        {children}
      </span>
    </button>
  )
})

export default Button
