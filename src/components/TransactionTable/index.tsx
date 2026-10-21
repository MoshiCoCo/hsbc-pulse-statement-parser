import React, { useState, useMemo } from 'react';
import { Button, Modal, Table, Tag, Tooltip } from '@arco-design/web-react';
import { IconCaretDown, IconCaretUp } from '@arco-design/web-react/icon';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import type { Transaction, TransactionReward } from '@/types/statement';
import { useLocale } from '@/locale/LocaleContext';

interface TransactionTableProps {
  transactions: Transaction[];
  rewards: TransactionReward[];
}

const CURRENCY_SYMBOL: Record<string, string> = { HKD: 'HK$', CNY: '¥' };
const METHOD_COLOR: Record<string, string> = {
  'Apple Pay': 'blue', 'UnionPay QR': 'green', Alipay: 'cyan',
  'WeChat Pay': 'green', 'Meituan Pay': 'orange',
};
const TYPE_COLOR: Record<string, string> = {
  purchase: 'blue', payment: 'green', refund: 'orange',
};

function getTransactionType(tx: Transaction): 'purchase' | 'payment' | 'refund' {
  if (!tx.isCredit) return 'purchase';
  const desc = (tx.description || '').toUpperCase();
  if (desc.includes('IFS PAYMENT') || desc.includes('THANK YOU')) return 'payment';
  return 'refund';
}

