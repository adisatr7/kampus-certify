/**
 * CSS Injection Utilities for Ijazah Print Normalization
 * Handles dynamic CSS injection for print-specific styles
 * Addresses Requirements: 3.1, 4.1, 4.3, 4.4
 */

import { generateCSSCustomProperties, generateFontProperties } from './measurementUtils';

/**
 * CSS injection modes for different rendering contexts
 */
export type CSSInjectionMode = 'preview' | 'pdf-preview' | 'pdf-generation';

/**
 * Configuration for CSS injection
 */
export interface CSSInjectionConfig {
  mode: CSSInjectionMode;
  includeCustomProperties?: boolean;
  includePrintStyles?: boolean;
  includeUtilities?: boolean;
  includePageBoundaries?: boolean;
  includePrintMargins?: boolean;
}

/**
 * Get the print-specific CSS content
 * @returns CSS content as string
 */
export async function getPrintCSS(): Promise<string> {
  try {
    // In a real implementation, this would load the CSS file
    // For now, we'll return the essential print CSS
    return `
/* Essential print normalization CSS */
.ijazah-print-normalized {
  width: 794px !important;
  height: 1123px !important;
  box-sizing: border-box !important;
  position: relative !important;
  margin: 0 auto !important;
  background-color: white !important;
  font-family: 'Times New Roman', serif !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  text-rendering: optimizeLegibility !important;
}

.ijazah-padding-standard {
  padding: 96px !important;
}

.ijazah-logo-margin {
  margin-top: 20px !important;
}

.ijazah-signature-margin {
  margin-bottom: 60px !important;
}

.ijazah-qr-size {
  width: 70px !important;
  height: 70px !important;
}

@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  @page {
    size: A4 portrait;
    margin: 0;
  }
  
  .print\\:hidden,
  .no-print {
    display: none !important;
  }
  
  .ijazah-print-normalized {
    width: 210mm !important;
    height: 297mm !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}
`;
  } catch (error) {
    console.error('Failed to load print CSS:', error);
    return '';
  }
}

/**
 * Inject CSS into a document or element
 * @param target - Target document or element
 * @param css - CSS content to inject
 * @param id - Unique ID for the style element
 * @returns The created style element
 */
export function injectCSS(
  target: Document | HTMLElement,
  css: string,
  id: string = 'ijazah-print-styles'
): HTMLStyleElement {
  const doc = target instanceof Document ? target : target.ownerDocument || document;
  
  // Remove existing style element if it exists
  const existing = doc.getElementById(id);
  if (existing) {
    existing.remove();
  }

  // Create new style element
  const styleElement = doc.createElement('style');
  styleElement.id = id;
  styleElement.textContent = css;

  // Append to head
  const head = doc.head || doc.getElementsByTagName('head')[0];
  head.appendChild(styleElement);

  return styleElement;
}

/**
 * Generate CSS for a specific injection mode
 * @param config - CSS injection configuration
 * @returns Generated CSS string
 */
