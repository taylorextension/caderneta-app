'use client'

import { useCallback, useRef, useState } from 'react'

export function useCamera() {
  const [capturing, setCapturing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const capture = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleCapture = useCallback(
    async (
      file: File,
      onResult: (base64: string) => void
    ) => {
      setCapturing(true)
      try {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          onResult(result)
          setCapturing(false)
        }
        reader.onerror = () => {
          setCapturing(false)
        }
        reader.readAsDataURL(file)
      } catch {
        setCapturing(false)
      }
    },
    []
  )

  return { capturing, inputRef, capture, handleCapture }
}
