import { useState } from "react";
import { Folder, Star, Play, ExternalLink, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/StatusBadge";
import { RatingDialog } from "@/components/RatingDialog";
import { useUserMedia } from "@/hooks/useUserMedia";
import type { Series } from "@shared/schema";

interface SeriesCardProps {
  series: Series;
  index: number;
}

export function SeriesCard({ series, index }: SeriesCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const { getTrackedData, saveTrackedData, deleteTrackedData } = useUserMedia();
  
  const safeId = series.id || `series-${index}`;
  const trackedData = getTrackedData(safeId);

  return (
    <>
      <div
        data-testid={`card-${safeId}`}
        className="movie-card-hover bg-card rounded-md flex flex-col group cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <div className="aspect-[2/3] rounded-t-md relative overflow-hidden">
          <div className="absolute inset-0 translate-x-1 -translate-y-1 bg-zinc-700/50 rounded-t-md" />
          <div className="absolute inset-0 translate-x-0.5 -translate-y-0.5 bg-zinc-600/50 rounded-t-md" />
          
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-t-md overflow-hidden">
            {series.poster ? (
              <img
                src={series.poster}
                alt={series.title}
                className="w-full h-full object-cover"
                loading="lazy"
                data-testid={`img-poster-${safeId}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Folder className="w-12 h-12 text-muted-foreground/40" data-testid={`icon-folder-${safeId}`} />
              </div>
            )}
          </div>
          
          {/* TMDB Rating badge */}
          {series.rating && series.rating > 0 && (
            <div
              data-testid={`badge-rating-${safeId}`}
              className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 z-10"
            >
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-medium text-white">{series.rating.toFixed(1)}</span>
            </div>
          )}
          
          {/* User tracking status badge */}
          {trackedData && (
            <div className="absolute top-2 left-2 z-10" data-testid={`badge-tracking-${safeId}`}>
              <StatusBadge status={trackedData.status} rating={trackedData.rating} />
            </div>
          )}
          
          <div
            data-testid={`badge-episodes-${safeId}`}
            className="absolute bottom-2 left-2 bg-primary/90 backdrop-blur-sm px-2 py-1 rounded-md z-10"
          >
            <span className="text-xs font-semibold text-primary-foreground">
              {series.episodeCount} {series.episodeCount === 1 ? 'Episode' : 'Episodes'}
            </span>
          </div>
          
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent z-[5]" />
        </div>

        <div className="p-3 flex flex-col gap-2 flex-1">
          <h3
            data-testid={`text-title-${safeId}`}
            className="font-semibold text-sm text-foreground line-clamp-2 leading-tight min-h-[2.5rem]"
            title={series.title}
          >
            {series.title}
          </h3>

          <span
            data-testid={`text-type-${safeId}`}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            <Folder className="w-3 h-3" />
            Series
          </span>

          <div className="mt-auto flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={(e) => {
                e.stopPropagation();
                setIsRatingOpen(true);
              }}
              data-testid={`button-track-${safeId}`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>{trackedData ? "Update" : "Track"}</span>
            </Button>
            
            <Button
              className="w-full gap-2"
              size="sm"
              data-testid={`button-view-${safeId}`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>View Episodes</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Episodes Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] p-0 overflow-hidden" data-testid={`dialog-${safeId}`}>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2" data-testid={`dialog-title-${safeId}`}>
              <Folder className="w-5 h-5 text-primary" />
              {series.title}
            </DialogTitle>
          </DialogHeader>
          
          {series.overview && (
            <p className="px-4 text-sm text-muted-foreground line-clamp-3" data-testid={`dialog-overview-${safeId}`}>
              {series.overview}
            </p>
          )}
          
          <ScrollArea className="max-h-[50vh] px-4 pb-4">
            <div className="space-y-2">
              {series.episodes.map((episode, episodeIndex) => (
                <a
                  key={`${episode.episodeId}-${episodeIndex}`}
                  href={episode.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`link-episode-${safeId}-${episodeIndex}`}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover-elevate transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {episode.episodeId}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate" data-testid={`text-episode-title-${safeId}-${episodeIndex}`}>
                        {episode.title}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid={`text-episode-size-${safeId}-${episodeIndex}`}>
                      {episode.size}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                </a>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <RatingDialog
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        mediaId={safeId}
        mediaTitle={series.title}
        mediaPoster={series.poster}
        existingData={trackedData}
        onSave={saveTrackedData}
        onDelete={deleteTrackedData}
      />
    </>
  );
}
