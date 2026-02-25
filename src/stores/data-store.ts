'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { InicioData, NotaComCliente } from '@/types/database'

interface DataState {
    // Cached data
    inicioData: InicioData | null
    clientesData: any[] | null
    ultimasAcoes: Record<string, { tipo: string; created_at: string }>
    lastFetchedAt: Record<string, number>

    // Setters
    setInicioData: (data: InicioData) => void
    setClientesData: (data: any[]) => void
    setUltimasAcoes: (acoes: Record<string, { tipo: string; created_at: string }>) => void
    markFetched: (key: string) => void
    hasCached: (key: string) => boolean
    clearAll: () => void
}

export const useDataStore = create<DataState>()(
    persist(
        (set, get) => ({
            inicioData: null,
            clientesData: null,
            ultimasAcoes: {},
            lastFetchedAt: {},

            setInicioData: (data) => set({ inicioData: data }),
            setClientesData: (data) => set({ clientesData: data }),
            setUltimasAcoes: (acoes) => set({ ultimasAcoes: acoes }),
            markFetched: (key) =>
                set((state) => ({
                    lastFetchedAt: { ...state.lastFetchedAt, [key]: Date.now() },
                })),
            hasCached: (key) => {
                const state = get()
                const lastFetched = state.lastFetchedAt[key]
                // Cache valid for 5 minutes
                return !!lastFetched && Date.now() - lastFetched < 5 * 60 * 1000
            },
            clearAll: () =>
                set({
                    inicioData: null,
                    clientesData: null,
                    ultimasAcoes: {},
                    lastFetchedAt: {},
                }),
        }),
        {
            name: 'caderneta-data',
            partialize: (state) => ({
                inicioData: state.inicioData,
                clientesData: state.clientesData,
                ultimasAcoes: state.ultimasAcoes,
                lastFetchedAt: state.lastFetchedAt,
            }),
        }
    )
)
