import React from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider } from '@arco-design/web-react';
import '@arco-design/web-react/dist/css/arco.css';
import { store } from '@/store';
import '@/style/global.css';

function MyApp({ Component, pageProps }: any) {
  return (
    <Provider store={store}>
      <ConfigProvider>
        <Component {...pageProps} />
      </ConfigProvider>
    </Provider>
  );
}

export default MyApp;