export function generateModeCSS(config: CSSInjectionConfig): string {
  let css = '';

  // Add custom properties
  if (config.includeCustomProperties !== false) {
    const customProps = { ...generateCSSCustomProperties(), ...generateFontProperties() };
    css += ':root {\n';
    Object.entries(customProps).forEach(([prop, value]) => {
      css += `  ${prop}: ${value};\n`;
    });
    css += '}\n\n';
  }

  // Add base print styles
  if (config.includePrintStyles !== false) {
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
  color-adjust: exact !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  text-rendering: optimizeLegibility !important;
}
`;
  }

  // Add utility classes
  if (config.includeUtilities !== false) {
    css += `
.ijazah-padding-standard { padding: var(--ijazah-padding) !important; }
.ijazah-logo-margin { margin-top: var(--ijazah-logo-margin-top) !important; }
.ijazah-signature-margin { margin-bottom: var(--ijazah-signature-margin-bottom) !important; }
.ijazah-qr-size { width: var(--ijazah-qr-code-size) !important; height: var(--ijazah-qr-code-size) !important; }

.ijazah-text-base { font-size: var(--ijazah-font-base) !important; }
.ijazah-text-small { font-size: var(--ijazah-font-small) !important; }
.ijazah-text-large { font-size: var(--ijazah-font-large) !important; }
.ijazah-text-title { font-size: var(--ijazah-font-title) !important; }
`;
  }

  // Mode-specific styles
  switch (config.mode) {
    case 'pdf-preview':
      css += `
.ijazah-pdf-preview {
  border: 2px dashed #e5e7eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}
`;
      break;

    case 'pdf-generation':
      css += `
.ijazah-pdf-mode {
  transform: none !important;
  zoom: 1 !important;
  position: relative !important;
  overflow: visible !important;
  font-display: block !important;
}

.ijazah-optimized {
  animation: none !important;
  transition: none !important;
  will-change: auto !important;
  transform: translateZ(0) !important;
  contain: layout !important;
}
`;
      break;
  }

  // Add page boundaries visualization
  if (config.includePageBoundaries) {
    css += `
.ijazah-page-boundaries::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px solid #ef4444;
  pointer-events: none;
  z-index: 1000;
}
`;
  }

  // Add print margins visualization
  if (config.includePrintMargins) {
    css += `
.ijazah-print-margins::after {
  content: '';
  position: absolute;
  top: var(--ijazah-padding);
  left: var(--ijazah-padding);
  right: var(--ijazah-padding);
  bottom: var(--ijazah-padding);
  border: 1px dashed #f59e0b;
  pointer-events: none;
  z-index: 999;
}
`;
  }

  return css;
}

/**
 * Apply print normalization to an element
 * @param element - Target element
 * @param config - CSS injection configuration
 * @returns Cleanup function to remove injected styles
 */
export function applyPrintNormalization(
  element: HTMLElement,
  config: CSSInjectionConfig
): () => void {
  // Add CSS classes based on mode
  const classes = ['ijazah-print-normalized'];
  
  switch (config.mode) {
    case 'pdf-preview':
      classes.push('ijazah-pdf-preview');
      break;
    case 'pdf-generation':
      classes.push('ijazah-pdf-mode', 'ijazah-optimized');
      break;
  }

  if (config.includePageBoundaries) {
    classes.push('ijazah-page-boundaries');
  }

  if (config.includePrintMargins) {
    classes.push('ijazah-print-margins');
  }

  // Store original classes
  const originalClasses = element.className;

  // Apply new classes
  element.className = `${originalClasses} ${classes.join(' ')}`.trim();

  // Inject CSS
  const css = generateModeCSS(config);
  const styleElement = injectCSS(element, css, `ijazah-styles-${config.mode}`);

  // Return cleanup function
  return () => {
    element.className = originalClasses;
    if (styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  };
}

/**
 * Prepare element for PDF generation by applying optimizations
 * @param element - Target element
 * @returns Cleanup function
 */
export function preparePDFGeneration(element: HTMLElement): () => void {
  return applyPrintNormalization(element, {
    mode: 'pdf-generation',
    includeCustomProperties: true,
    includePrintStyles: true,
    includeUtilities: true,
  });
}

/**
 * Setup PDF preview mode with visual indicators
 * @param element - Target element
 * @param showBoundaries - Show page boundaries
 * @param showMargins - Show print margins
 * @returns Cleanup function
 */
export function setupPDFPreview(
  element: HTMLElement,
  showBoundaries: boolean = false,
  showMargins: boolean = false
): () => void {
  return applyPrintNormalization(element, {
    mode: 'pdf-preview',
    includeCustomProperties: true,
    includePrintStyles: true,
    includeUtilities: true,
    includePageBoundaries: showBoundaries,
    includePrintMargins: showMargins,
  });
}

/**
 * Normalize custom template CSS for consistent rendering
 * @param customCSS - Custom CSS content
 * @returns Normalized CSS with print optimizations
 */
export function normalizeCustomTemplateCSS(customCSS: string): string {
  let normalizedCSS = customCSS;

  // Add print color preservation to all elements
  normalizedCSS += `
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
`;

  // Ensure container dimensions are consistent
  normalizedCSS += `
.ijazah-container,
.certificate-container,
.document-container {
  width: 794px !important;
  height: 1123px !important;
  box-sizing: border-box !important;
  position: relative !important;
  margin: 0 auto !important;
}
`;

  // Add font rendering optimizations
  normalizedCSS += `
body, * {
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  text-rendering: optimizeLegibility !important;
}
`;

  return normalizedCSS;
}

/**
 * Validate CSS for print compatibility
 * @param css - CSS content to validate
 * @returns Validation result with issues and suggestions
 */
export function validatePrintCSS(css: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check for relative units in critical properties
  const relativeUnitPattern = /(?:width|height|padding|margin|font-size):\s*[^;]*(?:%|vw|vh|em|rem)/gi;
  const relativeMatches = css.match(relativeUnitPattern);
  if (relativeMatches) {
    issues.push('Found relative units in critical properties');
    suggestions.push('Use absolute units (px, pt, mm) for consistent print output');
  }

  // Check for viewport units
  const viewportUnitPattern = /(?:vw|vh|vmin|vmax)/gi;
  if (viewportUnitPattern.test(css)) {
    issues.push('Found viewport units which may cause inconsistent PDF output');
    suggestions.push('Replace viewport units with fixed pixel values');
  }

  // Check for print color adjustment
  const colorAdjustPattern = /-webkit-print-color-adjust|print-color-adjust/gi;
  if (!colorAdjustPattern.test(css)) {
    suggestions.push('Add print-color-adjust: exact for better color reproduction');
  }

  // Check for animations or transitions
  const animationPattern = /(?:animation|transition):/gi;
  if (animationPattern.test(css)) {
    suggestions.push('Consider disabling animations during PDF generation');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}