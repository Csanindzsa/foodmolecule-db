import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { HISTORY_LIMIT, normalizeHistory, normalizeHistoryItem, type StoredHistoryItem } from "../lib/history";

type HistoryItem = StoredHistoryItem & {
  image_url?: string;
  health_index?: number | null;
};

interface HistoryState {
  history: HistoryItem[];
  add: (item: HistoryItem) => void;
  clear: () => void;
  load: () => Promise<void>;
}

const STORAGE_KEY = "nutrii_history";

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  add: (item) => {
    const normalized = normalizeHistoryItem(item);
    if (!normalized) return;
    const deduped = get().history.filter((existing) => existing.id !== normalized.id);
    const next = [normalized, ...deduped].slice(0, HISTORY_LIMIT);
    set({ history: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  },
  clear: () => {
    set({ history: [] });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  },
  load: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
    set({ history: normalizeHistory(raw) });
  },
}));
