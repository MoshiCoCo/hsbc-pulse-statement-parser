import React from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider } from '@arco-design/web-react';
import '@arco-design/web-react/dist/css/arco.css';
import { store } from '@/store';
import '@/style/global.css';
import { LocaleProvider } from '@/locale/LocaleContext';
import { ThemeProvider } from '@/theme/ThemeContext';

function MyApp({ Component, pageProps }: any) {
  return (
    <Provider store={store}>
      <LocaleProvider>
        <ThemeProvider>
          <ConfigProvider>
            <Component {...pageProps} />
          </ConfigProvider>
        </ThemeProvider>
      </LocaleProvider>
    </Provider>
  );
}

export default MyApp;
