import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { MovieGrid } from "@/components/MovieGrid";
import { LoadingState } from "@/components/LoadingState";
// We import ContentItem (or whatever your schema exports) to support both Movies and Series
// If schema.ts isn't fully updated yet, we can use 'any' temporarily to prevent crashes
import type { Movie } from "@shared/schema"; 

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: movies = [], isLoading, error } = useQuery({
    queryKey: ["/movies.json"], // <--- CHANGED FROM /api/movies
    queryFn: async () => {
      // Direct fetch to the file in the public folder
      const res = await fetch("/movies.json");
      if (!res.ok) {
        throw new Error("Failed to load movie list");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Failed to load movies</h2>
          <p className="text-muted-foreground">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalMovies={movies.length}
      />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <MovieGrid movies={movies} searchQuery={searchQuery} />
      </main>
    </div>
  );
}
