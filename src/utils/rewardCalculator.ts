import { Transaction, TransactionReward, RewardBreakdown } from '@/types/statement';

const BASE_RATE = 0.004;
const PULSE_BONUS_RATE = 0.02;
const RED_HOT_BONUS_RATE = 0.02;
const PULSE_ANNUAL_CAP = 80000;
const RED_HOT_ANNUAL_CAP = 100000;

const CHINA_MOBILE_MERCHANTS = [
  'Alipay', 'UnionPay', 'UnionPay QR', 'Tencent', 'Tenpay',
  'WeChat Pay', 'Meituan', 'Meituan Pay', 'Apple Pay',
  'Luckin Coffee', 'Lawson', 'Tesla', 'Pinduoduo',
  'Yonghui Supermarket', 'Shifubao', 'Zhuohailing', 'GD',
];

const CHINA_REGIONS = ['China', 'Macau'];

function isChinaMobilePayment(tx: Transaction): boolean {
  if (!CHINA_REGIONS.includes(tx.region || '')) return false;
  if (tx.paymentMethod === 'Other') return false;
  if (tx.paymentMethod === 'AlipayHK') return false;
  if (tx.paymentMethod === 'IFS Payment') return false;
  return CHINA_MOBILE_MERCHANTS.includes(tx.paymentMethod || '');
}

function isRedHotEligible(tx: Transaction): boolean {
  return isChinaMobilePayment(tx);
}

export function calculateRewards(
  transactions: Transaction[],
  pulseCapRemaining: number,
  redHotCapRemaining: number
): TransactionReward[] {
  let pulseRemaining = pulseCapRemaining;
  let redHotRemaining = redHotCapRemaining;

  return transactions
    .filter((tx) => !tx.isCredit)
    .map((tx) => {
      const spendAmount = Math.abs(tx.amount);
      const qualifiesPulse = isChinaMobilePayment(tx) && pulseRemaining > 0;
      const qualifiesRedHot = isRedHotEligible(tx) && redHotRemaining > 0;

      const pulseEligibleAmount = qualifiesPulse ? Math.min(spendAmount, pulseRemaining) : 0;
      const redHotEligibleAmount = qualifiesRedHot ? Math.min(spendAmount, redHotRemaining) : 0;

      const baseReward = spendAmount * BASE_RATE;
      const pulseBonus = pulseEligibleAmount * PULSE_BONUS_RATE;
      const redHotBonus = redHotEligibleAmount * RED_HOT_BONUS_RATE;
      const totalReward = baseReward + pulseBonus + redHotBonus;
      const effectiveRate = spendAmount > 0 ? totalReward / spendAmount : 0;

      pulseRemaining -= pulseEligibleAmount;
      redHotRemaining -= redHotEligibleAmount;

      const breakdown: RewardBreakdown = {
        baseReward,
        pulseBonus,
        redHotBonus,
        totalReward,
        effectiveRate,
      };

      return { transaction: tx, breakdown, qualifiesPulse, qualifiesRedHot };
    });
}

export function aggregateRewards(rewards: TransactionReward[]) {
  let totalBase = 0;
  let totalPulse = 0;
  let totalRedHot = 0;
  let totalSpend = 0;
  let chinaSpend = 0;
  let otherSpend = 0;
  let qualifiedCount = 0;

  for (const r of rewards) {
    const spend = Math.abs(r.transaction.amount);
    totalSpend += spend;
    totalBase += r.breakdown.baseReward;
    totalPulse += r.breakdown.pulseBonus;
    totalRedHot += r.breakdown.redHotBonus;

    if (r.qualifiesPulse) {
      chinaSpend += spend;
      qualifiedCount++;
    } else {
      otherSpend += spend;
    }
  }

  const totalReward = totalBase + totalPulse + totalRedHot;
  const effectiveRate = totalSpend > 0 ? totalReward / totalSpend : 0;

  return {
    totalBase,
    totalPulse,
    totalRedHot,
    totalReward,
    totalSpend,
    chinaSpend,
    otherSpend,
    effectiveRate,
    qualifiedCount,
    totalCount: rewards.length,
  };
}
