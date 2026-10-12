import { useState, useEffect } from "react";

export interface RecentSearchItem {
  id: string;
  title: string;
  subtitle?: string;
  type: "employee" | "page" | "action";
  url: string;
}

const RECENT_SEARCHES_KEY = "mise_recent_searches";
const MAX_RECENT_SEARCHES = 5;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading recent searches from localStorage", error);
    }
  }, []);

  const addRecentSearch = (item: RecentSearchItem) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id);
      const newSearches = [item, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
      } catch (error) {
        console.error("Error saving recent search to localStorage", error);
      }
      return newSearches;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error("Error clearing recent searches from localStorage", error);
    }
  };

  return {
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  };
}
