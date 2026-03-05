// Admin emails that have access to /admin routes
export const ADMIN_EMAILS = ['junioborgesmc@gmail.com']

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}
