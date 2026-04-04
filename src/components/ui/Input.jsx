import { forwardRef, useState } from 'react'
import './ui.css'

const Input = forwardRef(function Input(
  { label, error, type = 'text', id, ...props },
  ref
) {
  const [focused, setFocused] = useState(false)
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className={`input-group ${error ? 'input-group--error' : ''} ${focused ? 'input-group--focused' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="input-group__label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        className="input-group__input"
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          props.onBlur?.(e)
        }}
        {...props}
      />
      {error && (
        <p className="input-group__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
