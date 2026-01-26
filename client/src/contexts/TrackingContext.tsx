import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type WatchStatus =
  | "plan_to_watch"
  | "watching"
  | "completed"
  | "dropped";

export interface TrackedMedia {
  status: WatchStatus;
  rating: number | null;
  review: string;
  dateAdded: string;
  dateCompleted: string | null;
}

const API_URL =
  "https://script.google.com/macros/s/AKfycbxOgVnMN9UX0ciZzEFpWflajHnH88bujC8tWp_xbaNiJFbCBaYnAIhUXSgVxiHK2-EC/exec"; // Placeholder

interface TrackingContextValue {
  isAvailable: boolean;
  getTrackedData: (mediaId: string) => TrackedMedia | null;
  saveTrackedData: (mediaId: string, data: TrackedMedia) => Promise<boolean>;
  deleteTrackedData: (mediaId: string) => Promise<boolean>;
  getAllTrackedMedia: () => Record<string, TrackedMedia>;
  getCompletedMedia: () => Array<{ id: string; data: TrackedMedia }>;
  getMediaByStatus: (
    status: WatchStatus,
  ) => Array<{ id: string; data: TrackedMedia }>;
  getStats: () => {
    total: number;
    planToWatch: number;
    watching: number;
    completed: number;
    dropped: number;
    averageRating: number;
    ratingDistribution: number[];
  };
  exportData: () => string;
  importData: (jsonString: string) => boolean;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Record<string, TrackedMedia>>({});
  const [isAvailable, setIsAvailable] = useState(true);
  const currentUser = localStorage.getItem("teleflix_user");

  const fetchData = useCallback(async () => {
    if (!currentUser) return;

    try {
      console.log("Fetching data for:", currentUser); // Debug Log 1
      const response = await fetch(API_URL);
      const json = await response.json();
      console.log("API returned keys:", Object.keys(json)); // Debug Log 2

      // FIX: Find the user key ignoring Capitalization (e.g., "Zeeshan" == "zeeshan")
      const userKey = Object.keys(json).find(
        (key) => key.toLowerCase() === currentUser.toLowerCase(),
      );

      if (userKey && json[userKey]) {
        console.log("Found match:", userKey); // Debug Log 3
        setData(json[userKey]);
      } else {
        console.warn("No matching user found in DB");
        setData({});
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, [currentUser]);

  const getTrackedData = useCallback(
    (mediaId: string): TrackedMedia | null => {
      return data[mediaId] || null;
    },
    [data],
  );

  const saveTrackedData = useCallback(
    async (mediaId: string, mediaData: TrackedMedia): Promise<boolean> => {
      if (!currentUser) return false;

      // 1. OPTIMISTIC UPDATE: Update the UI immediately (Don't wait for Google)
      setData((prev) => ({ ...prev, [mediaId]: mediaData }));

      // 2. Send to Google in the background
      try {
        fetch(API_URL, {
          method: "POST",
          mode: "no-cors", // <--- IMPORTANT: This prevents CORS errors
          headers: {
            "Content-Type": "text/plain", // <--- IMPORTANT: Avoids Preflight checks
          },
          body: JSON.stringify({
            user: currentUser,
            id: mediaId,
            ...mediaData,
          }),
        });
        return true; // Always return true because we already updated the UI
      } catch (error) {
        console.error("Background sync failed:", error);
        // Optional: Revert data here if you want strict safety
        return true;
      }
    },
    [currentUser],
  );

  const deleteTrackedData = useCallback(
    async (mediaId: string): Promise<boolean> => {
      if (!currentUser) return false;
      try {
        const response = await fetch(API_URL, {
          method: "POST", // Usually Google Apps Script uses POST for everything
          body: JSON.stringify({
            user: currentUser,
            id: mediaId,
            action: "delete",
          }),
        });
        if (response.ok) {
          const newData = { ...data };
          delete newData[mediaId];
          setData(newData);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to delete data:", error);
        return false;
      }
    },
    [currentUser, data],
  );

  const getAllTrackedMedia = useCallback((): Record<string, TrackedMedia> => {
    return data;
  }, [data]);

  const getCompletedMedia = useCallback((): Array<{
    id: string;
    data: TrackedMedia;
  }> => {
    return Object.entries(data)
      .filter(([_, d]) => d.status === "completed")
      .map(([id, d]) => ({ id, data: d }))
      .sort((a, b) => (b.data.rating || 0) - (a.data.rating || 0));
  }, [data]);

  const getMediaByStatus = useCallback(
    (status: WatchStatus): Array<{ id: string; data: TrackedMedia }> => {
      return Object.entries(data)
        .filter(([_, d]) => d.status === status)
        .map(([id, d]) => ({ id, data: d }));
    },
    [data],
  );

  const getStats = useCallback(() => {
    const all = Object.values(data);
    const completed = all.filter((d) => d.status === "completed");
    const ratings = completed
      .filter((d) => d.rating !== null)
      .map((d) => d.rating as number);

    return {
      total: all.length,
      planToWatch: all.filter((d) => d.status === "plan_to_watch").length,
      watching: all.filter((d) => d.status === "watching").length,
      completed: completed.length,
      dropped: all.filter((d) => d.status === "dropped").length,
      averageRating:
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0,
      ratingDistribution: Array.from(
        { length: 10 },
        (_, i) => ratings.filter((r) => Math.floor(r) === i + 1).length,
      ),
    };
  }, [data]);

  const exportData = useCallback((): string => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importData = useCallback((jsonString: string): boolean => {
    // For now, keep local import logic if needed, but ideally it should push to API
    return false;
  }, []);

  return (
    <TrackingContext.Provider
      value={{
        isAvailable,
        getTrackedData,
        saveTrackedData,
        deleteTrackedData,
        getAllTrackedMedia,
        getCompletedMedia,
        getMediaByStatus,
        getStats,
        exportData,
        importData,
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking(): TrackingContextValue {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error("useTracking must be used within a TrackingProvider");
  }
  return context;
}
