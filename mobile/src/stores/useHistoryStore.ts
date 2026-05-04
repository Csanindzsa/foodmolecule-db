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

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  add: (item) => {
    const next = [item, ...get().history].slice(0, 50);
    set({ history: next });
    AsyncStorage.setItem("nutrii_history", JSON.stringify(next));
  },
  clear: () => {
    set({ history: [] });
    AsyncStorage.removeItem("nutrii_history");
  },
  load: async () => {
    const raw = await AsyncStorage.getItem("nutrii_history");
    if (raw) set({ history: JSON.parse(raw) });
  },
}));
