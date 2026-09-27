/**
 * Deterministic Calculation Engine for Invoicing, Quotes & Lead-to-Cash.
 * Server-authoritative: Browser inputs for calculated values are ignored.
 */

import type { InvoiceLineType, InvoiceUnitCode } from '@/lib/data/interfaces';

export interface LineInput {
  id?: string;
  sectionId?: string | null;
  productId?: string | null;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountRate?: number | null;
  discount?: number | null; // legacy alias
  unitCost?: number | null;
  taxRate: number;
  lineType?: InvoiceLineType;
  unitCode?: InvoiceUnitCode;
  isSelected?: boolean;
}

export interface CalculatedLine {
  id?: string;
  sectionId?: string | null;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  unitCost?: number | null;
  taxRate: number;
  lineType: InvoiceLineType;
  unitCode: InvoiceUnitCode;
  grossHT: number;
  discountAmount: number;
  totalHT: number; // Net HT
  taxAmount: number;
  totalTTC: number;
  costHT?: number | null;
  marginHT?: number | null;
  marginRate?: number | null;
}

export interface VatRateBreakdown {
  rate: number;
  taxRate: number; // convenience alias
  taxBaseHT: number;
  baseHT: number; // convenience alias
  taxAmount: number;
  totalTTC: number;
}

export interface DocumentTotals {
  grossHT: number;
  discountAmount: number;
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
  vatBreakdown: VatRateBreakdown[];
  taxGroups: VatRateBreakdown[];
  lines: CalculatedLine[];
  depositAmount: number;
  prepaidAmount: number;
  amountDue: number;
  totalCostHT?: number;
  totalMarginHT?: number;
  marginRate?: number;
}

export interface CalculationOptions {
  depositMode?: 'none' | 'percentage' | 'fixed';
  depositRate?: number | null;
  depositFixedAmount?: number | null;
  prepaidAmount?: number | null;
  sections?: Array<{ id: string; isOptional?: boolean; isSelected?: boolean }>;
}

/**
 * Standard rounding to 2 decimal places with half-up precision.
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export const round2 = roundMoney;

/**
 * Calculates financial amounts for a single line item.
 */
export function calculateLine(line: LineInput): CalculatedLine {
  const quantity = Math.max(0, Number(line.quantity) || 0);
  const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
  const discountRateRaw = Number(line.discountRate ?? line.discount ?? 0);
  const discountRate = Math.max(0, Math.min(100, isNaN(discountRateRaw) ? 0 : discountRateRaw));
  const taxRate = Math.max(0, Number(line.taxRate) || 0);

  const grossHT = roundMoney(quantity * unitPrice);
  const discountAmount = roundMoney(grossHT * (discountRate / 100));
  const netHT = roundMoney(grossHT - discountAmount);
  const taxAmount = roundMoney(netHT * (taxRate / 100));
  const totalTTC = roundMoney(netHT + taxAmount);

  let costHT: number | null = null;
  let marginHT: number | null = null;
  let marginRate: number | null = null;

  if (typeof line.unitCost === 'number' && !isNaN(line.unitCost)) {
    costHT = roundMoney(quantity * line.unitCost);
    marginHT = roundMoney(netHT - costHT);
    marginRate = netHT > 0 ? roundMoney((marginHT / netHT) * 100) : 0;
  }

  return {
    id: line.id,
    sectionId: line.sectionId,
    productId: line.productId,
    description: line.description || '',
    quantity,
    unitPrice,
    discountRate,
    unitCost: line.unitCost,
    taxRate,
    lineType: line.lineType || 'service',
    unitCode: line.unitCode || 'unit',
    grossHT,
    discountAmount,
    totalHT: netHT,
    taxAmount,
    totalTTC,
    costHT,
    marginHT,
    marginRate,
  };
}

export const calculateLineTotals = calculateLine;

/**
 * Calculates complete document totals with multi-VAT grouping,
 * deposit calculations, and remaining amount due.
 */
