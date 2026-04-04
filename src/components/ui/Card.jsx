import './ui.css'

export default function Card({ children, className = '', padding = 'md', ...props }) {
  return (
    <div className={`card card--pad-${padding} ${className}`} {...props}>
      {children}
    </div>
  )
}
