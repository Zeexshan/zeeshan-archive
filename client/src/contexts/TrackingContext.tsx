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

// Your Real Google URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbxOgVnMN9UX0ciZzEFpWflajHnH88bujC8tWp_xbaNiJFbCBaYnAIhUXSgVxiHK2-EC/exec";

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
  getStats: () => any;
  exportData: () => string;
  importData: (jsonString: string) => boolean;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Record<string, TrackedMedia>>({});
  const [isAvailable, setIsAvailable] = useState(true);
  const currentUser = localStorage.getItem("teleflix_user");

  // ---------------------------------------------------------
  // DEBUGGING VERSION: FETCH DATA
  // ---------------------------------------------------------
  const fetchData = useCallback(async () => {
    // 1. ALWAYS LOG THIS
    console.log("🚀 STARTING FETCH. Current User:", currentUser);

    if (!currentUser) {
      console.warn("⚠️ STOPPING: No user found in localStorage!");
      return;
    }

    try {
      console.log("🌐 Calling Google Sheets API...");
      const response = await fetch(API_URL);
      const json = await response.json();

      console.log("📂 API Response Keys:", Object.keys(json));

      const userKey = Object.keys(json).find(
        (k) => k.toLowerCase() === currentUser.toLowerCase(),
      );

      if (userKey && json[userKey]) {
        console.log("✅ SUCCESS! Loading data for:", userKey);
        setData(json[userKey]);
      } else {
        console.error(
          "❌ FAILURE: User found in local storage, but NOT in Database.",
        );
        setData({});
      }
    } catch (error) {
      console.error("🔥 CRITICAL API ERROR:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ... (Rest of the functions keep working as before) ...
  const getTrackedData = useCallback(
    (mediaId: string) => data[mediaId] || null,
    [data],
  );

  const saveTrackedData = useCallback(
    async (mediaId: string, mediaData: TrackedMedia) => {
      if (!currentUser) return false;
      setData((prev) => ({ ...prev, [mediaId]: mediaData }));
      try {
        fetch(API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            user: currentUser,
            id: mediaId,
            ...mediaData,
          }),
        });
        return true;
      } catch (e) {
        return true;
      }
    },
    [currentUser],
  );

  const deleteTrackedData = useCallback(
    async (mediaId: string) => {
      if (!currentUser) return false;
      try {
        await fetch(API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            user: currentUser,
            id: mediaId,
            action: "delete",
          }),
        });
        const newData = { ...data };
        delete newData[mediaId];
        setData(newData);
        return true;
      } catch (e) {
        return false;
      }
    },
    [currentUser, data],
  );

  const getAllTrackedMedia = useCallback(() => data, [data]);

  const getCompletedMedia = useCallback(() => {
    return Object.entries(data)
      .filter(([_, d]) => d.status === "completed")
      .map(([id, d]) => ({ id, data: d }))
      .sort((a, b) => (b.data.rating || 0) - (a.data.rating || 0));
  }, [data]);

  const getMediaByStatus = useCallback(
    (status: WatchStatus) => {
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

  const exportData = useCallback(() => JSON.stringify(data, null, 2), [data]);
  const importData = useCallback(() => false, []);

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

export function useTracking() {
  const context = useContext(TrackingContext);
  if (!context)
    throw new Error("useTracking must be used within a TrackingProvider");
  return context;
}
