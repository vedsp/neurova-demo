import './ui.css'

export default function ProgressBar({ current, total }) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar__track">
        <div
          className="progress-bar__fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
