import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { enUS, zhCN, type Locale, type LocaleKey } from './messages';

type Lang = 'en-US' | 'zh-CN';

interface LocaleContextValue {
  lang: Lang;
  t: (key: LocaleKey) => string;
  toggleLang: () => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  lang: 'zh-CN',
  t: (key) => key,
  toggleLang: () => {},
});

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('zh-CN');

  const messages: Locale = lang === 'zh-CN' ? zhCN : enUS;

  const t = useCallback((key: LocaleKey) => messages[key] || key, [messages]);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'en-US' ? 'zh-CN' : 'en-US'));
  }, []);

  return (
    <LocaleContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);
