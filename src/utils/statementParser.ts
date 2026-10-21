import { Transaction, StatementData, RewardCashSummary } from '@/types/statement';

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

function isDateToken(token: string): boolean {
  return /^\d{2}[A-Z]{3}$/.test(token) && MONTHS[token.slice(2)] !== undefined;
}

function parseDate(token: string, year: number): string {
  const day = parseInt(token.slice(0, 2), 10);
  const month = MONTHS[token.slice(2)] ?? 0;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractStatementYear(text: string): number {
  const match = text.match(/(\d{2})\s+[A-Z]{3}\s+(\d{4})/);
  if (match) return parseInt(match[2], 10);
  return new Date().getFullYear();
}

function parseAmountToken(token: string): { amount: number; isCredit: boolean } | null {
  const cleaned = token.replace(/,/g, '');
  const isCredit = cleaned.endsWith('CR');
  const numStr = isCredit ? cleaned.slice(0, -2) : cleaned;
  const num = parseFloat(numStr);
  if (isNaN(num) || num === 0) return null;
  return { amount: num, isCredit };
}

// The label ("due") sits between the keyword and the value, so scan a few tokens forward
function parseAmountAfter(tokens: string[], fromIdx: number): number {
  for (let i = fromIdx; i < fromIdx + 3; i++) {
    const token = tokens[i];
    if (!token) break;
    const num = parseFloat(token.replace(/,/g, ''));
    if (!isNaN(num)) return num;
  }
  return 0;
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 0);
}

function parseRewardCashSummary(tokens: string[], startIdx: number): { summary: RewardCashSummary | null; endIdx: number } {
  const cardMatch = findTokenSequence(tokens, startIdx, ['CARD', 'NUMBER']);
  if (!cardMatch) return { summary: null, endIdx: startIdx };

  const cardNumber = tokens.slice(cardMatch + 2, cardMatch + 6).join('').replace(/\s/g, '');

  const getVal = (keyTokens: string[]): number => {
    const idx = findTokenSequence(tokens, startIdx, keyTokens);
    if (!idx) return 0;
    const valToken = tokens[idx + keyTokens.length];
    if (!valToken || valToken === ':') {
      const valToken2 = tokens[idx + keyTokens.length + 1];
      return valToken2 ? parseFloat(valToken2.replace(/,/g, '')) || 0 : 0;
    }
    return parseFloat(valToken.replace(/,/g, '')) || 0;
  };

  const openingBalance = getVal(['REWARDCASH', 'OPENING', 'BALANCE']);
  const earned = getVal(['REWARDCASH', 'EARNED']);
  const adjusted = getVal(['REWARDCASH', 'ADJUSTED']);
  const redeemed = getVal(['REWARDCASH', 'REDEEMED']);
  const closingBalance = getVal(['REWARDCASH', 'CLOSING', 'BALANCE']);

  const expIdx = findTokenSequence(tokens, startIdx, ['REWARDCASH', 'EXPIRING', 'IN']);
  let expiringAmount = 0;
  let expiringDate = '';
  if (expIdx) {
    const dateToken = tokens[expIdx + 3];
    const amtToken = tokens[expIdx + 4] || tokens[expIdx + 3];
    if (dateToken && !isNaN(parseFloat(dateToken.replace(/,/g, '')))) {
      expiringAmount = parseFloat(dateToken.replace(/,/g, ''));
    } else {
      expiringDate = dateToken || '';
      const amtVal = tokens[expIdx + 4];
      if (amtVal) expiringAmount = parseFloat(amtVal.replace(/,/g, '')) || 0;
    }
  }

  const endIdx = findTokenSequence(tokens, startIdx, ['REGISTRATION', 'RENEWAL']) || startIdx + 50;

  return {
    summary: {
      cardNumber,
      openingBalance,
      earned,
      adjusted,
      redeemed,
      closingBalance,
      expiringAmount,
      expiringDate,
    },
    endIdx,
  };
}

