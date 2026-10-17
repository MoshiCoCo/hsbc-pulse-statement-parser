import { describe, it, expect } from 'vitest';
import { calculateRewards, aggregateRewards, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP } from '@/utils/rewardCalculator';
import type { Transaction } from '@/types/statement';
import { hkdTransactions, cnyTransactions, statementSummary } from './fixtures/statementData';

function toTransaction(tx: any): Transaction {
  return {
    postDate: tx.postDate,
    transDate: tx.transDate,
    description: tx.description,
    amount: tx.amount,
    currency: tx.currency as 'HKD' | 'CNY',
    isCredit: tx.isCredit,
    merchant: tx.merchant,
    paymentMethod: tx.paymentMethod,
    region: tx.region,
  };
}

describe('rewardCalculator', () => {
  const allTransactions = [...hkdTransactions, ...cnyTransactions].map(toTransaction);
  const hkdCharges = hkdTransactions.filter((t) => !t.isCredit).map(toTransaction);
  const cnyCharges = cnyTransactions.filter((t) => !t.isCredit).map(toTransaction);

  const totalHkdSpend = hkdCharges.reduce((s, t) => s + t.amount, 0);
  const totalCnySpend = cnyCharges.reduce((s, t) => s + t.amount, 0);

  it('should calculate base reward at 0.4% for all non-credit transactions', () => {
    const rewards = calculateRewards(allTransactions, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP);
    const aggregated = aggregateRewards(rewards);

    const expectedBase = totalCnySpend * 0.004 + totalHkdSpend * 0.004;
    expect(aggregated.totalBase).toBeCloseTo(expectedBase, 1);
  });

  it('should apply Red Hot 2% bonus on CNY spending', () => {
    const rewards = calculateRewards(allTransactions, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP);
    const cnyRewards = rewards.filter((r) => r.transaction.currency === 'CNY');
    const aggregated = aggregateRewards(cnyRewards);

    expect(aggregated.totalRedHot).toBeCloseTo(totalCnySpend * 0.02, 1);
  });

  it('should apply Apple Pay/QR 2% bonus on eligible CNY transactions', () => {
    const rewards = calculateRewards(allTransactions, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP);

    const applePayRewards = rewards.filter(
      (r) => r.qualification.qualifiesApplePayQr && r.transaction.paymentMethod === 'Apple Pay'
    );
    const unionPayQrRewards = rewards.filter(
      (r) => r.qualification.qualifiesApplePayQr && r.transaction.paymentMethod === 'UnionPay QR'
    );

    expect(applePayRewards.length).toBe(6);
    expect(unionPayQrRewards.length).toBe(7);

    const applePaySpend = applePayRewards.reduce((s, r) => s + r.transaction.amount, 0);
    const unionPayQrSpend = unionPayQrRewards.reduce((s, r) => s + r.transaction.amount, 0);
    const expectedBonus = (applePaySpend + unionPayQrSpend) * 0.02;

    const totalApplePayQrBonus = rewards.reduce((s, r) => s + r.breakdown.applePayQrBonus, 0);
    expect(totalApplePayQrBonus).toBeCloseTo(expectedBonus, 1);
  });

  it('should NOT give Apple Pay/QR bonus to normal Alipay/WeChat/UnionPay', () => {
    const rewards = calculateRewards(allTransactions, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP);

    const wechatRewards = rewards.filter((r) => r.transaction.paymentMethod === 'WeChat Pay');
    const alipayRewards = rewards.filter((r) => r.transaction.paymentMethod === 'Alipay');
    const plainUnionRewards = rewards.filter(
      (r) => r.transaction.paymentMethod === 'UnionPay' && !r.transaction.isCredit
    );

    expect(wechatRewards.length).toBeGreaterThan(0);
    expect(alipayRewards.length).toBeGreaterThan(0);
    expect(plainUnionRewards.length).toBeGreaterThan(0);

    for (const r of wechatRewards) {
      expect(r.qualification.qualifiesApplePayQr).toBe(false);
      expect(r.breakdown.applePayQrBonus).toBe(0);
    }
    for (const r of alipayRewards) {
      expect(r.qualification.qualifiesApplePayQr).toBe(false);
      expect(r.breakdown.applePayQrBonus).toBe(0);
    }
    for (const r of plainUnionRewards) {
      expect(r.qualification.qualifiesApplePayQr).toBe(false);
      expect(r.breakdown.applePayQrBonus).toBe(0);
    }
  });

  it('should not give any bonus to HKD transactions', () => {
    const rewards = calculateRewards(allTransactions, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP);
    const hkdRewards = rewards.filter((r) => r.transaction.currency === 'HKD');

    expect(hkdRewards.length).toBe(hkdCharges.length);
    for (const r of hkdRewards) {
      expect(r.qualification.qualifiesRedHot).toBe(false);
      expect(r.qualification.qualifiesApplePayQr).toBe(false);
      expect(r.breakdown.redHotBonus).toBe(0);
      expect(r.breakdown.applePayQrBonus).toBe(0);
    }
  });

  it('should produce total CNY reward matching statement EARNED', () => {
    const rewards = calculateRewards(allTransactions, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP);
    const cnyRewards = rewards.filter((r) => r.transaction.currency === 'CNY');
    const totalCnyReward = cnyRewards.reduce((s, r) => s + r.breakdown.totalReward, 0);

    expect(totalCnyReward).toBeCloseTo(54.31, 1);
    expect(Math.round(totalCnyReward)).toBe(statementSummary.rewardCash.cny.earned);
  });

  it('should skip credit transactions', () => {
    const rewards = calculateRewards(allTransactions, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP);
    const creditRewards = rewards.filter((r) => r.transaction.isCredit);
    expect(creditRewards.length).toBe(0);
  });

  it('should respect annual caps', () => {
    const smallCap = 100;
    const rewards = calculateRewards(allTransactions, smallCap, smallCap);
    const aggregated = aggregateRewards(rewards);

    expect(aggregated.totalRedHot).toBeLessThanOrEqual(smallCap * 0.02 + 0.01);
    expect(aggregated.totalApplePayQr).toBeLessThanOrEqual(smallCap * 0.02 + 0.01);
  });

  it('should aggregate spend by currency', () => {
    const rewards = calculateRewards(allTransactions, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP);
    const aggregated = aggregateRewards(rewards);

    expect(aggregated.cnySpend).toBeCloseTo(statementSummary.cny.totalCharges, 2);
    expect(aggregated.hkdSpend).toBeCloseTo(statementSummary.hkd.totalCharges, 2);
    expect(aggregated.totalCount).toBe(
      statementSummary.cny.chargeCount + statementSummary.hkd.chargeCount
    );
  });
});
