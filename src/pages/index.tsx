import React from 'react';
import Head from 'next/head';
import Dashboard from '@/components/Dashboard';

const IndexPage: React.FC = () => {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <Dashboard />
    </>
  );
};

export default IndexPage;
