import { Film, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Movie } from "@shared/schema";

interface MovieCardProps {
  movie: Movie;
  index: number;
}

export function MovieCard({ movie, index }: MovieCardProps) {
  const safeId = `movie-${index}`;
  
  return (
    <div
      data-testid={`card-${safeId}`}
      className="movie-card-hover bg-card rounded-md flex flex-col group"
    >
      {/* Poster placeholder with film icon */}
      <div className="aspect-[2/3] bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-t-md flex items-center justify-center relative">
        <Film className="w-12 h-12 text-muted-foreground/40" data-testid={`icon-film-${safeId}`} />
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
      </div>

      {/* Content section */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Title */}
        <h3
          data-testid={`text-title-${safeId}`}
          className="font-semibold text-sm text-foreground line-clamp-2 leading-tight min-h-[2.5rem]"
          title={movie.title}
        >
          {movie.title}
        </h3>

        {/* File size */}
        <span
          data-testid={`text-size-${safeId}`}
          className="text-xs text-muted-foreground"
        >
          {movie.size}
        </span>

        {/* Watch button */}
        <a
          href={movie.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto"
          data-testid={`link-watch-${safeId}`}
        >
          <Button
            className="w-full gap-2"
            size="sm"
            data-testid={`button-watch-${safeId}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Watch on Telegram</span>
          </Button>
        </a>
      </div>
    </div>
  );
}
