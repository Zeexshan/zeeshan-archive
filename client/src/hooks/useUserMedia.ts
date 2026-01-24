import { useState, useEffect, useCallback } from "react";

export type WatchStatus = "plan_to_watch" | "watching" | "completed" | "dropped";

export interface TrackedMedia {
  status: WatchStatus;
  rating: number | null;
  review: string;
  dateAdded: string;
  dateCompleted: string | null;
}

interface TrackedMediaStore {
  version: number;
  data: Record<string, TrackedMedia>;
}

const STORAGE_KEY = "tele-flix-tracking";
const CURRENT_VERSION = 1;

function getInitialStore(): TrackedMediaStore {
  return { version: CURRENT_VERSION, data: {} };
}

function loadFromStorage(): TrackedMediaStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getInitialStore();
    
    const parsed = JSON.parse(stored) as TrackedMediaStore;
    if (parsed.version !== CURRENT_VERSION) {
      return getInitialStore();
    }
    return parsed;
  } catch {
    return getInitialStore();
  }
}

function saveToStorage(store: TrackedMediaStore): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function useUserMedia() {
  const [store, setStore] = useState<TrackedMediaStore>(getInitialStore);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    try {
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      setIsAvailable(true);
      setStore(loadFromStorage());
    } catch {
      setIsAvailable(false);
    }
  }, []);

  const getTrackedData = useCallback((mediaId: string): TrackedMedia | null => {
    return store.data[mediaId] || null;
  }, [store]);

  const saveTrackedData = useCallback((mediaId: string, data: TrackedMedia): boolean => {
    const newStore = {
      ...store,
      data: { ...store.data, [mediaId]: data }
    };
    const success = saveToStorage(newStore);
    if (success) {
      setStore(newStore);
    }
    return success;
  }, [store]);

  const deleteTrackedData = useCallback((mediaId: string): boolean => {
    const newData = { ...store.data };
    delete newData[mediaId];
    const newStore = { ...store, data: newData };
    const success = saveToStorage(newStore);
    if (success) {
      setStore(newStore);
    }
    return success;
  }, [store]);

  const getAllTrackedMedia = useCallback((): Record<string, TrackedMedia> => {
    return store.data;
  }, [store]);

  const getCompletedMedia = useCallback((): Array<{ id: string; data: TrackedMedia }> => {
    return Object.entries(store.data)
      .filter(([_, data]) => data.status === "completed" && data.rating !== null)
      .map(([id, data]) => ({ id, data }))
      .sort((a, b) => (b.data.rating || 0) - (a.data.rating || 0));
  }, [store]);

  const getMediaByStatus = useCallback((status: WatchStatus): Array<{ id: string; data: TrackedMedia }> => {
    return Object.entries(store.data)
      .filter(([_, data]) => data.status === status)
      .map(([id, data]) => ({ id, data }));
  }, [store]);

  const getStats = useCallback(() => {
    const all = Object.values(store.data);
    const completed = all.filter(d => d.status === "completed");
    const ratings = completed.filter(d => d.rating !== null).map(d => d.rating as number);
    
    return {
      total: all.length,
      planToWatch: all.filter(d => d.status === "plan_to_watch").length,
      watching: all.filter(d => d.status === "watching").length,
      completed: completed.length,
      dropped: all.filter(d => d.status === "dropped").length,
      averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      ratingDistribution: Array.from({ length: 10 }, (_, i) => 
        ratings.filter(r => Math.floor(r) === i + 1).length
      )
    };
  }, [store]);

  const exportData = useCallback((): string => {
    return JSON.stringify(store, null, 2);
  }, [store]);

  const importData = useCallback((jsonString: string): boolean => {
    try {
      const imported = JSON.parse(jsonString) as TrackedMediaStore;
      if (typeof imported.version !== "number" || typeof imported.data !== "object") {
        return false;
      }
      const success = saveToStorage(imported);
      if (success) {
        setStore(imported);
      }
      return success;
    } catch {
      return false;
    }
  }, []);

  return {
    isAvailable,
    getTrackedData,
    saveTrackedData,
    deleteTrackedData,
    getAllTrackedMedia,
    getCompletedMedia,
    getMediaByStatus,
    getStats,
    exportData,
    importData
  };
}
