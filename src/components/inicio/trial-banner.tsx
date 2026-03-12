'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useTrial } from '@/hooks/use-trial'
import { SparklesIcon } from '@heroicons/react/24/solid'

export function TrialBanner() {
  const { trialAtivo, diasRestantes, assinaturaAtiva } = useTrial()

  // Don't show for subscribers or when trial data not available
  if (assinaturaAtiva || !trialAtivo) return null

  const urgent = diasRestantes <= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        href="/ajustes/plano"
        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-colors ${
          urgent
            ? 'bg-red-50 border border-red-200'
            : 'bg-amber-50 border border-amber-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <SparklesIcon
            className={`h-5 w-5 shrink-0 ${
              urgent ? 'text-red-500' : 'text-amber-600'
            }`}
          />
          <div>
            <p
              className={`text-sm font-semibold ${
                urgent ? 'text-red-700' : 'text-amber-800'
              }`}
            >
              {diasRestantes === 1
                ? 'Último dia grátis!'
                : `${diasRestantes} dias grátis restantes`}
            </p>
            <p
              className={`text-xs ${
                urgent ? 'text-red-500' : 'text-amber-600'
              }`}
            >
              Assine o Pro por R$ 29,90/mês
            </p>
          </div>
        </div>

        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${
            urgent
              ? 'bg-red-500 text-white'
              : 'bg-amber-600 text-white'
          }`}
        >
          Assinar
        </span>
      </Link>
    </motion.div>
  )
}
