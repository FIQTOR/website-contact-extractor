import { useCallback, useEffect, useState } from 'react';
import type { Lead } from '../../types';
import { STORAGE_KEYS } from '../../core/constants';
import {
  clearLeads,
  deleteLead,
  deleteLeads,
  getLeads,
  updateLead
} from '../../core/services/storage';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong while reading saved leads.';
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await getLeads();
      setLeads(next);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === 'local' && changes[STORAGE_KEYS.leads]) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await deleteLead(id);
  }, []);

  const removeMany = useCallback(async (ids: string[]) => {
    await deleteLeads(ids);
  }, []);

  const edit = useCallback(async (id: string, patch: Partial<Lead>) => {
    return updateLead(id, patch);
  }, []);

  const clear = useCallback(async () => {
    await clearLeads();
  }, []);

  return { leads, loading, error, reload: load, remove, removeMany, edit, clear };
}