// "tencent CHN CN UNIONPAY QR" -> { merchant: 'tencent', marker: 'UNIONPAY QR' }
function splitDescription(desc: string): { merchant: string; marker: string | null } {
  const upper = desc.toUpperCase();
  let merchant = desc;
  let marker: string | null = null;

  const qrIdx = upper.lastIndexOf('UNIONPAY QR');
  const appleIdx = upper.lastIndexOf('APPLE PAY');
  if (qrIdx !== -1) {
    marker = 'UNIONPAY QR';
    merchant = desc.slice(0, qrIdx);
  } else if (appleIdx !== -1) {
    marker = 'APPLE PAY';
    merchant = desc.slice(0, appleIdx);
  }

  // strip trailing region tokens like " CHN CN" / " HKG HK"
  merchant = merchant.replace(/\s+[A-Z]{3,5}\s+[A-Z]{2}\s*$/i, '').trim();
  return { merchant: merchant || desc, marker };
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, rewards }) => {
  const { t } = useLocale();
  const [detail, setDetail] = useState<TransactionReward | null>(null);
  const [sortState, setSortState] = useState<{ field?: string; direction?: 'ascend' | 'descend' }>({});

  const rewardMap = useMemo(() => {
    const map = new Map<string, TransactionReward>();
    for (const r of rewards) {
      const key = `${r.transaction.postDate}-${r.transaction.transDate}-${r.transaction.description}`;
      map.set(key, r);
    }
    return map;
  }, [rewards]);

  const rewardKey = (tx: Transaction) => `${tx.postDate}-${tx.transDate}-${tx.description}`;

  // 同一商户同日同金额的多笔交易会产生重复描述，rowKey 需要去重
  const rowKeys = useMemo(() => {
    const map = new Map<Transaction, string>();
    const seen = new Map<string, number>();
    for (const tx of transactions) {
      const base = rewardKey(tx);
      const n = seen.get(base) || 0;
      seen.set(base, n + 1);
      map.set(tx, n === 0 ? base : `${base}#${n}`);
    }
    return map;
  }, [transactions]);

  const toggleSort = (field: string) => {
    setSortState((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'ascend' ? 'descend' : 'ascend',
    }));
  };

  const sortableTitle = (label: string, field: string) => (
    <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(field)}>
      {label}
      {sortState.field === field && (
        sortState.direction === 'ascend'
          ? <IconCaretUp style={{ marginLeft: 2, fontSize: 12 }} />
          : <IconCaretDown style={{ marginLeft: 2, fontSize: 12 }} />
      )}
    </span>
  );

  const columns: ColumnProps<Transaction>[] = [
    {
      title: sortableTitle(t('transaction.postDate'), 'postDate'),
      dataIndex: 'postDate',
      width: 120,
      fixed: 'left',
    },
    {
      title: t('transaction.transDate'),
      dataIndex: 'transDate',
      width: 120,
    },
    {
      title: t('transaction.type'),
      width: 90,
      render: (_: unknown, record) => {
        const type = getTransactionType(record);
        return <Tag color={TYPE_COLOR[type]}>{t(`transaction.type.${type}`)}</Tag>;
      },
    },
    {
      title: t('transaction.merchant'),
      dataIndex: 'description',
      width: 260,
      render: (val: string) => {
        const { merchant, marker } = splitDescription(val);
        return (
          <div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {merchant}
            </div>
            {marker && (
              <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{marker}</div>
            )}
          </div>
        );
      },
    },
    {
      title: t('transaction.paymentMethod'),
      dataIndex: 'paymentMethod',
      width: 150,
      render: (val: string) =>
        val ? <Tag color={METHOD_COLOR[val] || 'gray'}>{val}</Tag> : '-',
    },
    {
      title: t('transaction.currency'),
      dataIndex: 'currency',
      width: 90,
      render: (val: string) => <Tag color={val === 'HKD' ? 'red' : 'blue'}>{val}</Tag>,
    },
    {
      title: sortableTitle(t('transaction.amount'), 'amount'),
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      render: (val: number, record) => {
        const sym = CURRENCY_SYMBOL[record.currency] || '';
        return (
          <span style={{ color: record.isCredit ? 'var(--color-success-6)' : 'var(--color-text-1)', fontWeight: 500 }}>
            {record.isCredit ? '+' : ''}
            {sym}
            {Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            {record.isCredit ? ' CR' : ''}
          </span>
        );
      },
    },
    {
      title: sortableTitle(t('transaction.reward'), 'reward'),
      width: 120,
      align: 'right',
      render: (_: unknown, record) => {
        const r = rewardMap.get(rewardKey(record));
        if (!r || record.isCredit) return <span style={{ color: 'var(--color-text-4)' }}>-</span>;

        const tooltipContent = (
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div>{t('reward.baseReward')}: {r.breakdown.baseReward.toFixed(2)}</div>
            {r.qualification.qualifiesRedHot && (
              <div>{t('reward.redHotBonus')}: {r.breakdown.redHotBonus.toFixed(2)}</div>
            )}
            {r.qualification.qualifiesApplePayQr && (
              <div>{t('reward.applePayQrBonus')}: {r.breakdown.applePayQrBonus.toFixed(2)}</div>
            )}
            {r.qualification.qualifiesMeituanExtra && (
              <div>{t('reward.meituanExtra')}: {r.breakdown.meituanExtraBonus.toFixed(2)}</div>
            )}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: 4, paddingTop: 4 }}>
              <strong>{t('reward.totalReward')}: {r.breakdown.totalReward.toFixed(2)}</strong>
            </div>
          </div>
        );

        return (
          <Tooltip content={tooltipContent} position="top">
            <span style={{ cursor: 'help', fontWeight: 500 }}>
              {r.breakdown.totalReward.toFixed(2)}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: sortableTitle(t('transaction.rewardRate'), 'rewardRate'),
      width: 100,
      align: 'right',
      render: (_: unknown, record) => {
        const r = rewardMap.get(rewardKey(record));
        if (!r || record.isCredit) return <span style={{ color: 'var(--color-text-4)' }}>-</span>;
        const rate = (r.breakdown.effectiveRate * 100).toFixed(1);
        return <span style={{ color: 'var(--color-text-3)' }}>{rate}%</span>;
      },
    },
    {
      title: '',
      width: 80,
      fixed: 'right',
      render: (_: unknown, record) => (
        <Button
          type="text"
          size="mini"
          onClick={() => setDetail(rewardMap.get(rewardKey(record)) || {
            transaction: record,
            breakdown: null,
            qualification: null,
          } as unknown as TransactionReward)}
        >
          {t('transaction.detail')}
        </Button>
      ),
    },
  ];

  const sortedTransactions = useMemo(() => {
    if (!sortState.field || !sortState.direction) return [...transactions];
    const sorted = [...transactions].sort((a, b) => {
      let result = 0;
      if (sortState.field === 'postDate') {
        result = a.postDate.localeCompare(b.postDate);
      } else if (sortState.field === 'amount') {
        result = a.amount - b.amount;
      } else if (sortState.field === 'reward') {
        const ra = rewardMap.get(rewardKey(a));
        const rb = rewardMap.get(rewardKey(b));
        result = (ra?.breakdown.totalReward || 0) - (rb?.breakdown.totalReward || 0);
      } else if (sortState.field === 'rewardRate') {
        const ra = rewardMap.get(rewardKey(a));
        const rb = rewardMap.get(rewardKey(b));
        result = (ra?.breakdown.effectiveRate || 0) - (rb?.breakdown.effectiveRate || 0);
      }
      return sortState.direction === 'descend' ? -result : result;
    });
    return sorted;
  }, [transactions, sortState, rewardMap]);

  const detailRow = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--color-border-2)' }}>
      <div style={{ width: 140, flexShrink: 0, color: 'var(--color-text-3)' }}>{label}</div>
      <div style={{ wordBreak: 'break-all' }}>{value}</div>
    </div>
  );

  const sym = detail ? CURRENCY_SYMBOL[detail.transaction.currency] || '' : '';

  return (
    <>
      <Table
        key={`sort-${sortState.field || 'none'}-${sortState.direction || 'none'}`}
        columns={columns}
        data={sortedTransactions}
        rowKey={(record) => rowKeys.get(record) || rewardKey(record)}
        pagination={{ pageSize: 20, showTotal: true }}
        scroll={{ x: 1290 }}
      />
      <Modal
        title={t('transaction.detailTitle')}
        visible={!!detail}
        onCancel={() => setDetail(null)}
        footer={
          <Button type="primary" onClick={() => setDetail(null)}>
            {t('transaction.close')}
          </Button>
        }
        style={{ width: 560 }}
      >
        {detail && (
          <div>
            {detailRow(t('transaction.postDate'), detail.transaction.postDate)}
            {detailRow(t('transaction.transDate'), detail.transaction.transDate)}
            {detailRow(t('transaction.fullDescription'), detail.transaction.description)}
            {detailRow(t('transaction.merchant'), detail.transaction.merchant || '-')}
            {detailRow(t('transaction.paymentMethod'), detail.transaction.paymentMethod || '-')}
            {detailRow(t('transaction.region'), detail.transaction.region || '-')}
            {detailRow(t('transaction.currency'), detail.transaction.currency)}
            {detailRow(
              t('transaction.amount'),
              `${detail.transaction.isCredit ? '+' : ''}${sym}${Math.abs(detail.transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}${detail.transaction.isCredit ? ' CR' : ''}`
            )}
            {detailRow(
              t('transaction.type'),
              (() => {
                const type = getTransactionType(detail.transaction);
                return <Tag color={TYPE_COLOR[type]}>{t(`transaction.type.${type}`)}</Tag>;
              })()
            )}
            {detail.breakdown && (
              <>
                {detailRow(t('reward.baseReward'), detail.breakdown.baseReward.toFixed(2))}
                {detail.qualification.qualifiesRedHot &&
                  detailRow(t('reward.redHotBonus'), detail.breakdown.redHotBonus.toFixed(2))}
                {detail.qualification.qualifiesApplePayQr &&
                  detailRow(t('reward.applePayQrBonus'), detail.breakdown.applePayQrBonus.toFixed(2))}
                {detail.qualification.qualifiesMeituanExtra &&
                  detailRow(t('reward.meituanExtra'), detail.breakdown.meituanExtraBonus.toFixed(2))}
                {detailRow(
                  t('reward.totalReward'),
                  <strong>{detail.breakdown.totalReward.toFixed(2)}</strong>
                )}
                {detailRow(t('reward.effectiveRate'), detail.breakdown.effectiveRatePercent)}
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default TransactionTable;
