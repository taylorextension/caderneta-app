'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          padding: '1.5rem',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Algo deu errado
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1.5rem' }}>
            Ocorreu um erro inesperado.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: '#163300',
              color: '#fff',
              border: 'none',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
