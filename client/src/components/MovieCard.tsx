import { useState } from "react";
import { Film, ExternalLink, Star, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { RatingDialog } from "@/components/RatingDialog";
import { useUserMedia } from "@/hooks/useUserMedia";
import type { Movie } from "@shared/schema";

interface MovieCardProps {
  movie: Movie;
  index: number;
}

export function MovieCard({ movie, index }: MovieCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { getTrackedData, saveTrackedData, deleteTrackedData } = useUserMedia();
  
  const safeId = movie.id || `movie-${index}`;
  const trackedData = getTrackedData(safeId);
  
  return (
    <>
      <div
        data-testid={`card-${safeId}`}
        className="movie-card-hover bg-card rounded-md flex flex-col group"
      >
        <div className="aspect-[2/3] rounded-t-md relative overflow-hidden">
          {movie.poster ? (
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover"
              loading="lazy"
              data-testid={`img-poster-${safeId}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <Film className="w-12 h-12 text-muted-foreground/40" data-testid={`icon-film-${safeId}`} />
            </div>
          )}
          
          {/* TMDB Rating badge */}
          {movie.rating && movie.rating > 0 && (
            <div
              data-testid={`badge-rating-${safeId}`}
              className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1"
            >
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-medium text-white">{movie.rating.toFixed(1)}</span>
            </div>
          )}
          
          {/* User tracking status badge */}
          {trackedData && (
            <div className="absolute top-2 left-2" data-testid={`badge-tracking-${safeId}`}>
              <StatusBadge status={trackedData.status} rating={trackedData.rating} />
            </div>
          )}
          
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="p-3 flex flex-col gap-2 flex-1">
          <h3
            data-testid={`text-title-${safeId}`}
            className="font-semibold text-sm text-foreground line-clamp-2 leading-tight min-h-[2.5rem]"
            title={movie.title}
          >
            {movie.title}
          </h3>

          <span
            data-testid={`text-size-${safeId}`}
            className="text-xs text-muted-foreground"
          >
            {movie.size}
          </span>

          <div className="mt-auto flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => setIsDialogOpen(true)}
              data-testid={`button-track-${safeId}`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>{trackedData ? "Update" : "Track"}</span>
            </Button>
            
            <a
              href={movie.link}
              target="_blank"
              rel="noopener noreferrer"
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
      </div>

      <RatingDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        mediaId={safeId}
        mediaTitle={movie.title}
        mediaPoster={movie.poster}
        existingData={trackedData}
        onSave={saveTrackedData}
        onDelete={deleteTrackedData}
      />
    </>
  );
}
