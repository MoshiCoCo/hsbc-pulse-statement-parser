export interface Transaction {
  postDate: string;
  transDate: string;
  description: string;
  amount: number;
  currency: 'HKD' | 'CNY';
  isCredit: boolean;
  merchant?: string;
  paymentMethod?: string;
  region?: string;
}

export interface RewardCashSummary {
  cardNumber: string;
  openingBalance: number;
  earned: number;
  adjusted: number;
  redeemed: number;
  closingBalance: number;
  expiringAmount: number;
  expiringDate: string;
}

export interface RewardBreakdown {
  baseReward: number;
  redHotBonus: number;
  applePayQrBonus: number;
  meituanExtraBonus: number;
  totalReward: number;
  effectiveRate: number;
  effectiveRatePercent: string;
}

export interface RewardQualification {
  qualifiesBase: boolean;
  qualifiesRedHot: boolean;
  qualifiesApplePayQr: boolean;
  qualifiesMeituanExtra: boolean;
  rewardRate: number;
  rewardRatePercent: string;
}

export interface TransactionReward {
  transaction: Transaction;
  breakdown: RewardBreakdown;
  qualification: RewardQualification;
}

export interface StatementData {
  cardType: string;
  statementDate: string;
  previousBalance: number;
  currency: 'HKD' | 'CNY';
  transactions: Transaction[];
  rewardCashSummary?: RewardCashSummary;
  minimumPayment: number;
  paymentDueDate: string;
}

export interface AppState {
  statements: StatementData[];
  allTransactions: Transaction[];
  allRewards: TransactionReward[];
  loading: boolean;
  error: string | null;
  redHotCapRemaining: number;
  applePayQrCapRemaining: number;
}
