import React from 'react';
import { Table, Tag } from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import type { Transaction, TransactionReward } from '@/types/statement';
import { useLocale } from '@/locale/LocaleContext';
import { useTheme } from '@/theme/ThemeContext';

interface TransactionTableProps {
  transactions: Transaction[];
  rewards: TransactionReward[];
}

const CURRENCY_SYMBOL: Record<string, string> = { HKD: 'HK$', CNY: '¥' };
const METHOD_COLOR: Record<string, string> = {
  'Apple Pay': 'blue', 'UnionPay QR': 'green', Alipay: 'cyan',
  'WeChat Pay': 'green', 'Meituan Pay': 'orange',
};

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, rewards }) => {
  const { t } = useLocale();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const rewardMap = new Map<string, TransactionReward>();
  for (const r of rewards) {
    const key = `${r.transaction.postDate}-${r.transaction.transDate}-${r.transaction.description}`;
    rewardMap.set(key, r);
  }

  const columns: ColumnProps<Transaction>[] = [
    {
      title: t('transaction.postDate'),
      dataIndex: 'postDate',
      width: 110,
      sorter: (a, b) => a.postDate.localeCompare(b.postDate),
    },
    {
      title: t('transaction.transDate'),
      dataIndex: 'transDate',
      width: 110,
    },
    {
      title: t('transaction.merchant'),
      dataIndex: 'merchant',
      width: 150,
      render: (val: string) => val || '-',
    },
    {
      title: t('transaction.paymentMethod'),
      dataIndex: 'paymentMethod',
      width: 130,
      render: (val: string) =>
        val ? <Tag color={METHOD_COLOR[val] || 'gray'}>{val}</Tag> : '-',
    },
    {
      title: t('transaction.description'),
      dataIndex: 'description',
      ellipsis: true,
      tooltip: true,
    },
    {
      title: t('transaction.currency'),
      dataIndex: 'currency',
      width: 90,
      render: (val: string) => <Tag color={val === 'HKD' ? 'red' : 'blue'}>{val}</Tag>,
    },
    {
      title: t('transaction.amount'),
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (val: number, record) => {
        const sym = CURRENCY_SYMBOL[record.currency] || '';
        return (
          <span style={{ color: record.isCredit ? '#00B42A' : isDark ? '#f6f6f6' : '#1D2129', fontWeight: 500 }}>
            {record.isCredit ? '+' : ''}
            {sym}
            {Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            {record.isCredit ? ' CR' : ''}
          </span>
        );
      },
    },
    {
      title: t('transaction.reward'),
      width: 140,
      align: 'right',
      sorter: (a, b) => {
        const ra = rewardMap.get(`${a.postDate}-${a.transDate}-${a.description}`);
        const rb = rewardMap.get(`${b.postDate}-${b.transDate}-${b.description}`);
        return (ra?.breakdown.totalReward || 0) - (rb?.breakdown.totalReward || 0);
      },
      render: (_: unknown, record) => {
        const r = rewardMap.get(`${record.postDate}-${record.transDate}-${record.description}`);
        if (!r || record.isCredit) return <span style={{ color: '#C9CDD4' }}>-</span>;
        const sym = CURRENCY_SYMBOL[record.currency] || '';
        const rate = (r.breakdown.effectiveRate * 100).toFixed(1);
        return (
          <span>
            <span style={{ fontWeight: 500 }}>{sym}{r.breakdown.totalReward.toFixed(2)}</span>
            <span style={{ color: '#86909C', fontSize: 12, marginLeft: 4 }}>{rate}%</span>
          </span>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={transactions}
      rowKey={(record) => `${record.postDate}-${record.transDate}-${record.description}`}
      pagination={{ pageSize: 20, showTotal: true }}
      scroll={{ x: 1200 }}
    />
  );
};

export default TransactionTable;
