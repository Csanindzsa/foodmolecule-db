import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface HistoryItem {
  id: string;
  name: string;
  scannedAt: string;
}

interface HistoryState {
  history: HistoryItem[];
  add: (item: HistoryItem) => void;
  clear: () => void;
  load: () => Promise<void>;
}

const STORAGE_KEY = "nutrii_history";

function normalizeHistory(raw: string | null): HistoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is HistoryItem =>
        typeof item?.id === "string" &&
        typeof item?.name === "string" &&
        typeof item?.scannedAt === "string",
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  add: (item) => {
    const deduped = get().history.filter((existing) => existing.id !== item.id);
    const next = [item, ...deduped].slice(0, 50);
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
