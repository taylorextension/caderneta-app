'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useTrial } from '@/hooks/use-trial'

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
        className={`group relative flex items-center justify-between w-full px-4 py-3 rounded-2xl overflow-hidden transition-all ${
          urgent
            ? 'bg-[#A8200D]'
            : 'bg-[#163300]'
        }`}
      >
        {/* Accent glow */}
        <div
          className={`absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-30 ${
            urgent ? 'bg-[#FF6B4A]' : 'bg-[#9FE870]'
          }`}
        />

        <div className="relative flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
              urgent ? 'bg-white/15' : 'bg-[#9FE870]/20'
            }`}
          >
            <span className="text-base">⚡</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">
              {diasRestantes === 1
                ? 'Último dia grátis!'
                : `${diasRestantes} dias grátis restantes`}
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">
              Assine o Caderneta Pro
            </p>
          </div>
        </div>

        <span
          className={`relative text-xs font-semibold px-3.5 py-1.5 rounded-full shrink-0 transition-transform group-hover:scale-105 ${
            urgent
              ? 'bg-white text-[#A8200D]'
              : 'bg-[#9FE870] text-[#163300]'
          }`}
        >
          Assinar
        </span>
      </Link>
    </motion.div>
  )
}
