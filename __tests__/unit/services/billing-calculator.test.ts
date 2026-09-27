import { describe, it, expect } from 'vitest';
import {
  calculateLineTotals,
  calculateDocumentTotals,
  calculateDepositInvoiceLines,
  round2,
} from '@/lib/services/billing-calculator';

describe('billing-calculator', () => {
  describe('round2', () => {
    it('should round numbers to 2 decimal places deterministically', () => {
      expect(round2(10.555)).toBe(10.56);
      expect(round2(10.554)).toBe(10.55);
      expect(round2(0)).toBe(0);
      expect(round2(5.555)).toBe(5.56);
    });
  });

  describe('calculateLineTotals', () => {
    it('should calculate grossHT, discount, netHT, tax and totalTTC with decimal quantities', () => {
      // 2.375 m3 at 120.00 EUR/m3 with 10% discount and 20% VAT
      const result = calculateLineTotals({
        quantity: 2.375,
        unitPrice: 120.0,
        discountRate: 10,
        taxRate: 20,
      });

      // grossHT = 2.375 * 120 = 285.00
      expect(result.grossHT).toBe(285);
      // discount = 285 * 0.10 = 28.50
      expect(result.discountAmount).toBe(28.5);
      // netHT = 285 - 28.5 = 256.50
      expect(result.totalHT).toBe(256.5);
      // taxAmount = 256.50 * 0.20 = 51.30
      expect(result.taxAmount).toBe(51.3);
      // totalTTC = 256.50 + 51.30 = 307.80
      expect(result.totalTTC).toBe(307.8);
    });

    it('should handle fractional hours: 0.5 h at 65.00 EUR/h with 0% discount', () => {
      const result = calculateLineTotals({
        quantity: 0.5,
        unitPrice: 65.0,
        discountRate: 0,
        taxRate: 20,
      });

      expect(result.grossHT).toBe(32.5);
      expect(result.discountAmount).toBe(0);
      expect(result.totalHT).toBe(32.5);
      expect(result.taxAmount).toBe(6.5);
      expect(result.totalTTC).toBe(39.0);
    });

    it('should handle surface areas: 1.25 m2 at 45.50 EUR/m2 with 5.5% VAT', () => {
      const result = calculateLineTotals({
        quantity: 1.25,
        unitPrice: 45.5,
        discountRate: 5,
        taxRate: 5.5,
      });

      // grossHT = 1.25 * 45.5 = 56.875 -> 56.88
      expect(result.grossHT).toBe(56.88);
      // discount = 56.88 * 0.05 = 2.844 -> 2.84
      expect(result.discountAmount).toBe(2.84);
      // netHT = 56.88 - 2.84 = 54.04
      expect(result.totalHT).toBe(54.04);
      // taxAmount = 54.04 * 0.055 = 2.9722 -> 2.97
      expect(result.taxAmount).toBe(2.97);
      // totalTTC = 54.04 + 2.97 = 57.01
      expect(result.totalTTC).toBe(57.01);
    });

    it('guarantees that browser discount formula matches server discount formula', () => {
      // Historical bug: browser calculated quantity * unitPrice * (1 - discount/100)
      // but server ignored discount completely.
      const qty = 3;
      const price = 100;
      const discount = 15;

      const clientPreviewHT = Number((qty * price * (1 - discount / 100)).toFixed(2));
      const serverCalc = calculateLineTotals({
        quantity: qty,
        unitPrice: price,
        discountRate: discount,
        taxRate: 20,
      });

      expect(serverCalc.totalHT).toBe(clientPreviewHT);
      expect(serverCalc.totalHT).toBe(255);
    });
  });

  describe('calculateDocumentTotals (multi-VAT & options)', () => {
    it('should aggregate multi-rate VAT breakdown: 5.5%, 10%, 20%', () => {
      const lines = [
        {
          id: 'l1',
          quantity: 10,
          unitPrice: 50,
          taxRate: 5.5, // Renovation energy: net 500, tax 27.50, ttc 527.50
        },
        {
          id: 'l2',
          quantity: 5,
          unitPrice: 80,
          taxRate: 10, // Intermediate renovation: net 400, tax 40.00, ttc 440.00
        },
        {
          id: 'l3',
          quantity: 2,
          unitPrice: 150,
          taxRate: 20, // Standard new works: net 300, tax 60.00, ttc 360.00
        },
      ];

      const doc = calculateDocumentTotals(lines);

      expect(doc.totalHT).toBe(1200); // 500 + 400 + 300
      expect(doc.taxAmount).toBe(127.5); // 27.5 + 40 + 60
      expect(doc.totalTTC).toBe(1327.5); // 1200 + 127.5
      expect(doc.amountDue).toBe(1327.5);

      // Verify VAT Breakdown
      expect(doc.vatBreakdown).toHaveLength(3);
      const v55 = doc.vatBreakdown.find((v) => v.taxRate === 5.5);
      const v10 = doc.vatBreakdown.find((v) => v.taxRate === 10);
      const v20 = doc.vatBreakdown.find((v) => v.taxRate === 20);

      expect(v55).toBeDefined();
      expect(v55?.baseHT).toBe(500);
      expect(v55?.taxAmount).toBe(27.5);

      expect(v10).toBeDefined();
      expect(v10?.baseHT).toBe(400);
      expect(v10?.taxAmount).toBe(40);

      expect(v20).toBeDefined();
      expect(v20?.baseHT).toBe(300);
      expect(v20?.taxAmount).toBe(60);
    });

    it('should ignore unselected optional sections', () => {
      const sections = [
        { id: 'sec_base', isOptional: false, isSelected: true },
        { id: 'sec_opt_unselected', isOptional: true, isSelected: false },
        { id: 'sec_opt_selected', isOptional: true, isSelected: true },
      ];

      const lines = [
        {
          id: 'l1',
          sectionId: 'sec_base',
          quantity: 1,
          unitPrice: 1000,
          taxRate: 20,
        },
        {
          id: 'l2',
          sectionId: 'sec_opt_unselected',
          quantity: 1,
          unitPrice: 500, // Should NOT be included
          taxRate: 20,
        },
        {
          id: 'l3',
          sectionId: 'sec_opt_selected',
          quantity: 1,
          unitPrice: 200, // SHOULD be included
          taxRate: 20,
        },
      ];

      const doc = calculateDocumentTotals(lines, { sections });

      expect(doc.totalHT).toBe(1200); // 1000 + 200
      expect(doc.taxAmount).toBe(240); // 240
      expect(doc.totalTTC).toBe(1440);
    });

    it('should compute percentage deposit correctly (e.g. 30%)', () => {
      const lines = [
        { quantity: 1, unitPrice: 1000, taxRate: 20 }, // 1000 HT, 200 tax, 1200 TTC
      ];

      const doc = calculateDocumentTotals(lines, {
        depositMode: 'percentage',
        depositRate: 30,
      });

      expect(doc.totalTTC).toBe(1200);
      expect(doc.depositAmount).toBe(360); // 30% of 1200
      expect(doc.amountDue).toBe(1200); // For quote/standard, full total is due unless prepaid
    });

    it('should compute fixed deposit correctly (e.g. 500 EUR)', () => {
      const lines = [
        { quantity: 1, unitPrice: 1000, taxRate: 20 }, // 1200 TTC
      ];

      const doc = calculateDocumentTotals(lines, {
        depositMode: 'fixed',
        depositFixedAmount: 500,
      });

      expect(doc.depositAmount).toBe(500);
    });

    it('should clamp deposit so it never exceeds totalTTC or goes below 0', () => {
      const lines = [
        { quantity: 1, unitPrice: 100, taxRate: 20 }, // 120 TTC
      ];

      const docExceeded = calculateDocumentTotals(lines, {
        depositMode: 'fixed',
        depositFixedAmount: 500, // Exceeds 120
      });
      expect(docExceeded.depositAmount).toBe(120);

      const docNegative = calculateDocumentTotals(lines, {
        depositMode: 'fixed',
        depositFixedAmount: -50,
      });
      expect(docNegative.depositAmount).toBe(0);
    });

    it('should calculate amountDue when prepaid amount (acompte) is deducted', () => {
      const lines = [
        { quantity: 1, unitPrice: 1000, taxRate: 20 }, // 1200 TTC
      ];

      const doc = calculateDocumentTotals(lines, {
        prepaidAmount: 360,
      });

      expect(doc.totalTTC).toBe(1200);
      expect(doc.prepaidAmount).toBe(360);
      expect(doc.amountDue).toBe(840); // 1200 - 360
    });
  });

  describe('calculateDepositInvoiceLines', () => {
    it('should preserve proportional VAT rates when generating deposit invoice lines', () => {
      // Document totals with 2 VAT rates: 10% (TTC 550) and 20% (TTC 600) => Total TTC = 1150
      const lines = [
        { quantity: 1, unitPrice: 500, taxRate: 10 }, // 500 HT, 50 Tax, 550 TTC
        { quantity: 1, unitPrice: 500, taxRate: 20 }, // 500 HT, 100 Tax, 600 TTC
      ];
      const docTotals = calculateDocumentTotals(lines);
      expect(docTotals.totalTTC).toBe(1150);

      const depositAmount = 345; // Exactly 30% of 1150

      const depositLines = calculateDepositInvoiceLines(docTotals, depositAmount, 'D-2026-0001');

      expect(depositLines).toHaveLength(2);

      // Line 1: 10% VAT
      // Expected TTC = 550 * 0.30 = 165
      // Net HT = 165 / 1.10 = 150
      // Tax = 15
      const line10 = depositLines.find((b) => b.taxRate === 10);
      expect(line10).toBeDefined();
      expect(line10?.totalTTC).toBe(165);
      expect(line10?.totalHT).toBe(150);
      expect(line10?.taxAmount).toBe(15);

      // Line 2: 20% VAT
      // Expected TTC = 600 * 0.30 = 180
      // Net HT = 180 / 1.20 = 150
      // Tax = 30
      const line20 = depositLines.find((b) => b.taxRate === 20);
      expect(line20).toBeDefined();
      expect(line20?.totalTTC).toBe(180);
      expect(line20?.totalHT).toBe(150);
      expect(line20?.taxAmount).toBe(30);

      // Total deposit lines sum to exactly depositAmount
      const totalTtcSum = round2(depositLines.reduce((sum, b) => sum + b.totalTTC, 0));
      expect(totalTtcSum).toBe(depositAmount);
    });
  });
});
