import { useMemo } from "react";
import Fuse from "fuse.js";
import { MovieCard } from "./MovieCard";
import { SeriesCard } from "./SeriesCard";
import type { ArchiveItem, Movie, Series } from "@shared/schema";

interface MovieGridProps {
  items: ArchiveItem[];
  searchQuery: string;
}

export function MovieGrid({ items, searchQuery }: MovieGridProps) {
  // SAFETY CHECK: Ensure items is an array
  const safeItems = Array.isArray(items) ? items : [];

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(safeItems, {
      keys: ["title"],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [safeItems]);

  // Get filtered items using fuzzy search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return safeItems;
    }
    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [fuse, safeItems, searchQuery]);

  // Early return if no items
  if (!safeItems || safeItems.length === 0) {
    return (
      <div
        data-testid="empty-state-no-movies"
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-4" data-testid="icon-container-empty">
          <svg
            className="w-10 h-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            data-testid="icon-empty-film"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-empty-title">
          No movies yet
        </h3>
        <p className="text-muted-foreground max-w-sm" data-testid="text-empty-description">
          Run the indexer script to scan your Telegram channel and populate the archive.
        </p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div
        data-testid="empty-state-no-results"
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-4" data-testid="icon-container-search">
          <svg
            className="w-10 h-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            data-testid="icon-search-empty"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-no-results-title">
          No results found
        </h3>
        <p className="text-muted-foreground max-w-sm" data-testid="text-no-results-description">
          Try searching with different keywords or check your spelling.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="grid-movies"
      className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
    >
      {filteredItems.map((item, index) => {
        const key = item?.id || `item-${index}`;
        if (item?.type === "series") {
          return <SeriesCard key={key} series={item as Series} index={index} />;
        }
        return <MovieCard key={key} movie={item as Movie} index={index} />;
      })}
    </div>
  );
}
