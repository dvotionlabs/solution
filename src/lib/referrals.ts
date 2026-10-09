// Referral names are claims for Chris to verify, never authority to change billing.
export function referralName(value: unknown): string | null {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || value.length > 100 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value.trim().replace(/\s+/g, ' ');
}