function findTokenSequence(tokens: string[], fromIdx: number, sequence: string[]): number | null {
  for (let i = fromIdx; i < tokens.length - sequence.length; i++) {
    let match = true;
    for (let j = 0; j < sequence.length; j++) {
      if (tokens[i + j].toUpperCase() !== sequence[j].toUpperCase()) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return null;
}

function extractMerchant(descTokens: string[]): string {
  const joined = descTokens.join(' ').toUpperCase();
  // Real merchants take precedence over payment channels (Apple Pay / UnionPay QR etc.)
  if (joined.includes('TENCENT')) return 'Tencent';
  if (joined.includes('TENPAY')) return 'Tenpay';
  if (joined.includes('MEITUAN')) return 'Meituan';
  if (joined.includes('LUCKIN')) return 'Luckin Coffee';
  if (joined.includes('LAWSON')) return 'Lawson';
  if (joined.includes('TESLA')) return 'Tesla';
  if (joined.includes('PINDUODUO')) return 'Pinduoduo';
  if (joined.includes('YONGHUI')) return 'Yonghui Supermarket';
  if (joined.includes('ZHUOHAILING')) return 'Zhuohailing';
  if (joined.includes('SHIFUBAO')) return 'Shifubao';
  if (joined.includes('ALIPAYHK')) return 'AlipayHK';
  if (joined.includes('IFS PAYMENT')) return 'IFS Payment';
  if (joined.includes('APPLE PAY')) return 'Apple Pay';
  if (joined.includes('UNIONPAY QR')) return 'UnionPay QR';
  if (joined.includes('UNIONPAY MERCHANT')) return 'UnionPay';
  if (joined.includes('UNIONPAY')) return 'UnionPay';
  if (joined.includes('ALIPAY')) return 'Alipay';
  if (joined === 'GD') return 'GD';
  return descTokens.join(' ');
}

function extractPaymentMethod(descTokens: string[]): string {
  const joined = descTokens.join(' ').toUpperCase();
  if (joined.includes('APPLE PAY')) return 'Apple Pay';
  if (joined.includes('UNIONPAY QR')) return 'UnionPay QR';
  if (joined.includes('UNIONPAY')) return 'UnionPay';
  if (joined.includes('ALIPAY') && !joined.includes('ALIPAYHK')) return 'Alipay';
  if (joined.includes('ALIPAYHK')) return 'AlipayHK';
  if (joined.includes('TENCENT') || joined.includes('TENPAY')) return 'WeChat Pay';
  if (joined.includes('MEITUAN')) return 'Meituan Pay';
  if (joined.includes('IFS PAYMENT')) return 'IFS Payment';
  return 'Other';
}

function extractRegion(descTokens: string[], currency: 'HKD' | 'CNY'): string {
  if (currency === 'CNY') return 'China';
  const joined = descTokens.join(' ').toUpperCase();
  if (joined.includes('HKG') || joined.includes(' HK ')) return 'Hong Kong';
  if (joined.includes('MACAU') || joined.includes('MOP')) return 'Macau';
  if (joined.includes('CHN') || joined.includes(' CN ')) return 'China';
  return 'Other';
}

function parseTransactions(
  tokens: string[],
  startIdx: number,
  endIdx: number,
  currency: 'HKD' | 'CNY',
  year: number
): Transaction[] {
  const transactions: Transaction[] = [];
  let i = startIdx;

  while (i < endIdx - 3) {
    if (!isDateToken(tokens[i]) || !isDateToken(tokens[i + 1])) {
      i++;
      continue;
    }

    const postDate = tokens[i];
    const transDate = tokens[i + 1];
    let j = i + 2;

    const descTokens: string[] = [];
    let amountParsed: { amount: number; isCredit: boolean } | null = null;

    while (j < endIdx) {
      const token = tokens[j];
      const parsed = parseAmountToken(token);
      if (parsed && parsed.amount >= 0.01) {
        let isCredit = parsed.isCredit;
        if (!isCredit && j + 1 < endIdx && tokens[j + 1] === 'CR') {
          isCredit = true;
          j++;
        }
        amountParsed = { amount: parsed.amount, isCredit };
        j++;
        break;
      }
      if (isDateToken(token) && j > i + 2) {
        break;
      }
      descTokens.push(token);
      j++;
    }

    if (amountParsed && descTokens.length > 0) {
      const description = descTokens.join(' ');
      const merchant = extractMerchant(descTokens);
      const paymentMethod = extractPaymentMethod(descTokens);
      const region = extractRegion(descTokens, currency);

      transactions.push({
        postDate: parseDate(postDate, year),
        transDate: parseDate(transDate, year),
        description,
        amount: amountParsed.amount,
        currency,
        isCredit: amountParsed.isCredit,
        merchant,
        paymentMethod,
        region,
      });

      const TRAILING_STOP_WORDS = new Set([
        'Note:', 'REGISTRATION', 'REWARDCASH', 'HSBC', 'STATEMENT', 'THE', 'FOR',
        'MARKETING', 'WELCOME', 'REGISTERED', '*****', '****',
        'Change', 'If', 'We', 'Accrual', 'Information', 'Statement', 'Pulse',
        'Account', 'Card', 'Minimum', 'Please', 'Overdue', 'Total', 'Post',
      ]);

      const trailing: string[] = [];
      while (j < endIdx && !isDateToken(tokens[j])) {
        if (TRAILING_STOP_WORDS.has(tokens[j])) break;
        trailing.push(tokens[j]);
        j++;
      }

      if (trailing.length > 0 && transactions.length > 0) {
        const last = transactions[transactions.length - 1];
        const trailingMethod = extractPaymentMethod(trailing);

        if (trailingMethod !== 'Other') {
          last.description = (last.description + ' ' + trailing.join(' ')).trim();
          last.paymentMethod = trailingMethod;
          // Re-extract merchant from the full merged description so real
          // merchants (e.g. "tencent") win over trailing payment markers
          last.merchant = extractMerchant(last.description.split(/\s+/));
        }
      }

      i = j;
    } else {
      i++;
    }
  }

  return transactions;
}

export function parseStatementPDF(text: string): StatementData[] {
  const year = extractStatementYear(text);
  const tokens = tokenize(text);
  const statements: StatementData[] = [];

  const statementDateMatch = text.match(/Statement\s+Date.*?(\d{2}\s+[A-Z]{3}\s+\d{4})/i);
  const statementDate = statementDateMatch ? statementDateMatch[1] : '';

  const firstPostDateIdx = findTokenSequence(tokens, 0, ['Post', 'date']);
  if (firstPostDateIdx === null) return statements;

  const rmbSubAccountIdx = findTokenSequence(tokens, 0, ['RMB', 'Sub-account']);
  const cnyPostDateIdx = rmbSubAccountIdx
    ? findTokenSequence(tokens, rmbSubAccountIdx, ['Post', 'date'])
    : null;

  const hkdEndIdx = cnyPostDateIdx ?? tokens.length;
  const cnyEndIdx = cnyPostDateIdx
    ? findTokenSequence(tokens, cnyPostDateIdx, ['FEES', 'AND', 'CHARGES', 'SUMMARY']) ?? tokens.length
    : tokens.length;

  if (firstPostDateIdx !== null) {
    const prevBalanceIdx = findTokenSequence(tokens, firstPostDateIdx, ['PREVIOUS', 'BALANCE']);
    let previousBalance = 0;
    if (prevBalanceIdx) {
      const prevToken = tokens[prevBalanceIdx + 2] || tokens[prevBalanceIdx + 1];
      if (prevToken) previousBalance = parseFloat(prevToken.replace(/,/g, '')) || 0;
    }

    const rewardIdx = findTokenSequence(tokens, firstPostDateIdx, ['REWARDCASH', 'SUMMARY']);
    const transactions = parseTransactions(tokens, firstPostDateIdx, hkdEndIdx, 'HKD', year);
    const { summary: rewardCashSummary } = rewardIdx && rewardIdx < hkdEndIdx
      ? parseRewardCashSummary(tokens, rewardIdx)
      : { summary: null };

    // The HKD "Minimum payment summary" block sits before the first transaction header
    const minPayIdx = findTokenSequence(tokens, 0, ['Current', 'minimum', 'payment']);
    const minimumPayment = minPayIdx ? parseAmountAfter(tokens, minPayIdx + 3) : 0;

    const dueDateIdx = findTokenSequence(tokens, 0, ['Please', 'pay', 'by']);
    let paymentDueDate = '';
    if (dueDateIdx) {
      paymentDueDate = `${tokens[dueDateIdx + 3] || ''} ${tokens[dueDateIdx + 4] || ''} ${tokens[dueDateIdx + 5] || ''}`.trim();
    }

    statements.push({
      cardType: 'Pulse DualCurrency',
      statementDate,
      previousBalance,
      currency: 'HKD',
      transactions,
      rewardCashSummary: rewardCashSummary ?? undefined,
      minimumPayment,
      paymentDueDate,
    });
  }

  if (cnyPostDateIdx !== null) {
    const prevBalanceIdx = findTokenSequence(tokens, cnyPostDateIdx, ['PREVIOUS', 'BALANCE']);
    let previousBalance = 0;
    if (prevBalanceIdx) {
      const prevToken = tokens[prevBalanceIdx + 2] || tokens[prevBalanceIdx + 1];
      if (prevToken) previousBalance = parseFloat(prevToken.replace(/,/g, '')) || 0;
    }

    const transactions = parseTransactions(tokens, cnyPostDateIdx, cnyEndIdx, 'CNY', year);

    const rewardIdx = findTokenSequence(tokens, cnyPostDateIdx, ['REWARDCASH', 'SUMMARY']);
    const { summary: rewardCashSummary } = rewardIdx && rewardIdx < cnyEndIdx
      ? parseRewardCashSummary(tokens, rewardIdx)
      : { summary: null };

    const minPayIdx = findTokenSequence(tokens, rmbSubAccountIdx ?? 0, ['Current', 'minimum', 'payment']);
    const minimumPayment = minPayIdx ? parseAmountAfter(tokens, minPayIdx + 3) : 0;

    const dueDateIdx = findTokenSequence(tokens, rmbSubAccountIdx ?? 0, ['Please', 'pay', 'by']);
    let paymentDueDate = '';
    if (dueDateIdx) {
      paymentDueDate = `${tokens[dueDateIdx + 3] || ''} ${tokens[dueDateIdx + 4] || ''} ${tokens[dueDateIdx + 5] || ''}`.trim();
    }

    statements.push({
      cardType: 'Pulse DualCurrency',
      statementDate,
      previousBalance,
      currency: 'CNY',
      transactions,
      rewardCashSummary: rewardCashSummary ?? undefined,
      minimumPayment,
      paymentDueDate,
    });
  }

  return statements;
}
