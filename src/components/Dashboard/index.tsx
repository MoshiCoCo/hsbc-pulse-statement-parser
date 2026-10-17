import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Grid, Statistic, Skeleton, Alert, Button, Switch } from '@arco-design/web-react';
import { IconSun, IconMoon, IconLanguage } from '@arco-design/web-react/icon';
import type { AppState, StatementData, Transaction } from '@/types/statement';
import { addStatements, setRewards, setLoading, setError } from '@/store';
import { parsePDFFromFile } from '@/utils/pdfParser';
import { calculateRewards, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP } from '@/utils/rewardCalculator';
import FileUploadComponent from '@/components/FileUpload';
import TransactionTable from '@/components/TransactionTable';
import RewardSummary from '@/components/RewardSummary';
import { useLocale } from '@/locale/LocaleContext';
import { useTheme } from '@/theme/ThemeContext';

const { Row, Col } = Grid;

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { t, toggleLang, lang } = useLocale();
  const { theme, toggleTheme } = useTheme();

  const statements = useSelector((state: AppState) => state.statements);
  const allRewards = useSelector((state: AppState) => state.allRewards);
  const loading = useSelector((state: AppState) => state.loading);
  const error = useSelector((state: AppState) => state.error);
  const redHotCapRemaining = useSelector((state: AppState) => state.redHotCapRemaining);
  const applePayQrCapRemaining = useSelector((state: AppState) => state.applePayQrCapRemaining);

  const hasData = statements.length > 0;

  const handleFilesParsed = useCallback(
    async (files: File[]) => {
      dispatch(setLoading(true));
      try {
        let allParsed: StatementData[] = [];
        for (const file of files) {
          const parsed = await parsePDFFromFile(file);
          allParsed = allParsed.concat(parsed);
        }
        if (allParsed.length === 0) {
          dispatch(setError('No statement data found in the uploaded files.'));
          return;
        }
        dispatch(addStatements(allParsed));

        const allTxns = allParsed.flatMap((s) => s.transactions);
        const existingTxns = statements.flatMap((s) => s.transactions);
        const combined = [...existingTxns, ...allTxns];
        // Always recalculate from scratch with full caps
        const rewards = calculateRewards(combined, RED_HOT_ANNUAL_CAP, APPLE_PAY_QR_ANNUAL_CAP);
        dispatch(setRewards(rewards));
      } catch (e: any) {
        dispatch(setError(e.message || 'Failed to parse PDF'));
      }
    },
    [dispatch, statements, redHotCapRemaining, applePayQrCapRemaining]
  );

  const allTransactions = statements.flatMap((s) => s.transactions);

  const byCurrency = (txns: Transaction[], currency: 'HKD' | 'CNY') =>
    txns.filter((t) => t.currency === currency);

  const sumAmount = (txns: Transaction[]) =>
    txns.reduce((s, t) => s + Math.abs(t.amount), 0);

  const rewardByCurrency = (currency: 'HKD' | 'CNY') =>
    allRewards
      .filter((r) => r.transaction.currency === currency)
      .reduce((s, r) => s + r.breakdown.totalReward, 0);

  const hkdCharges = byCurrency(allTransactions.filter((t) => !t.isCredit), 'HKD');
  const hkdCredits = byCurrency(allTransactions.filter((t) => t.isCredit), 'HKD');
  const cnyCharges = byCurrency(allTransactions.filter((t) => !t.isCredit), 'CNY');
  const cnyCredits = byCurrency(allTransactions.filter((t) => t.isCredit), 'CNY');

  const isDark = theme === 'dark';
  const cardStyle = {
    backgroundColor: isDark ? '#232324' : '#ffffff',
    borderColor: isDark ? '#333' : '#e5e6eb',
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>{t('dashboard.title')}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileUploadComponent onFilesParsed={handleFilesParsed} loading={loading} />
          <Button
            icon={<IconLanguage />}
            onClick={toggleLang}
            style={{ minWidth: 80 }}
          >
            {lang === 'en-US' ? '中文' : 'EN'}
          </Button>
          <Button
            icon={isDark ? <IconSun /> : <IconMoon />}
            onClick={toggleTheme}
          >
            {t(isDark ? 'theme.light' : 'theme.dark')}
          </Button>
        </div>
      </div>

      {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} closable />}

      {/* HKD Account Section */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12, color: isDark ? '#f6f6f6' : '#1d2129' }}>
          {t('dashboard.hkdAccount')}
        </h3>
        <Row gutter={16}>
          {hasData ? (
            <>
              <Col span={6}>
                <Card style={cardStyle}>
                  <Statistic
                    title={t('dashboard.totalCharges')}
                    value={sumAmount(hkdCharges)}
                    prefix="HK$"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: '#86909C', marginTop: 4 }}>
                    {hkdCharges.length} transactions
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card style={cardStyle}>
                  <Statistic
                    title={t('dashboard.totalCredits')}
                    value={sumAmount(hkdCredits)}
                    prefix="HK$"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: '#86909C', marginTop: 4 }}>
                    {hkdCredits.length} transactions
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card style={cardStyle}>
                  <Statistic
                    title={t('dashboard.totalRewardsEarned')}
                    value={rewardByCurrency('HKD')}
                    prefix="HK$"
                    precision={0}
                  />
                  <div style={{ fontSize: 12, color: '#86909C', marginTop: 4 }}>
                    {allRewards.filter((r) => r.transaction.currency === 'HKD').length} transactions
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card style={cardStyle}>
                  <Statistic
                    title="Statement Balance"
                    value={(() => {
                      const charges = sumAmount(hkdCharges);
                      const credits = sumAmount(hkdCredits);
                      return Math.abs(charges - credits);
                    })()}
                    prefix="HK$"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: '#86909C', marginTop: 4 }}>
                    Net balance
                  </div>
                </Card>
              </Col>
            </>
          ) : (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Col span={6} key={i}>
                  <Card style={cardStyle}>
                    <Skeleton text={{ rows: 3 }} />
                  </Card>
                </Col>
              ))}
            </>
          )}
        </Row>
      </div>

      {/* CNY Account Section */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12, color: isDark ? '#f6f6f6' : '#1d2129' }}>
          {t('dashboard.cnyAccount')}
        </h3>
        <Row gutter={16}>
          {hasData ? (
            <>
              <Col span={6}>
                <Card style={cardStyle}>
                  <Statistic
                    title={t('dashboard.totalCharges')}
                    value={sumAmount(cnyCharges)}
                    prefix="¥"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: '#86909C', marginTop: 4 }}>
                    {cnyCharges.length} transactions
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card style={cardStyle}>
                  <Statistic
                    title={t('dashboard.totalCredits')}
                    value={sumAmount(cnyCredits)}
                    prefix="¥"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: '#86909C', marginTop: 4 }}>
                    {cnyCredits.length} transactions
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card style={cardStyle}>
                  <Statistic
                    title={t('dashboard.totalRewardsEarned')}
                    value={rewardByCurrency('CNY')}
                    prefix="¥"
                    precision={0}
                  />
                  <div style={{ fontSize: 12, color: '#86909C', marginTop: 4 }}>
                    {allRewards.filter((r) => r.transaction.currency === 'CNY').length} transactions
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card style={cardStyle}>
                  <Statistic
                    title="Statement Balance"
                    value={(() => {
                      const charges = sumAmount(cnyCharges);
                      const credits = sumAmount(cnyCredits);
                      return Math.abs(charges - credits);
                    })()}
                    prefix="¥"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: '#86909C', marginTop: 4 }}>
                    Net balance
                  </div>
                </Card>
              </Col>
            </>
          ) : (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Col span={6} key={i}>
                  <Card style={cardStyle}>
                    <Skeleton text={{ rows: 3 }} />
                  </Card>
                </Col>
              ))}
            </>
          )}
        </Row>
      </div>

      {/* Reward Summary */}
      {hasData && allRewards.length > 0 ? (
        <RewardSummary
          rewards={allRewards}
          redHotCapRemaining={redHotCapRemaining}
          applePayQrCapRemaining={applePayQrCapRemaining}
        />
      ) : (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12, color: isDark ? '#f6f6f6' : '#1d2129' }}>
            {t('reward.summary')}
          </h3>
          <Row gutter={16}>
            {[1, 2, 3, 4].map((i) => (
              <Col span={6} key={i}>
                <Card style={cardStyle}>
                  <Skeleton text={{ rows: 3 }} />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Transaction Table */}
      <Card
        title={`${t('dashboard.transactions')} (${hasData ? allTransactions.length : 0})`}
        style={cardStyle}
      >
        {hasData ? (
          <TransactionTable transactions={allTransactions} rewards={allRewards} />
        ) : (
          <Skeleton text={{ rows: 8 }} />
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
