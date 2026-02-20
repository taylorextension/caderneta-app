export function openWhatsApp(phone: string, message: string): void {
  const cleanPhone = phone.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  const url = `https://wa.me/${cleanPhone}?text=${encoded}`
  window.open(url, '_blank')
}
