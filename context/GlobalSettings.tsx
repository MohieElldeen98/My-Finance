import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface CustomCategory {
  id: string;
  label: string;
  type: 'expense' | 'income' | 'both';
  color: string;
}

interface GlobalSettings {
  enableAIEntry: boolean;
  hiddenTabs: string[];
  customCategories: CustomCategory[];
  tabOrder: string[];
  customTabNames: Record<string, string>;
}

const defaultSettings: GlobalSettings = {
  enableAIEntry: true,
  hiddenTabs: [],
  customCategories: [],
  tabOrder: [],
  customTabNames: {}
};

const GlobalSettingsContext = createContext<GlobalSettings>(defaultSettings);

export const useGlobalSettings = () => useContext(GlobalSettingsContext);

export const GlobalSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          enableAIEntry: data.enableAIEntry ?? true,
          hiddenTabs: data.hiddenTabs || [],
          customCategories: data.customCategories || [],
          tabOrder: data.tabOrder || [],
          customTabNames: data.customTabNames || {}
        });
      }
    });
    return () => unsub();
  }, []);

  return (
    <GlobalSettingsContext.Provider value={settings}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};

// Helper hook
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../constants';
export const useCategoryInfo = () => {
    const settings = useGlobalSettings();
    return (categoryId: string) => {
        const custom = settings.customCategories?.find(c => c.id === categoryId);
        if (custom) {
            return {
                label: custom.label,
                color: custom.color || 'bg-indigo-100 text-indigo-700'
            };
        }
        return {
            label: CATEGORY_LABELS[categoryId] || categoryId,
            color: CATEGORY_COLORS[categoryId] || 'bg-gray-100 text-gray-700'
        };
    };
};
