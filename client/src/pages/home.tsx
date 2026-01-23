import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { MovieGrid } from "@/components/MovieGrid";
import { LoadingState } from "@/components/LoadingState";
import type { Movie } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: movies = [], isLoading, error } = useQuery<Movie[]>({
    queryKey: ["/movies.json"],
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div
          data-testid="error-state"
          className="text-center p-6"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4" data-testid="icon-container-error">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              data-testid="icon-error"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2" data-testid="text-error-title">
            Failed to load movies
          </h2>
          <p className="text-muted-foreground" data-testid="text-error-description">
            Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-home">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalMovies={movies.length}
      />
      <main className="max-w-7xl mx-auto px-4 py-6" data-testid="main-content">
        <MovieGrid movies={movies} searchQuery={searchQuery} />
      </main>
    </div>
  );
}
