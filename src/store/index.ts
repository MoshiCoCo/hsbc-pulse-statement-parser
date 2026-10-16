import { createStore } from 'redux';
import type { AppState, StatementData, Transaction, TransactionReward } from '@/types/statement';

const PULSE_ANNUAL_CAP_HKD = 80000;
const RED_HOT_ANNUAL_CAP_HKD = 100000;

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
  pulseCapRemaining: PULSE_ANNUAL_CAP_HKD,
  redHotCapRemaining: RED_HOT_ANNUAL_CAP_HKD,
};

function reducer(state = initialState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_STATEMENTS': {
      const statements: StatementData[] = action.payload;
      const allTransactions = statements.flatMap((s) => s.transactions);
      return { ...state, statements, allTransactions, loading: false };
    }
    case 'SET_REWARDS': {
      const rewards: TransactionReward[] = action.payload;
      const pulseSpent = rewards
        .filter((r) => r.qualifiesPulse)
        .reduce((sum, r) => sum + Math.abs(r.transaction.amount), 0);
      const redHotSpent = rewards
        .filter((r) => r.qualifiesRedHot)
        .reduce((sum, r) => sum + Math.abs(r.transaction.amount), 0);
      return {
        ...state,
        allRewards: rewards,
        pulseCapRemaining: Math.max(0, PULSE_ANNUAL_CAP_HKD - pulseSpent),
        redHotCapRemaining: Math.max(0, RED_HOT_ANNUAL_CAP_HKD - redHotSpent),
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
