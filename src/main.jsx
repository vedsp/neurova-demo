import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerSW } from 'virtual:pwa-register'
import './lib/i18n'
import './index.css'

registerSW({ immediate: true })

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      backgroundColor: '#fff8ec',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#7a8f5e',
          letterSpacing: '0.12em',
          margin: 0
        }}>NEUROVA</h1>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2.5px solid #e8eee0',
          borderTopColor: '#99ad7a',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  </StrictMode>
)
