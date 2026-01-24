import { Search, Film } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalMovies?: number;
}

export function Header({ searchQuery, onSearchChange, totalMovies = 0 }: HeaderProps) {
  // SAFETY CHECK: Ensure totalMovies is a valid number
  const safeTotal = typeof totalMovies === "number" && !isNaN(totalMovies) ? totalMovies : 0;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Logo and title */}
        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-primary" data-testid="icon-logo" />
            <h1
              data-testid="text-logo"
              className="text-2xl md:text-3xl font-bold tracking-tight"
            >
              <span className="text-primary">Zeeshan</span>
              <span className="text-foreground"> Archive</span>
            </h1>
          </div>
          {safeTotal > 0 && (
            <p
              data-testid="text-movie-count"
              className="text-sm text-muted-foreground"
            >
              {safeTotal} {safeTotal === 1 ? 'title' : 'titles'} available
            </p>
          )}
        </div>

        {/* Search bar */}
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
