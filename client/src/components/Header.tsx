import { Link } from "wouter";
import { Search, Film, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserMedia } from "@/hooks/useUserMedia";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalMovies?: number;
}

export function Header({ searchQuery, onSearchChange, totalMovies = 0 }: HeaderProps) {
  const { getStats } = useUserMedia();
  const stats = getStats();
  
  const safeTotal = typeof totalMovies === "number" && !isNaN(totalMovies) ? totalMovies : 0;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-primary" data-testid="icon-logo" />
            <div>
              <h1
                data-testid="text-logo"
                className="text-xl md:text-2xl font-bold tracking-tight"
              >
                <span className="text-primary">Zeeshan</span>
                <span className="text-foreground"> Archive</span>
              </h1>
              {safeTotal > 0 && (
                <p
                  data-testid="text-movie-count"
                  className="text-xs text-muted-foreground"
                >
                  {safeTotal} {safeTotal === 1 ? 'title' : 'titles'} available
                </p>
              )}
            </div>
          </div>
          
          <Link href="/rankings">
            <Button variant="outline" className="gap-2" data-testid="button-rankings">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="hidden sm:inline">My Rankings</span>
              {stats.total > 0 && (
                <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {stats.total}
                </span>
              )}
            </Button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" data-testid="icon-search" />
            <Input
              type="search"
              data-testid="input-search"
              placeholder="Search movies and series..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-card border-input text-base placeholder:text-muted-foreground focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
