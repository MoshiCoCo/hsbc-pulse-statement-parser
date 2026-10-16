import React from 'react';
import { Table, Tag, Space } from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import type { Transaction } from '@/types/statement';
import locale from '@/locale';

interface TransactionTableProps {
  transactions: Transaction[];
  currency: 'HKD' | 'CNY';
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, currency }) => {
  const columns: ColumnProps<Transaction>[] = [
    {
      title: locale['transaction.postDate'],
      dataIndex: 'postDate',
      width: 120,
      sorter: (a, b) => a.postDate.localeCompare(b.postDate),
    },
    {
      title: locale['transaction.transDate'],
      dataIndex: 'transDate',
      width: 120,
    },
    {
      title: locale['transaction.description'],
      dataIndex: 'description',
      ellipsis: true,
      tooltip: true,
    },
    {
      title: locale['transaction.merchant'],
      dataIndex: 'merchant',
      width: 150,
      render: (val) => val || '-',
    },
    {
      title: locale['transaction.paymentMethod'],
      dataIndex: 'paymentMethod',
      width: 140,
      render: (val) => {
        const colorMap: Record<string, string> = {
          'Apple Pay': 'blue',
          'UnionPay QR': 'green',
          'Alipay': 'cyan',
          'WeChat Pay': 'green',
          'Meituan Pay': 'orange',
        };
        return val ? <Tag color={colorMap[val] || 'gray'}>{val}</Tag> : '-';
      },
    },
    {
      title: locale['transaction.region'],
      dataIndex: 'region',
      width: 100,
      render: (val) => {
        const colorMap: Record<string, string> = {
          China: 'red',
          'Hong Kong': 'blue',
          Macau: 'orange',
        };
        return val ? <Tag color={colorMap[val] || 'gray'}>{val}</Tag> : '-';
      },
    },
    {
      title: locale['transaction.amount'],
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (val, record) => (
        <span style={{ color: record.isCredit ? '#00B42A' : '#1D2129', fontWeight: 500 }}>
          {record.isCredit ? '+' : ''}
          {currency === 'HKD' ? 'HK$' : '¥'}
          {Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          {record.isCredit ? ' CR' : ''}
        </span>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={transactions}
      rowKey={(record) => `${record.postDate}-${record.transDate}-${record.description}`}
      pagination={{
        pageSize: 20,
        showTotal: true,
      }}
      scroll={{ x: 1000 }}
    />
  );
};

export default TransactionTable;
