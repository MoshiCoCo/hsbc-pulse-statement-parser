import { Transaction, TransactionReward, RewardBreakdown, RewardQualification } from '@/types/statement';

const BASE_RATE = 0.004;
const RED_HOT_BONUS_RATE = 0.02;
const APPLE_PAY_QR_BONUS_RATE = 0.02;
const MEITUAN_APPLE_PAY_EXTRA_RATE = 0.03;
const RED_HOT_ANNUAL_CAP = 80000;
const APPLE_PAY_QR_ANNUAL_CAP = 80000;

function isNonHkTransaction(tx: Transaction): boolean {
  const region = (tx.region || '').toUpperCase();
  return !region.includes('HK') && !region.includes('HONG KONG');
}

function hasApplePayOrQrMarker(tx: Transaction): boolean {
  const method = (tx.paymentMethod || '').toLowerCase();
  const desc = (tx.description || '').toUpperCase();
  return (
    method === 'apple pay' ||
    method === 'unionpay qr' ||
    desc.includes('APPLE PAY') ||
    desc.includes('UNIONPAY QR')
  );
}

function isMeituanApplePay(tx: Transaction): boolean {
  const method = (tx.paymentMethod || '').toLowerCase();
  const desc = (tx.description || '').toUpperCase();
  return method === 'apple pay' && desc.includes('MEITUAN');
}

export function calculateRewards(
  transactions: Transaction[],
  redHotCapRemaining: number,
  applePayQrCapRemaining: number
): TransactionReward[] {
  let redHotRemaining = redHotCapRemaining;
  let applePayQrRemaining = applePayQrCapRemaining;

  return transactions
    .filter((tx) => !tx.isCredit)
    .map((tx) => {
      const spendAmount = Math.abs(tx.amount);
      const isCNY = tx.currency === 'CNY';

      const qualification: RewardQualification = {
        qualifiesBase: false,
        qualifiesRedHot: false,
        qualifiesApplePayQr: false,
        qualifiesMeituanExtra: false,
        rewardRate: 0,
        rewardRatePercent: '0.0%',
      };

      let baseReward = 0;
      let redHotBonus = 0;
      let applePayQrBonus = 0;
      let meituanExtraBonus = 0;

      if (isCNY) {
        qualification.qualifiesBase = true;
        qualification.rewardRate += BASE_RATE;
        baseReward = spendAmount * BASE_RATE;

        if (isNonHkTransaction(tx) && redHotRemaining > 0) {
          qualification.qualifiesRedHot = true;
          qualification.rewardRate += RED_HOT_BONUS_RATE;
          const eligibleAmount = Math.min(spendAmount, redHotRemaining);
          redHotBonus = eligibleAmount * RED_HOT_BONUS_RATE;
          redHotRemaining -= eligibleAmount;
        }

        if (hasApplePayOrQrMarker(tx) && applePayQrRemaining > 0) {
          qualification.qualifiesApplePayQr = true;
          qualification.rewardRate += APPLE_PAY_QR_BONUS_RATE;
          const eligibleAmount = Math.min(spendAmount, applePayQrRemaining);
          applePayQrBonus = eligibleAmount * APPLE_PAY_QR_BONUS_RATE;
          applePayQrRemaining -= eligibleAmount;
        }
      } else {
        baseReward = spendAmount * BASE_RATE;
        qualification.qualifiesBase = true;
        qualification.rewardRate = BASE_RATE;
      }

      qualification.rewardRatePercent = `${(qualification.rewardRate * 100).toFixed(1)}%`;

      const totalReward = baseReward + redHotBonus + applePayQrBonus + meituanExtraBonus;
      const effectiveRate = spendAmount > 0 ? totalReward / spendAmount : 0;

      const breakdown: RewardBreakdown = {
        baseReward,
        redHotBonus,
        applePayQrBonus,
        meituanExtraBonus,
        totalReward,
        effectiveRate,
        effectiveRatePercent: `${(effectiveRate * 100).toFixed(1)}%`,
      };

      return { transaction: tx, breakdown, qualification };
    });
}

export function aggregateRewards(rewards: TransactionReward[]) {
  let totalBase = 0;
  let totalRedHot = 0;
  let totalApplePayQr = 0;
  let totalMeituanExtra = 0;
  let totalSpend = 0;
  let cnySpend = 0;
  let hkdSpend = 0;
  let qualifiedRedHotCount = 0;
  let qualifiedApplePayQrCount = 0;
  let qualifiedMeituanExtraCount = 0;

  for (const r of rewards) {
    const spend = Math.abs(r.transaction.amount);
    totalSpend += spend;
    totalBase += r.breakdown.baseReward;
    totalRedHot += r.breakdown.redHotBonus;
    totalApplePayQr += r.breakdown.applePayQrBonus;
    totalMeituanExtra += r.breakdown.meituanExtraBonus;

    if (r.transaction.currency === 'CNY') {
      cnySpend += spend;
    } else {
      hkdSpend += spend;
    }

    if (r.qualification.qualifiesRedHot) qualifiedRedHotCount++;
    if (r.qualification.qualifiesApplePayQr) qualifiedApplePayQrCount++;
    if (r.qualification.qualifiesMeituanExtra) qualifiedMeituanExtraCount++;
  }

  const totalReward = totalBase + totalRedHot + totalApplePayQr + totalMeituanExtra;
  const effectiveRate = totalSpend > 0 ? totalReward / totalSpend : 0;

  return {
    totalBase,
    totalRedHot,
    totalApplePayQr,
    totalMeituanExtra,
    totalReward,
    totalSpend,
    cnySpend,
    hkdSpend,
    effectiveRate,
    qualifiedRedHotCount,
    qualifiedApplePayQrCount,
    qualifiedMeituanExtraCount,
    totalCount: rewards.length,
  };
}

export { RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP };
