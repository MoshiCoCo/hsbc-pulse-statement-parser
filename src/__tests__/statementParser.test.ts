import { describe, it, expect } from 'vitest';
import { parseStatementPDF } from '@/utils/statementParser';
import fs from 'fs';
import path from 'path';

const sampleText = fs.readFileSync(
  path.join(__dirname, 'fixtures/sampleStatementText.txt'),
  'utf-8'
);

describe('statementParser', () => {
  const statements = parseStatementPDF(sampleText);

  it('should parse two statement sections (HKD + CNY)', () => {
    expect(statements.length).toBe(2);
    expect(statements[0].currency).toBe('HKD');
    expect(statements[1].currency).toBe('CNY');
  });

  it('should parse statement level metadata', () => {
    const hkd = statements.find((s) => s.currency === 'HKD');
    const cny = statements.find((s) => s.currency === 'CNY');
    expect(hkd?.statementDate).toMatch(/18\s+SEP\s+2026/);
    expect(hkd?.previousBalance).toBe(0);
    expect(hkd?.paymentDueDate).toBe('14 OCT 2026');
    expect(hkd?.minimumPayment).toBe(136.09);
    expect(cny?.previousBalance).toBe(3000);
    expect(cny?.minimumPayment).toBe(236.66);
  });

  it('should parse correct number of transactions', () => {
    const hkd = statements.find((s) => s.currency === 'HKD');
    const cny = statements.find((s) => s.currency === 'CNY');
    expect(hkd?.transactions.length).toBe(4);
    expect(cny?.transactions.length).toBe(30);
  });

  it('should detect trailing UNIONPAY QR marker', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const qrTxns = cny?.transactions.filter((t) => t.paymentMethod === 'UnionPay QR') || [];
    expect(qrTxns.length).toBe(7);
  });

  it('should detect tencent transactions with UnionPay QR get exclusive bonus', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const tencentQR =
      cny?.transactions.filter(
        (t) =>
          t.paymentMethod === 'UnionPay QR' &&
          (t.description.toLowerCase().includes('tencent') ||
            t.description.toLowerCase().includes('tenpay'))
      ) || [];
    expect(tencentQR.length).toBe(2);
  });

  it('should keep tencent without marker as WeChat Pay', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const tencentWeChat =
      cny?.transactions.filter(
        (t) =>
          t.paymentMethod === 'WeChat Pay' &&
          (t.description.toLowerCase().includes('tencent') ||
            t.description.toLowerCase().includes('tenpay'))
      ) || [];
    expect(tencentWeChat.length).toBe(4);
  });

  it('should detect trailing APPLE PAY-MOBILE marker on MEITUAN transactions', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const meituanTxns =
      cny?.transactions.filter((t) => t.description.toUpperCase().includes('MEITUAN')) || [];

    expect(meituanTxns.length).toBe(4);
    for (const tx of meituanTxns) {
      expect(tx.paymentMethod).toBe('Apple Pay');
    }
  });

  it('should detect trailing APPLE PAY-MOBILE marker on UNIONPAY MERCHANT transaction', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const applePayFromUnion =
      cny?.transactions.filter(
        (t) =>
          t.paymentMethod === 'Apple Pay' &&
          t.description.toUpperCase().includes('UNIONPAY MERCHANT')
      ) || [];

    expect(applePayFromUnion.length).toBe(1);
    expect(applePayFromUnion[0].amount).toBe(40.48);
  });

  it('should NOT classify normal UnionPay as UnionPay QR', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const plainUnion =
      cny?.transactions.filter((t) => t.paymentMethod === 'UnionPay' && !t.isCredit) || [];

    expect(plainUnion.length).toBe(2);
    const amounts = plainUnion.map((t) => t.amount).sort((a, b) => a - b);
    expect(amounts).toEqual([2.01, 30.45]);
  });

  it('should classify credits correctly', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const credits = cny?.transactions.filter((t) => t.isCredit) || [];
    expect(credits.length).toBe(5);

    const ifsCredits = credits.filter((t) => t.description.toUpperCase().includes('IFS PAYMENT'));
    expect(ifsCredits.length).toBe(2);
  });

  it('should parse HKD transaction correctly', () => {
    const hkd = statements.find((s) => s.currency === 'HKD');
    const tx = hkd?.transactions[0];
    expect(tx).toBeDefined();
    expect(tx?.amount).toBe(186.09);
    expect(tx?.currency).toBe('HKD');
    expect(tx?.isCredit).toBe(false);
    expect(tx?.paymentMethod).toBe('AlipayHK');
    expect(tx?.region).toBe('Hong Kong');
  });

  it('should resolve merchant names for HKD transactions', () => {
    const hkd = statements.find((s) => s.currency === 'HKD');
    const macau = hkd?.transactions.find((t) => t.region === 'Macau');
    expect(macau?.paymentMethod).toBe('UnionPay');
    expect(macau?.amount).toBe(88.0);
  });

  it('should parse dates in ISO format', () => {
    const hkd = statements.find((s) => s.currency === 'HKD');
    const tx = hkd?.transactions[0];
    expect(tx?.postDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tx?.transDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should parse RewardCash summary for CNY', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const summary = cny?.rewardCashSummary;
    expect(summary).toBeDefined();
    expect(summary?.openingBalance).toBe(273);
    expect(summary?.earned).toBe(54);
    expect(summary?.closingBalance).toBe(327);
    expect(summary?.expiringDate).toBe('JUL2028');
  });

  it('should calculate total CNY charges close to expected', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const charges = cny?.transactions.filter((t) => !t.isCredit) || [];
    const totalCharges = charges.reduce((s, t) => s + t.amount, 0);
    expect(totalCharges).toBeCloseTo(1340.32, 2);
  });

  it('should calculate total CNY credits close to expected', () => {
    const cny = statements.find((s) => s.currency === 'CNY');
    const credits = cny?.transactions.filter((t) => t.isCredit) || [];
    const totalCredits = credits.reduce((s, t) => s + t.amount, 0);
    expect(totalCredits).toBeCloseTo(4103.66, 2);
  });
});
