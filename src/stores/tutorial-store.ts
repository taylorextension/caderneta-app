'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TutorialState {
  isActive: boolean
  hasCompleted: boolean
  hasDismissed: boolean
  currentStep: number

  start: () => void
  nextStep: () => void
  prevStep: () => void
  dismiss: () => void
  complete: () => void
  reset: () => void
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      isActive: false,
      hasCompleted: false,
      hasDismissed: false,
      currentStep: 0,

      start: () => set({ isActive: true, hasDismissed: false }),
      nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
      prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),
      dismiss: () => set({ isActive: false, hasDismissed: true }),
      complete: () => set({ isActive: false, hasCompleted: true }),
      reset: () => set({ isActive: false, hasCompleted: false, hasDismissed: false, currentStep: 0 }),
    }),
    {
      name: 'caderneta-tutorial-storage',
    }
  )
)
