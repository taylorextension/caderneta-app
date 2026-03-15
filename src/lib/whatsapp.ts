export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length >= 10) return '55' + digits
  return digits
}

export function openWhatsApp(phone: string, message: string): void {
  const cleanPhone = normalizePhone(phone)
  const encoded = encodeURIComponent(message)
  const url = `https://wa.me/${cleanPhone}?text=${encoded}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
