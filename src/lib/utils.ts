import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a user-facing document serial.
 * Formula: 0001-UMC-X-2025
 * - 0001: derived numeric id (UUID mapped deterministically to 0..9999)
 * - UMC: branding
 * - X: month in roman numerals
 * - 2025: year
 *
 * Note: because the real ID is a UUID we derive a stable 4-digit number
 * by taking the last 8 hex characters of the id (if available) and
 * mapping them to an integer mod 10000. This keeps the serial stable
 * while fitting the required format.
 */
export function generateDocumentSerial(id: string, dateStr?: string | null) {
  let num = 0;
  try {
    const hex = (id || "").replace(/[^a-fA-F0-9]/g, "").slice(-8);
    if (hex.length > 0) {
      num = parseInt(hex, 16) % 10000;
    } else {
      num = Array.from(id || "").reduce((s, ch) => s + ch.charCodeAt(0), 0) % 10000;
    }
  } catch (e) {
    num = Array.from(id || "").reduce((s, ch) => s + ch.charCodeAt(0), 0) % 10000;
  }

  const idPart = String(num).padStart(4, "0");
  const dt = dateStr ? new Date(dateStr) : new Date();
  const year = dt.getFullYear();
  const month = dt.getMonth() + 1;
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const monthRoman = romans[Math.max(0, Math.min(11, month - 1))] || "X";
  return `${idPart}-UMC-${monthRoman}-${year}`;
}
