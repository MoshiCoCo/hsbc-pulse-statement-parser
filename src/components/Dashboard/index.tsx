import React, { useCallback, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Grid, Statistic, Skeleton, Alert, Modal, Button } from '@arco-design/web-react';
import { IconLanguage, IconSun, IconMoon } from '@arco-design/web-react/icon';
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

// Horizontal + vertical gutter, tighter on phones
const ROW_GUTTER: [{ xs: number; lg: number }, { xs: number; lg: number }] = [
  { xs: 12, lg: 16 },
  { xs: 12, lg: 16 },
];
// 2 cards per row on phones, 4 on desktop
const CARD_COL = { xs: 12, lg: 6 } as const;

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
  const [privacyVisible, setPrivacyVisible] = useState(true);
  const parsedFileNames = useRef<Set<string>>(new Set());

  const handleFilesParsed = useCallback(
    async (files: File[]) => {
      const fresh = files.filter((f) => !parsedFileNames.current.has(f.name));
      if (fresh.length === 0) return;
      dispatch(setLoading(true));
      try {
        let allParsed: StatementData[] = [];
        for (const file of fresh) {
          const parsed = await parsePDFFromFile(file);
          allParsed = allParsed.concat(parsed);
        }
        if (allParsed.length === 0) {
          dispatch(setError('No statement data found in the uploaded files.'));
          return;
        }
        fresh.forEach((f) => parsedFileNames.current.add(f.name));
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
  return (
    <>
      {/* Sticky top nav */}
      <header className="app-nav">
        <div className="app-nav-inner">
          <div className="brand">
            <span className="brand-title">{t('dashboard.title')}</span>
          </div>
          <div className="header-actions">
            <FileUploadComponent onFilesParsed={handleFilesParsed} loading={loading} />
            <button
              type="button"
              className="nav-icon-btn"
              onClick={toggleLang}
              title={lang === 'en-US' ? '中文' : 'English'}
            >
              <IconLanguage />
            </button>
            <button
              type="button"
              className="nav-icon-btn"
              onClick={toggleTheme}
              title={t(isDark ? 'theme.light' : 'theme.dark')}
            >
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </div>
      </header>

      <div className="page-container">

      {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} closable />}

      {/* HKD Account Section */}
      <div style={{ marginBottom: 24 }}>
        <h3 className="section-title">
          {t('dashboard.hkdAccount')}
        </h3>
        <Row gutter={ROW_GUTTER}>
          {hasData ? (
            <>
              <Col {...CARD_COL}>
                <Card>
                  <Statistic
                    title={t('dashboard.totalCharges')}
                    value={sumAmount(hkdCharges)}
                    prefix="HK$"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    {hkdCharges.length} transactions
                  </div>
                </Card>
              </Col>
              <Col {...CARD_COL}>
                <Card>
                  <Statistic
                    title={t('dashboard.totalCredits')}
                    value={sumAmount(hkdCredits)}
                    prefix="HK$"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    {hkdCredits.length} transactions
                  </div>
                </Card>
              </Col>
              <Col {...CARD_COL}>
                <Card>
                  <Statistic
                    title={t('dashboard.totalRewardsEarned')}
                    value={rewardByCurrency('HKD')}
                    prefix="HK$"
                    precision={0}
                  />
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    {allRewards.filter((r) => r.transaction.currency === 'HKD').length} transactions
                  </div>
                </Card>
              </Col>
              <Col {...CARD_COL}>
                <Card>
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
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    Net balance
                  </div>
                </Card>
              </Col>
            </>
          ) : (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Col {...CARD_COL} key={i}>
                  <Card>
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
        <h3 className="section-title">
          {t('dashboard.cnyAccount')}
        </h3>
        <Row gutter={ROW_GUTTER}>
          {hasData ? (
            <>
              <Col {...CARD_COL}>
                <Card>
                  <Statistic
                    title={t('dashboard.totalCharges')}
                    value={sumAmount(cnyCharges)}
                    prefix="¥"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    {cnyCharges.length} transactions
                  </div>
                </Card>
              </Col>
              <Col {...CARD_COL}>
                <Card>
                  <Statistic
                    title={t('dashboard.totalCredits')}
                    value={sumAmount(cnyCredits)}
                    prefix="¥"
                    precision={2}
                  />
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    {cnyCredits.length} transactions
                  </div>
                </Card>
              </Col>
              <Col {...CARD_COL}>
                <Card>
                  <Statistic
                    title={t('dashboard.totalRewardsEarned')}
                    value={rewardByCurrency('CNY')}
                    prefix="¥"
                    precision={0}
                  />
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    {allRewards.filter((r) => r.transaction.currency === 'CNY').length} transactions
                  </div>
                </Card>
              </Col>
              <Col {...CARD_COL}>
                <Card>
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
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    Net balance
                  </div>
                </Card>
              </Col>
            </>
          ) : (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Col {...CARD_COL} key={i}>
                  <Card>
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
          <h3 className="section-title">
            {t('reward.summary')}
          </h3>
          <Row gutter={ROW_GUTTER}>
            {[1, 2, 3, 4].map((i) => (
              <Col {...CARD_COL} key={i}>
                <Card>
                  <Skeleton text={{ rows: 3 }} />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Transaction Table */}
      <div style={{ marginBottom: 24 }}>
        <h3 className="section-title">
          {t('dashboard.transactions')} ({hasData ? allTransactions.length : 0})
        </h3>
        <Card>
          {hasData ? (
            <TransactionTable transactions={allTransactions} rewards={allRewards} />
          ) : (
            <Skeleton text={{ rows: 8 }} />
          )}
        </Card>
      </div>
      </div>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <div>{t('footer.privacy')}</div>
          <div>{t('footer.disclaimer')}</div>
        </div>
      </footer>

      <Modal
        simple
        title={t('privacy.title')}
        visible={privacyVisible}
        onCancel={() => setPrivacyVisible(false)}
        footer={
          <Button type="primary" onClick={() => setPrivacyVisible(false)}>
            {t('privacy.ok')}
          </Button>
        }
      >
        <p style={{ marginTop: 0 }}>{t('privacy.local')}</p>
        <p style={{ marginBottom: 0 }}>{t('privacy.affinity')}</p>
      </Modal>
    </>
  );
};

export default Dashboard;
