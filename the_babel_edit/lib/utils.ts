import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as USD currency with commas and 2 decimal places.
 * e.g. 1234.5 → "$1,234.50"
 * Pass `showSymbol: false` to omit the "$" sign.
 */
export function formatCurrency(
  amount: number | null | undefined,
  { showSymbol = true }: { showSymbol?: boolean } = {}
): string {
  const value = Number(amount) || 0;
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `$${formatted}` : formatted;
}
