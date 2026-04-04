import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h1 className="not-found__title">Page not found</h1>
      <p className="not-found__text">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" size="md">
          Go Home
        </Button>
      </Link>
    </div>
  )
}
