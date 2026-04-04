import './ui.css'

export default function Spinner({ size = 'md' }) {
  return (
    <div className={`spinner spinner--${size}`} role="status" aria-label="Loading">
      <div className="spinner__circle" />
    </div>
  )
}
