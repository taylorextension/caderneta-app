import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        Página não encontrada
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        A página que você procura não existe.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center h-11 px-6 bg-[#163300] text-white text-sm font-medium rounded-xl"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