export function calculateDocumentTotals(
  lines: LineInput[],
  options: CalculationOptions = {}
): DocumentTotals {
  let activeLines = lines;
  if (options.sections && options.sections.length > 0) {
    const unselectedSectionIds = new Set(
      options.sections
        .filter((s) => s.isOptional && s.isSelected === false)
        .map((s) => s.id)
    );
    activeLines = lines.filter(
      (l) => (!l.sectionId || !unselectedSectionIds.has(l.sectionId)) && l.isSelected !== false
    );
  }

  const calculatedLines = activeLines.map(calculateLine);

  let grossHT = 0;
  let discountAmount = 0;
  let totalHT = 0;
  let totalTax = 0;
  let totalCostHT = 0;
  let hasCosts = false;

  const vatGroups = new Map<number, { taxBaseHT: number; taxAmount: number }>();

  for (const line of calculatedLines) {
    grossHT = roundMoney(grossHT + line.grossHT);
    discountAmount = roundMoney(discountAmount + line.discountAmount);
    totalHT = roundMoney(totalHT + line.totalHT);
    totalTax = roundMoney(totalTax + line.taxAmount);

    if (line.costHT != null) {
      totalCostHT = roundMoney(totalCostHT + line.costHT);
      hasCosts = true;
    }

    const group = vatGroups.get(line.taxRate) || { taxBaseHT: 0, taxAmount: 0 };
    group.taxBaseHT = roundMoney(group.taxBaseHT + line.totalHT);
    group.taxAmount = roundMoney(group.taxAmount + line.taxAmount);
    vatGroups.set(line.taxRate, group);
  }

  const totalTTC = roundMoney(totalHT + totalTax);

  const vatBreakdown: VatRateBreakdown[] = Array.from(vatGroups.entries())
    .map(([rate, group]) => ({
      rate,
      taxRate: rate,
      taxBaseHT: group.taxBaseHT,
      baseHT: group.taxBaseHT,
      taxAmount: group.taxAmount,
      totalTTC: roundMoney(group.taxBaseHT + group.taxAmount),
    }))
    .sort((a, b) => a.rate - b.rate);

  // Deposit calculation
  let depositAmount = 0;
  const depositMode = options.depositMode ?? 'none';

  if (depositMode === 'percentage') {
    const rate = Math.max(0, Math.min(100, Number(options.depositRate) || 0));
    depositAmount = roundMoney(totalTTC * (rate / 100));
  } else if (depositMode === 'fixed') {
    const fixed = Math.max(0, Number(options.depositFixedAmount) || 0);
    depositAmount = Math.min(roundMoney(fixed), totalTTC);
  }

  // Clamping deposit within [0, totalTTC]
  depositAmount = Math.max(0, Math.min(depositAmount, totalTTC));

  // Amount due
  const prepaidAmount = Math.max(0, roundMoney(Number(options.prepaidAmount) || 0));
  const amountDue = Math.max(0, roundMoney(totalTTC - prepaidAmount));

  let totalMarginHT: number | undefined;
  let marginRate: number | undefined;

  if (hasCosts) {
    totalMarginHT = roundMoney(totalHT - totalCostHT);
    marginRate = totalHT > 0 ? roundMoney((totalMarginHT / totalHT) * 100) : 0;
  }

  return {
    grossHT,
    discountAmount,
    totalHT,
    taxAmount: totalTax,
    totalTTC,
    vatBreakdown,
    taxGroups: vatBreakdown,
    lines: calculatedLines,
    depositAmount,
    prepaidAmount,
    amountDue,
    totalCostHT: hasCosts ? totalCostHT : undefined,
    totalMarginHT,
    marginRate,
  };
}

/**
 * Calculates proportional line breakdown for a deposit invoice based on the quote's VAT breakdown.
 */
export function calculateDepositInvoiceLines(
  quoteTotals: DocumentTotals,
  depositAmount: number,
  quoteNumber: string
): Array<{
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalHT: number;
  taxAmount: number;
  totalTTC: number;
}> {
  if (quoteTotals.totalTTC <= 0 || depositAmount <= 0) {
    return [];
  }

  const depositRatio = depositAmount / quoteTotals.totalTTC;
  const depositPercentage = roundMoney(depositRatio * 100);

  let allocatedTTC = 0;
  const lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    totalHT: number;
    taxAmount: number;
    totalTTC: number;
  }> = [];

  const nonZeroVatGroups = quoteTotals.vatBreakdown.filter(v => v.totalTTC > 0);

  for (let i = 0; i < nonZeroVatGroups.length; i++) {
    const vatGroup = nonZeroVatGroups[i];
    const isLast = i === nonZeroVatGroups.length - 1;

    let groupTTC: number;
    if (isLast) {
      groupTTC = roundMoney(depositAmount - allocatedTTC);
    } else {
      groupTTC = roundMoney(vatGroup.totalTTC * depositRatio);
      allocatedTTC = roundMoney(allocatedTTC + groupTTC);
    }

    const groupHT = roundMoney(groupTTC / (1 + vatGroup.rate / 100));
    const groupTax = roundMoney(groupTTC - groupHT);

    lines.push({
      description: `Acompte (${depositPercentage}%) sur Devis ${quoteNumber} — TVA ${vatGroup.rate}%`,
      quantity: 1,
      unitPrice: groupHT,
      taxRate: vatGroup.rate,
      totalHT: groupHT,
      taxAmount: groupTax,
      totalTTC: groupTTC,
    });
  }

  return lines;
}
