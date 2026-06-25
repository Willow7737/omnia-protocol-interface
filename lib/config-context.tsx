'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { APIClient } from './api-client';

interface Config {
  endpoint: string;
  token: string;
}

interface ConfigContextType {
  config: Config | null;
  setConfig: (config: Config) => void;
  apiClient: APIClient | null;
  isConfigured: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<Config | null>(null);
  const [apiClient, setApiClient] = useState<APIClient | null>(null);

  // Load config from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('omnia-config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfigState(parsed);
        setApiClient(new APIClient(parsed.endpoint, parsed.token));
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    }
  }, []);

  const setConfig = (newConfig: Config) => {
    setConfigState(newConfig);
    localStorage.setItem('omnia-config', JSON.stringify(newConfig));
    setApiClient(new APIClient(newConfig.endpoint, newConfig.token));
  };

  return (
    <ConfigContext.Provider value={{ config, setConfig, apiClient, isConfigured: !!config }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}
