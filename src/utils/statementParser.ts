import { Transaction, StatementData, RewardCashSummary } from '@/types/statement';

const DATE_RE = /^(\d{2}[A-Z]{3})\s+(\d{2}[A-Z]{3})\s+/;
const AMOUNT_RE = /([\d,]+\.\d{2})(CR)?\s*$/;

function parseAmount(raw: string): { amount: number; isCredit: boolean } {
  const isCredit = raw.includes('CR');
  const numStr = raw.replace(/CR/g, '').replace(/,/g, '').trim();
  return { amount: parseFloat(numStr), isCredit };
}

function parseDate(dateStr: string, year: number): string {
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const day = parseInt(dateStr.slice(0, 2), 10);
  const month = months[dateStr.slice(2, 5)] ?? 0;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractStatementYear(text: string): number {
  const match = text.match(/(\d{2})\s+[A-Z]{3}\s+(\d{4})/);
  if (match) return parseInt(match[2], 10);
  const match2 = text.match(/STATEMENT\s+DATE.*?(\d{2})\s+([A-Z]{3})\s+(\d{4})/i);
  if (match2) return parseInt(match2[3], 10);
  return new Date().getFullYear();
}

function parseRewardCashSummary(lines: string[], currency: 'HKD' | 'CNY'): RewardCashSummary | null {
  const summaryText = lines.join('\n');
  const cardMatch = summaryText.match(/CARD\s+NUMBER\s+(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/);
  if (!cardMatch) return null;

  const getVal = (key: string): number => {
    const re = new RegExp(`${key}\\s*:\\s*([\\d,]+\\.?\\d*)`);
    const m = summaryText.match(re);
    return m ? parseFloat(m[1].replace(/,/g, '')) : 0;
  };

  const expMatch = summaryText.match(/REWARDCASH\s+EXPIRING\s+IN\s+(\w+\s+\d{4})\s*:\s*([\d,]+\.?\d*)/);

  return {
    cardNumber: cardMatch[1].replace(/\s+/g, ''),
    openingBalance: getVal('REWARDCASH OPENING BALANCE'),
    earned: getVal('REWARDCASH EARNED'),
    adjusted: getVal('REWARDCASH ADJUSTED'),
    redeemed: getVal('REWARDCASH REDEEMED'),
    closingBalance: getVal('REWARDCASH CLOSING BALANCE'),
    expiringAmount: expMatch ? parseFloat(expMatch[2].replace(/,/g, '')) : 0,
    expiringDate: expMatch ? expMatch[1] : '',
  };
}

function parseTransactions(
  lines: string[],
  currency: 'HKD' | 'CNY',
  year: number
): Transaction[] {
  const transactions: Transaction[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const dateMatch = line.match(DATE_RE);

    if (!dateMatch) {
      i++;
      continue;
    }

    const postDate = dateMatch[1];
    const transDate = dateMatch[2];
    let descPart = line.slice(dateMatch[0].length).trim();

    const amountMatch = descPart.match(AMOUNT_RE);
    if (!amountMatch) {
      i++;
      continue;
    }

    const descText = descPart.slice(0, descPart.lastIndexOf(amountMatch[0])).trim();
    const { amount, isCredit } = parseAmount(amountMatch[0]);

    const description = descText;
    const merchant = extractMerchant(descText);
    const paymentMethod = extractPaymentMethod(descText);
    const region = extractRegion(descText, currency);

    transactions.push({
      postDate: parseDate(postDate, year),
      transDate: parseDate(transDate, year),
      description,
      amount,
      currency,
      isCredit,
      merchant,
      paymentMethod,
      region,
    });

    i++;
  }

  return transactions;
}

function extractMerchant(desc: string): string {
  const upper = desc.toUpperCase();
  if (upper.includes('ALIPAY')) return 'Alipay';
  if (upper.includes('UNIONPAY')) return 'UnionPay';
  if (upper.includes('TENCENT')) return 'Tencent';
  if (upper.includes('MEITUAN')) return 'Meituan';
  if (upper.includes('APPLE PAY')) return 'Apple Pay';
  if (upper.includes('LUCKIN')) return 'Luckin Coffee';
  if (upper.includes('TENPAY')) return 'Tenpay';
  if (upper.includes('IFS PAYMENT')) return 'IFS Payment';
  if (upper.includes('LAWSON')) return 'Lawson';
  if (upper.includes('TESLA')) return 'Tesla';
  if (upper.includes('PINDUODUO')) return 'Pinduoduo';
  if (upper.includes('GD ')) return 'GD';
  if (upper.includes('YONGHUI')) return 'Yonghui Supermarket';
  if (upper.includes('ZHUOHAILING')) return 'Zhuohailing';
  if (upper.includes('SHIFUBAO')) return 'Shifubao';
  if (upper.includes('ALIPAYHK')) return 'AlipayHK';
  return desc.split(/\s{2,}/)[0] || desc;
}

function extractPaymentMethod(desc: string): string {
  const upper = desc.toUpperCase();
  if (upper.includes('APPLE PAY') || upper.includes('APPLE PAY-MOBILE')) return 'Apple Pay';
  if (upper.includes('UNIONPAY QR')) return 'UnionPay QR';
  if (upper.includes('ALIPAY') && !upper.includes('ALIPAYHK')) return 'Alipay';
  if (upper.includes('ALIPAYHK')) return 'AlipayHK';
  if (upper.includes('TENCENT') || upper.includes('TENPAY')) return 'WeChat Pay';
  if (upper.includes('MEITUAN')) return 'Meituan Pay';
  if (upper.includes('IFS PAYMENT')) return 'IFS Payment';
  return 'Other';
}

function extractRegion(desc: string, currency: 'HKD' | 'CNY'): string {
  if (currency === 'CNY') return 'China';
  const upper = desc.toUpperCase();
  if (upper.includes('HK')) return 'Hong Kong';
  if (upper.includes('MACAU') || upper.includes('MOP')) return 'Macau';
  if (upper.includes('CN') || upper.includes('CHN')) return 'China';
  return 'Other';
}

export function parseStatementPDF(text: string): StatementData[] {
  const year = extractStatementYear(text);
  const statements: StatementData[] = [];

  const hkdMatch = text.match(
    /Account\s+number\s+.*?(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})\s+HKD.*?Statement\s+balance.*?(HKD[\d,]+\.?\d*)/is
  );
  const cnyMatch = text.match(
    /Account\s+number\s+.*?(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})\s+RMB.*?Statement\s+balance.*?(CNY[\d,]+\.?\d*)/is
  );

  const cardTypeMatch = text.match(/PULSE\s+DUALCURRENCY/i);
  const statementDateMatch = text.match(/Statement\s+Date.*?(\d{2}\s+[A-Z]{3}\s+\d{4})/i);
  const creditLimitMatch = text.match(/Credit\s+Limit.*?(HKD[\d,]+\.?\d*)/i);

  const cardType = cardTypeMatch ? 'Pulse DualCurrency' : 'Unknown';
  const statementDate = statementDateMatch ? statementDateMatch[1] : '';
  const creditLimit = creditLimitMatch
    ? parseFloat(creditLimitMatch[1].replace(/[^\d.]/g, ''))
    : 0;

  if (hkdMatch) {
    const accountNumber = hkdMatch[1].replace(/\s+/g, '');
    const balanceStr = hkdMatch[2].replace(/[^\d.]/g, '');
    const statementBalance = parseFloat(balanceStr);

    const hkdSection = extractAccountSection(text, accountNumber, 'HKD');
    const hkdLines = hkdSection.split('\n');
    const transactions = parseTransactions(hkdLines, 'HKD', year);
    const rewardCashSummary = parseRewardCashSummary(hkdLines, 'HKD') ?? undefined;

    const prevBalanceMatch = hkdSection.match(/PREVIOUS\s+BALANCE[\s\S]*?([\d,]+\.?\d{2})/);
    const minPayMatch = hkdSection.match(/Current\s+minimum\s+payment\s+due.*?([\d,]+\.?\d{2})/);
    const dueDateMatch = hkdSection.match(/Please\s+pay\s+by.*?(\d{2}\s+[A-Z]{3}\s+\d{4})/i);

    statements.push({
      cardType,
      statementDate,
      previousBalance: prevBalanceMatch ? parseFloat(prevBalanceMatch[1].replace(/,/g, '')) : 0,
      currency: 'HKD',
      transactions,
      rewardCashSummary,
      minimumPayment: minPayMatch ? parseFloat(minPayMatch[1].replace(/,/g, '')) : 0,
      paymentDueDate: dueDateMatch ? dueDateMatch[1] : '',
    });
  }

  if (cnyMatch) {
    const accountNumber = cnyMatch[1].replace(/\s+/g, '');
    const balanceStr = cnyMatch[2].replace(/[^\d.]/g, '');
    const statementBalance = parseFloat(balanceStr);

    const cnySection = extractAccountSection(text, accountNumber, 'CNY');
    const cnyLines = cnySection.split('\n');
    const transactions = parseTransactions(cnyLines, 'CNY', year);
    const rewardCashSummary = parseRewardCashSummary(cnyLines, 'CNY') ?? undefined;

    const prevBalanceMatch = cnySection.match(/PREVIOUS\s+BALANCE[\s\S]*?([\d,]+\.?\d{2})/);
    const minPayMatch = cnySection.match(/Current\s+minimum\s+payment\s+due.*?([\d,]+\.?\d{2})/);
    const dueDateMatch = cnySection.match(/Please\s+pay\s+by.*?(\d{2}\s+[A-Z]{3}\s+\d{4})/i);

    statements.push({
      cardType,
      statementDate,
      previousBalance: prevBalanceMatch ? parseFloat(prevBalanceMatch[1].replace(/,/g, '')) : 0,
      currency: 'CNY',
      transactions,
      rewardCashSummary,
      minimumPayment: minPayMatch ? parseFloat(minPayMatch[1].replace(/,/g, '')) : 0,
      paymentDueDate: dueDateMatch ? dueDateMatch[1] : '',
    });
  }

  return statements;
}

function extractAccountSection(text: string, accountNumber: string, currency: 'HKD' | 'CNY'): string {
  const normalizedAccount = accountNumber.replace(/\s+/g, ' ').trim();
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => l.includes(normalizedAccount) && l.includes(currency === 'HKD' ? 'HKD' : 'RMB'));
  if (startIdx === -1) return '';

  const sectionLines: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (
      i > startIdx + 5 &&
      (line.match(/Account\s+number\s+.*?\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/) ||
        line.match(/^\s*Page\s+\d+\s*\/\s*\d+/))
    ) {
      break;
    }
    sectionLines.push(line);
  }
  return sectionLines.join('\n');
}
