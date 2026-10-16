import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Tabs, Message, Spin, Alert } from '@arco-design/web-react';
import type { AppState } from '@/types/statement';
import { addStatements, setRewards, setLoading, setError } from '@/store';
import { parsePDFFromFile } from '@/utils/pdfParser';
import { calculateRewards } from '@/utils/rewardCalculator';
import FileUploadComponent from '@/components/FileUpload';
import TransactionTable from '@/components/TransactionTable';
import RewardSummary from '@/components/RewardSummary';
import locale from '@/locale';

const TabPane = Tabs.TabPane;

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { statements, allRewards, loading, error, pulseCapRemaining, redHotCapRemaining } =
    useSelector((state: AppState) => state);

  const handleFileParsed = useCallback(
    async (file: File) => {
      dispatch(setLoading(true));
      try {
        const parsed = await parsePDFFromFile(file);
        if (parsed.length === 0) {
          dispatch(setError('No statement data found. Please check the PDF file.'));
          return;
        }
        dispatch(addStatements(parsed));

        const allTxns = parsed.flatMap((s) => s.transactions);
        const rewards = calculateRewards(allTxns, pulseCapRemaining, redHotCapRemaining);
        dispatch(setRewards(rewards));
        Message.success(locale['fileUpload.success']);
      } catch (e: any) {
        dispatch(setError(e.message || 'Failed to parse PDF'));
        Message.error(locale['fileUpload.error']);
      }
    },
    [dispatch, pulseCapRemaining, redHotCapRemaining]
  );

  const hkdStatement = statements.find((s) => s.currency === 'HKD');
  const cnyStatement = statements.find((s) => s.currency === 'CNY');

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>{locale['dashboard.title']}</h2>

      {error && (
        <Alert type="error" content={error} style={{ marginBottom: 16 }} closable />
      )}

      <Card style={{ marginBottom: 20 }}>
        <Spin loading={loading}>
          <FileUploadComponent onFileParsed={handleFileParsed} loading={loading} />
        </Spin>
      </Card>

      {statements.length > 0 && (
        <Tabs defaultActiveTab="rewards" type="card-gutter">
          <TabPane key="rewards" title={locale['dashboard.rewardSummary']}>
            {hkdStatement && allRewards.length > 0 && (
              <Card
                title={locale['dashboard.hkdAccount']}
                style={{ marginBottom: 16 }}
              >
                <RewardSummary
                  rewards={allRewards.filter(
                    (r) => r.transaction.currency === 'HKD'
                  )}
                  pulseCapRemaining={pulseCapRemaining}
                  redHotCapRemaining={redHotCapRemaining}
                  currency="HKD"
                />
              </Card>
            )}
            {cnyStatement && (
              <Card title={locale['dashboard.cnyAccount']}>
                <RewardSummary
                  rewards={allRewards.filter(
                    (r) => r.transaction.currency === 'CNY'
                  )}
                  pulseCapRemaining={pulseCapRemaining}
                  redHotCapRemaining={redHotCapRemaining}
                  currency="CNY"
                />
              </Card>
            )}
          </TabPane>

          {hkdStatement && (
            <TabPane
              key="hkd"
              title={`${locale['dashboard.hkdAccount']} (${hkdStatement.transactions.length})`}
            >
              <Card>
                <TransactionTable
                  transactions={hkdStatement.transactions}
                  currency="HKD"
                />
              </Card>
            </TabPane>
          )}

          {cnyStatement && (
            <TabPane
              key="cny"
              title={`${locale['dashboard.cnyAccount']} (${cnyStatement.transactions.length})`}
            >
              <Card>
                <TransactionTable
                  transactions={cnyStatement.transactions}
                  currency="CNY"
                />
              </Card>
            </TabPane>
          )}
        </Tabs>
      )}
    </div>
  );
};

export default Dashboard;
