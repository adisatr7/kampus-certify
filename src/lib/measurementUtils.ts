/**
 * Measurement Utilities for Ijazah PDF Generation
 * Provides consistent unit conversions and DPI calculations
 * Addresses Requirements: 2.1, 2.3, 2.4, 4.1, 4.2, 4.4
 */

// DPI Constants
export const DPI_SETTINGS = {
  SCREEN: 96,
  PRINT: 300,
  SCALE_FACTOR: 300 / 96, // 3.125
  MM_TO_PX: 96 / 25.4, // 3.779527559
  PX_TO_MM: 25.4 / 96, // 0.264583333
} as const;

// A4 Paper Dimensions
export const A4_DIMENSIONS = {
  WIDTH_MM: 210,
  HEIGHT_MM: 297,
  WIDTH_PX: 794, // 210mm at 96 DPI
  HEIGHT_PX: 1123, // 297mm at 96 DPI
} as const;

// Standard Ijazah Measurements (in mm)
export const IJAZAH_MEASUREMENTS = {
  PADDING: 25.4, // 1 inch
  LOGO_MARGIN_TOP: 5.29,
  SIGNATURE_MARGIN_BOTTOM: 15.88,
  QR_CODE_SIZE: 18.52,
  HEADER_HEIGHT: 12.7, // 0.5 inch
  FOOTER_HEIGHT: 25.4, // 1 inch
} as const;

/**
 * Convert millimeters to CSS pixels at 96 DPI
 * @param mm - Value in millimeters
 * @returns Value in CSS pixels
 */
export function mmToCssPx(mm: number): number {
  return Math.round(mm * DPI_SETTINGS.MM_TO_PX);
}

/**
 * Convert CSS pixels to millimeters at 96 DPI
 * @param px - Value in CSS pixels
 * @returns Value in millimeters
 */
export function cssPxToMm(px: number): number {
  return px * DPI_SETTINGS.PX_TO_MM;
}

/**
 * Convert CSS pixels to print pixels for PDF generation
 * @param cssPx - Value in CSS pixels
 * @returns Value in print pixels (300 DPI)
 */
export function toPrintPixels(cssPx: number): number {
  return Math.round(cssPx * DPI_SETTINGS.SCALE_FACTOR);
}

/**
 * Convert print pixels back to CSS pixels
 * @param printPx - Value in print pixels (300 DPI)
 * @returns Value in CSS pixels (96 DPI)
 */
export function fromPrintPixels(printPx: number): number {
  return Math.round(printPx / DPI_SETTINGS.SCALE_FACTOR);
}

/**
 * Generate CSS custom properties for consistent measurements
 * @returns Object with CSS custom property values
 */
export function generateCSSCustomProperties(): Record<string, string> {
  return {
    '--ijazah-width': `${A4_DIMENSIONS.WIDTH_PX}px`,
    '--ijazah-height': `${A4_DIMENSIONS.HEIGHT_PX}px`,
    '--ijazah-padding': `${mmToCssPx(IJAZAH_MEASUREMENTS.PADDING)}px`,
    '--ijazah-logo-margin-top': `${mmToCssPx(IJAZAH_MEASUREMENTS.LOGO_MARGIN_TOP)}px`,
    '--ijazah-signature-margin-bottom': `${mmToCssPx(IJAZAH_MEASUREMENTS.SIGNATURE_MARGIN_BOTTOM)}px`,
    '--ijazah-qr-code-size': `${mmToCssPx(IJAZAH_MEASUREMENTS.QR_CODE_SIZE)}px`,
    '--ijazah-scale-factor': DPI_SETTINGS.SCALE_FACTOR.toString(),
  };
}

/**
 * Validate that a measurement is using absolute units
 * @param value - CSS value to validate
 * @returns true if using absolute units (px, pt, mm, cm, in)
 */
export function isAbsoluteUnit(value: string): boolean {
  const absoluteUnits = /^-?\d*\.?\d+(px|pt|mm|cm|in)$/i;
  return absoluteUnits.test(value.trim());
}

/**
 * Validate that a measurement avoids relative units
 * @param value - CSS value to validate
 * @returns true if NOT using relative units (%, vw, vh, em, rem)
 */
export function avoidsRelativeUnits(value: string): boolean {
  const relativeUnits = /^-?\d*\.?\d+(%|vw|vh|em|rem)$/i;
  return !relativeUnits.test(value.trim());
}

/**
 * Convert various CSS units to pixels for consistent calculations
 * @param value - CSS value with unit
 * @param baseFontSize - Base font size in pixels (default: 16)
 * @returns Value in pixels, or null if conversion not possible
 */
export function convertToPixels(value: string, baseFontSize: number = 16): number | null {
  const match = value.match(/^(-?\d*\.?\d+)([a-z%]+)$/i);
  if (!match) return null;

  const [, numStr, unit] = match;
  const num = parseFloat(numStr);

  switch (unit.toLowerCase()) {
    case 'px':
      return num;
    case 'pt':
      return num * (96 / 72); // 1pt = 1/72 inch, 96 DPI
    case 'mm':
      return mmToCssPx(num);
    case 'cm':
      return mmToCssPx(num * 10);
    case 'in':
      return num * 96; // 96 DPI
    case 'em':
      return num * baseFontSize;
    case 'rem':
      return num * baseFontSize;
    case '%':
      // Cannot convert percentage without context
      return null;
    case 'vw':
    case 'vh':
      // Cannot convert viewport units without context
      return null;
    default:
      return null;
  }
}

