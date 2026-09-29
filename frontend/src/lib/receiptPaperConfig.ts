/**
 * Thermal receipt layout — safe printable zone per roll width.
 *
 * Physical roll width ≠ printable width: drivers often clip ~3–4mm per side on 80mm.
 * All receipt HTML is laid out inside `printableWidthMm`, centered on `@page` paper width.
 */

export type ReceiptPaperWidth = 58 | 80;

export type PaperLayoutConfig = {
  paperWidthMm: number;
  /** Total width of `.receipt` (includes horizontal padding). */
  printableWidthMm: number;
  /** Horizontal padding inside `.receipt` (each side). */
  padXMm: number;
  /** Reference for monospace line wrapping (HTML tables use mm columns). */
  charsPerLine: number;
  /** Typical ESC/POS dot width at 203dpi (documentation / future use). */
  printDots: number;
  itemsColQtyMm: number;
  itemsColAmtMm: number;
  /** Right inset for money columns so values never touch the cutter edge. */
  amountPadRightMm: number;
};

export const PAPER_CONFIG: Record<ReceiptPaperWidth, PaperLayoutConfig> = {
  "58": {
    paperWidthMm: 58,
    printableWidthMm: 46,
    padXMm: 1.5,
    charsPerLine: 30,
    printDots: 384,
    itemsColQtyMm: 7,
    itemsColAmtMm: 17,
    amountPadRightMm: 1,
  },
  "80": {
    paperWidthMm: 80,
    /** Below nominal 72mm — avoids right-edge clip on common 80mm ESC/POS heads. */
    printableWidthMm: 66,
    padXMm: 2,
    charsPerLine: 42,
    printDots: 576,
    itemsColQtyMm: 8,
    itemsColAmtMm: 22,
    amountPadRightMm: 1.5,
  },
};

export function getPaperConfig(paperMm: ReceiptPaperWidth): PaperLayoutConfig {
  return PAPER_CONFIG[paperMm];
}

/** Content width inside `.receipt` after horizontal padding. */
export function innerContentWidthMm(cfg: PaperLayoutConfig): number {
  return Math.max(0, cfg.printableWidthMm - cfg.padXMm * 2);
}
