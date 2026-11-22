import { useCallback, useEffect, useState } from 'react';
import type { Settings, ThemePreference } from '../../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../../core/constants';
import { getSettings, saveSettings } from '../../core/services/storage';

function resolveTheme(preference: ThemePreference): 'dark' | 'light' {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return preference;
}

function applyTheme(preference: ThemePreference): void {
  document.documentElement.dataset.theme = resolveTheme(preference);
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getSettings()
      .then((loaded) => {
        if (cancelled) return;
        setSettings(loaded);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local' || !changes[STORAGE_KEYS.settings]) return;
      void getSettings().then(setSettings).catch(() => undefined);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme('system');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [settings.theme]);

  const update = useCallback(async (patch: Partial<Settings>): Promise<Settings> => {
    const next = await saveSettings(patch);
    setSettings(next);
    return next;
  }, []);

  return { settings, loading, update };
}