/**
 * Generate standardized CSS for ijazah dimensions
 * @param options - Configuration options
 * @returns CSS string with standardized measurements
 */
export function generateIjazahCSS(options: {
  includeCustomProperties?: boolean;
  includePrintStyles?: boolean;
  includeUtilities?: boolean;
} = {}): string {
  const {
    includeCustomProperties = true,
    includePrintStyles = true,
    includeUtilities = true,
  } = options;

  let css = '';

  if (includeCustomProperties) {
    const customProps = generateCSSCustomProperties();
    css += ':root {\n';
    Object.entries(customProps).forEach(([prop, value]) => {
      css += `  ${prop}: ${value};\n`;
    });
    css += '}\n\n';
  }

  if (includePrintStyles) {
    css += `
.ijazah-print-normalized {
  width: var(--ijazah-width) !important;
  height: var(--ijazah-height) !important;
  box-sizing: border-box !important;
  position: relative !important;
  margin: 0 auto !important;
  background-color: white !important;
  font-family: 'Times New Roman', serif !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
`;
  }

  if (includeUtilities) {
    css += `
.ijazah-padding-standard { padding: var(--ijazah-padding) !important; }
.ijazah-logo-margin { margin-top: var(--ijazah-logo-margin-top) !important; }
.ijazah-signature-margin { margin-bottom: var(--ijazah-signature-margin-bottom) !important; }
.ijazah-qr-size { width: var(--ijazah-qr-code-size) !important; height: var(--ijazah-qr-code-size) !important; }
`;
  }

  return css;
}

/**
 * Calculate optimal canvas dimensions for PDF generation
 * @param targetDPI - Target DPI for PDF (default: 300)
 * @returns Canvas dimensions and scale factor
 */
export function calculateCanvasDimensions(targetDPI: number = 300): {
  width: number;
  height: number;
  scale: number;
} {
  const scale = targetDPI / DPI_SETTINGS.SCREEN;
  return {
    width: A4_DIMENSIONS.WIDTH_PX,
    height: A4_DIMENSIONS.HEIGHT_PX,
    scale,
  };
}

/**
 * Validate ijazah template dimensions
 * @param element - HTML element to validate
 * @returns Validation result with any issues found
 */
export function validateIjazahDimensions(element: HTMLElement): {
  isValid: boolean;
  issues: string[];
  actualDimensions: { width: number; height: number };
} {
  const rect = element.getBoundingClientRect();
  const issues: string[] = [];

  // Check width
  if (Math.abs(rect.width - A4_DIMENSIONS.WIDTH_PX) > 2) {
    issues.push(`Width mismatch: expected ${A4_DIMENSIONS.WIDTH_PX}px, got ${rect.width}px`);
  }

  // Check height
  if (Math.abs(rect.height - A4_DIMENSIONS.HEIGHT_PX) > 2) {
    issues.push(`Height mismatch: expected ${A4_DIMENSIONS.HEIGHT_PX}px, got ${rect.height}px`);
  }

  // Check for relative units in computed styles
  const computedStyle = window.getComputedStyle(element);
  const width = computedStyle.width;
  const height = computedStyle.height;

  if (!avoidsRelativeUnits(width)) {
    issues.push(`Width uses relative units: ${width}`);
  }

  if (!avoidsRelativeUnits(height)) {
    issues.push(`Height uses relative units: ${height}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    actualDimensions: {
      width: rect.width,
      height: rect.height,
    },
  };
}

/**
 * Font size utilities for consistent typography
 */
export const FONT_SIZES = {
  // Absolute font sizes in points (print-friendly)
  TINY: '8pt',
  SMALL: '10pt',
  BASE: '12pt',
  MEDIUM: '14pt',
  LARGE: '16pt',
  XL: '20pt',
  XXL: '24pt',
  TITLE: '36pt',
  DISPLAY: '48pt',
} as const;

/**
 * Convert font size to pixels for consistent rendering
 * @param fontSize - Font size string (e.g., '12pt', '16px')
 * @returns Font size in pixels
 */
export function fontSizeToPixels(fontSize: string): number {
  const pixels = convertToPixels(fontSize);
  return pixels ?? 16; // Fallback to 16px
}

/**
 * Generate font-related CSS custom properties
 * @returns Object with font-related CSS custom properties
 */
export function generateFontProperties(): Record<string, string> {
  return {
    '--ijazah-font-tiny': FONT_SIZES.TINY,
    '--ijazah-font-small': FONT_SIZES.SMALL,
    '--ijazah-font-base': FONT_SIZES.BASE,
    '--ijazah-font-medium': FONT_SIZES.MEDIUM,
    '--ijazah-font-large': FONT_SIZES.LARGE,
    '--ijazah-font-xl': FONT_SIZES.XL,
    '--ijazah-font-xxl': FONT_SIZES.XXL,
    '--ijazah-font-title': FONT_SIZES.TITLE,
    '--ijazah-font-display': FONT_SIZES.DISPLAY,
  };
}