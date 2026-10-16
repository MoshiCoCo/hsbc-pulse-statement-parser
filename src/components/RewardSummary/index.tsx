import React from 'react';
import { Card, Grid, Statistic, Progress, Divider, Tag } from '@arco-design/web-react';
import type { TransactionReward } from '@/types/statement';
import { aggregateRewards } from '@/utils/rewardCalculator';
import locale from '@/locale';

const { Row, Col } = Grid;

interface RewardSummaryProps {
  rewards: TransactionReward[];
  pulseCapRemaining: number;
  redHotCapRemaining: number;
  currency: 'HKD' | 'CNY';
}

const PULSE_CAP = 80000;
const RED_HOT_CAP = 100000;

const RewardSummary: React.FC<RewardSummaryProps> = ({
  rewards,
  pulseCapRemaining,
  redHotCapRemaining,
  currency,
}) => {
  const agg = aggregateRewards(rewards);
  const prefix = currency === 'HKD' ? 'HK$' : '¥';

  const formatMoney = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={locale['dashboard.totalSpend']}
              value={agg.totalSpend}
              prefix={prefix}
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={locale['dashboard.totalRewards']}
              value={agg.totalReward}
              prefix={prefix}
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={locale['dashboard.effectiveRate']}
              value={agg.effectiveRate * 100}
              suffix="%"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Qualified Txns"
              value={agg.qualifiedCount}
              suffix={`/ ${agg.totalCount}`}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card title={locale['reward.base']} style={{ height: '100%' }}>
            <Statistic value={agg.totalBase} prefix={prefix} precision={2} />
            <div style={{ marginTop: 8, color: '#86909C', fontSize: 13 }}>
              0.4% on all purchases
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={locale['reward.pulse']} style={{ height: '100%' }}>
            <Statistic
              value={agg.totalPulse}
              prefix={prefix}
              precision={2}
            />
            <div style={{ marginTop: 8, color: '#86909C', fontSize: 13 }}>
              2% on China/Macau mobile payments
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={locale['reward.redHot']} style={{ height: '100%' }}>
            <Statistic
              value={agg.totalRedHot}
              prefix={prefix}
              precision={2}
            />
            <div style={{ marginTop: 8, color: '#86909C', fontSize: 13 }}>
              2% via Reward+ App registration
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title={locale['dashboard.pulseCap']}>
            <Progress
              percent={((PULSE_CAP - pulseCapRemaining) / PULSE_CAP) * 100}
              formatText={() =>
                `${prefix}${formatMoney(PULSE_CAP - pulseCapRemaining)} / ${prefix}${formatMoney(PULSE_CAP)}`
              }
              color="#00B42A"
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#86909C' }}>
              {locale['dashboard.remaining']}: {prefix}
              {formatMoney(pulseCapRemaining)}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={locale['dashboard.redHotCap']}>
            <Progress
              percent={((RED_HOT_CAP - redHotCapRemaining) / RED_HOT_CAP) * 100}
              formatText={() =>
                `${prefix}${formatMoney(RED_HOT_CAP - redHotCapRemaining)} / ${prefix}${formatMoney(RED_HOT_CAP)}`
              }
              color="#FF7D00"
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#86909C' }}>
              {locale['dashboard.remaining']}: {prefix}
              {formatMoney(redHotCapRemaining)}
            </div>
          </Card>
        </Col>
      </Row>

      <Divider />

      <div style={{ fontSize: 13, color: '#86909C', lineHeight: 1.8 }}>
        <div>
          <Tag color="red">China/Macau</Tag> Spend: {prefix}
          {formatMoney(agg.chinaSpend)} ({agg.qualifiedCount} transactions)
        </div>
        <div>
          <Tag color="gray">Other</Tag> Spend: {prefix}
          {formatMoney(agg.otherSpend)} ({agg.totalCount - agg.qualifiedCount} transactions)
        </div>
        <div style={{ marginTop: 8 }}>
          Max possible rate: <strong>4.4%</strong> = 0.4% base + 2% Pulse + 2% Red Hot
        </div>
      </div>
    </div>
  );
};

export default RewardSummary;
