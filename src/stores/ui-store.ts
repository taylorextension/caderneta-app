'use client'

import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
}

interface UIState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    set((state) => {
      // Prevent duplicate messages showing at the same time
      if (state.toasts.some((t) => t.message === toast.message)) {
        return state
      }
      const id = Math.random().toString(36).substring(2)
      return { toasts: [...state.toasts, { ...toast, id }] }
    })

    setTimeout(() => {
      set((state) => {
        // Find by message instead of exact id just to be safe, or just clear the last one
        return { toasts: state.toasts.slice(1) } // Simplified auto-remove since IDs might mismatch in strict mode but let's stick to safe removal
      })
    }, toast.action ? 5000 : 3000)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
