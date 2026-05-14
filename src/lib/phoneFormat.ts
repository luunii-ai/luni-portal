/** Digits only (for API / persistence). */
export function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Brazilian phone mask while typing: (11) 99090-9090 (11 digits) or (11) 3456-7890 (10).
 */
export function formatBrazilPhoneInput(value: string): string {
  const d = phoneDigitsOnly(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${d.slice(0, 2)}) ${rest}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }
  return `(${d.slice(0, 2)}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}
