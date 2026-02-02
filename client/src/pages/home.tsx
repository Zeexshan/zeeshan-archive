import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { MovieGrid } from "@/components/MovieGrid";
import { LoadingState } from "@/components/LoadingState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ArchiveItem } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("anime");

  const { data, isLoading, error } = useQuery<ArchiveItem[]>({
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
  const safeItems: ArchiveItem[] = Array.isArray(data) ? data : [];

  const filteredItems = safeItems.filter((item) => {
    const matchesCategory = item.category === category;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.customTitle && item.customTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6" data-testid="error-state">
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
        totalMovies={filteredItems.length}
      />
      
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Tabs value={category} onValueChange={setCategory} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="anime">Anime</TabsTrigger>
            <TabsTrigger value="j-horror">J-Horror</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6" data-testid="main-content">
        <MovieGrid items={filteredItems} searchQuery={searchQuery} />
      </main>
    </div>
  );
}
