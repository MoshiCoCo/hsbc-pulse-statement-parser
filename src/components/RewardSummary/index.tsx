import React from 'react';
import { Card, Grid, Statistic, Tag } from '@arco-design/web-react';
import type { TransactionReward } from '@/types/statement';
import { aggregateRewards } from '@/utils/rewardCalculator';
import { useLocale } from '@/locale/LocaleContext';
import { useTheme } from '@/theme/ThemeContext';

const { Row, Col } = Grid;

interface RewardSummaryProps {
  rewards: TransactionReward[];
  redHotCapRemaining: number;
  applePayQrCapRemaining: number;
}

const RewardSummary: React.FC<RewardSummaryProps> = ({
  rewards,
  redHotCapRemaining,
  applePayQrCapRemaining,
}) => {
  const { t } = useLocale();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cnyRewards = rewards.filter((r) => r.transaction.currency === 'CNY');
  const aggregated = aggregateRewards(cnyRewards);

  const RED_HOT_CAP = 80000;
  const APPLE_PAY_QR_CAP = 80000;

  const redHotUsed = RED_HOT_CAP - redHotCapRemaining;
  const applePayQrUsed = APPLE_PAY_QR_CAP - applePayQrCapRemaining;

  const cardStyle = {
    backgroundColor: isDark ? '#232324' : '#ffffff',
    borderColor: isDark ? '#333' : '#e5e6eb',
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column' as const,
  };

  const titleStyle = {
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
  };

  const titleInlineStyle = {
    lineHeight: '1.5',
  };

  const valueContainerStyle = {
    marginTop: 'auto',
    paddingTop: 8,
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ marginBottom: 12, color: isDark ? '#f6f6f6' : '#1d2129' }}>
        {t('reward.summary')}
      </h3>
      <Row gutter={16}>
        <Col span={6}>
          <Card style={cardStyle}>
            <div style={{ flex: 1 }}>
              <Statistic
                title={<div style={titleStyle}>{t('reward.totalReward')}</div>}
                value={aggregated.totalReward}
                precision={0}
              />
            </div>
            <div style={valueContainerStyle}>
              <div style={{ fontSize: 12, color: '#86909C' }}>
                {t('reward.effectiveRate')}: {(aggregated.totalReward / aggregated.cnySpend * 100).toFixed(2)}%
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={cardStyle}>
            <div style={{ flex: 1 }}>
              <Statistic
                title={
                  <div style={titleStyle}>
                    <span style={titleInlineStyle}>
                      {t('reward.baseReward')} <Tag color="gray" size="small">0.4%</Tag>
                    </span>
                  </div>
                }
                value={aggregated.totalBase}
                precision={0}
              />
            </div>
            <div style={valueContainerStyle}>
              <div style={{ fontSize: 12, color: '#86909C' }}>
                {aggregated.totalCount} {t('reward.transactions')}
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={cardStyle}>
            <div style={{ flex: 1 }}>
              <Statistic
                title={
                  <div style={titleStyle}>
                    <span style={titleInlineStyle}>
                      {t('reward.redHotBonus')} <Tag color="red" size="small">2%</Tag>
                    </span>
                  </div>
                }
                value={aggregated.totalRedHot}
                precision={0}
              />
            </div>
            <div style={valueContainerStyle}>
              <div style={{ fontSize: 12, color: '#86909C' }}>
                {redHotUsed.toFixed(0)} / {RED_HOT_CAP.toLocaleString()}
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={cardStyle}>
            <div style={{ flex: 1 }}>
              <Statistic
                title={
                  <div style={titleStyle}>
                    <span style={titleInlineStyle}>
                      {t('reward.applePayQrBonus')} <Tag color="blue" size="small">2%</Tag>
                    </span>
                  </div>
                }
                value={aggregated.totalApplePayQr}
                precision={0}
              />
            </div>
            <div style={valueContainerStyle}>
              <div style={{ fontSize: 12, color: '#86909C' }}>
                {applePayQrUsed.toFixed(0)} / {APPLE_PAY_QR_CAP.toLocaleString()}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      {aggregated.totalMeituanExtra > 0 && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Card style={cardStyle}>
              <div style={{ flex: 1 }}>
                <Statistic
                  title={
                    <div style={titleStyle}>
                      <span style={titleInlineStyle}>
                        {t('reward.meituanExtra')} <Tag color="orange" size="small">+3%</Tag>
                      </span>
                    </div>
                  }
                  value={aggregated.totalMeituanExtra}
                  precision={0}
                />
              </div>
              <div style={valueContainerStyle}>
                <div style={{ fontSize: 12, color: '#86909C' }}>
                  {aggregated.qualifiedMeituanExtraCount} {t('reward.transactions')}
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default RewardSummary;
