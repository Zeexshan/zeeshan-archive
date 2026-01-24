import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { MovieGrid } from "@/components/MovieGrid";
import { LoadingState } from "@/components/LoadingState";
import type { Movie } from "@shared/schema"; 

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/movies.json"],
    queryFn: async () => {
      const res = await fetch("/movies.json");
      if (!res.ok) {
        throw new Error("Failed to load movie list");
      }
      return res.json();
    },
  });

  // SAFETY CHECK: Ensure 'data' is actually an array before using it
  const movies = Array.isArray(data) ? data : [];

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6">
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
        {/* Pass empty array if movies is null to prevent crash */}
        <MovieGrid movies={movies} searchQuery={searchQuery} />
      </main>
    </div>
  );
}
