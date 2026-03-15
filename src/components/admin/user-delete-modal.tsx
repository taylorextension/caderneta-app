'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'

interface UserDeleteModalProps {
  open: boolean
  onClose: () => void
  userId: string | null
  userName: string
  onDeleted: () => void
}

export function UserDeleteModal({
  open,
  onClose,
  userId,
  userName,
  onDeleted,
}: UserDeleteModalProps) {
  const addToast = useUIStore((s) => s.addToast)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!userId) return
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error()
      addToast({ message: 'Usuário deletado', type: 'success' })
      onDeleted()
      onClose()
    } catch {
      addToast({ message: 'Erro ao deletar usuário', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="text-lg font-semibold mb-2 text-text-primary">
        Deletar usuário?
      </h3>
      <p className="text-sm text-text-secondary mb-2">
        <strong>{userName || 'Este usuário'}</strong> será permanentemente
        removido.
      </p>
      <p className="text-sm text-red-500 mb-6">
        Todos os dados (clientes, notas, cobranças) serão excluídos. Esta ação
        não pode ser desfeita.
      </p>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          onClick={handleDelete}
          loading={loading}
        >
          Deletar
        </Button>
      </div>
    </Modal>
  )
}
