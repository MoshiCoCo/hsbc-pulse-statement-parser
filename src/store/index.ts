import { createStore } from 'redux';
import type { AppState, StatementData, TransactionReward } from '@/types/statement';
import { RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP } from '@/utils/rewardCalculator';

interface Action {
  type: string;
  payload?: any;
}

const initialState: AppState = {
  statements: [],
  allTransactions: [],
  allRewards: [],
  loading: false,
  error: null,
  redHotCapRemaining: RED_HOT_ANNUAL_CAP,
  applePayQrCapRemaining: APPLE_PAY_QR_ANNUAL_CAP,
};

function reducer(state = initialState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_STATEMENTS': {
      const incoming: StatementData[] = action.payload;
      const merged = [...state.statements];
      for (const s of incoming) {
        const idx = merged.findIndex(
          (e) => e.currency === s.currency && e.statementDate === s.statementDate
        );
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], transactions: [...merged[idx].transactions, ...s.transactions] };
        } else {
          merged.push(s);
        }
      }
      const allTransactions = merged.flatMap((s) => s.transactions);
      return { ...state, statements: merged, allTransactions, loading: false };
    }
    case 'SET_REWARDS': {
      const rewards: TransactionReward[] = action.payload;
      const redHotSpent = rewards
        .filter((r) => r.qualification.qualifiesRedHot)
        .reduce((sum, r) => sum + Math.abs(r.transaction.amount), 0);
      const applePayQrSpent = rewards
        .filter((r) => r.qualification.qualifiesApplePayQr)
        .reduce((sum, r) => sum + Math.abs(r.transaction.amount), 0);
      return {
        ...state,
        allRewards: rewards,
        redHotCapRemaining: Math.max(0, RED_HOT_ANNUAL_CAP - redHotSpent),
        applePayQrCapRemaining: Math.max(0, APPLE_PAY_QR_ANNUAL_CAP - applePayQrSpent),
      };
    }
    default:
      return state;
  }
}

export const store = createStore(reducer);

export const addStatements = (statements: StatementData[]) => ({
  type: 'ADD_STATEMENTS',
  payload: statements,
});

export const setRewards = (rewards: TransactionReward[]) => ({
  type: 'SET_REWARDS',
  payload: rewards,
});

export const setLoading = (loading: boolean) => ({
  type: 'SET_LOADING',
  payload: loading,
});

export const setError = (error: string) => ({
  type: 'SET_ERROR',
  payload: error,
});
