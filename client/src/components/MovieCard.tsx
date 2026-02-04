import { useState } from "react";
import { Film, ExternalLink, Star, ListPlus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { RatingDialog } from "@/components/RatingDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserMedia } from "@/hooks/useUserMedia";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Movie } from "@shared/schema";

interface MovieCardProps {
  movie: Movie;
  index: number;
}

export function MovieCard({ movie, index }: MovieCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState(movie.customTitle || "");
  const [customPoster, setCustomPoster] = useState(movie.customPoster || "");

  const { getTrackedData, saveTrackedData, deleteTrackedData } = useUserMedia();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const safeId = movie.id || `movie-${index}`;
  const trackedData = getTrackedData(safeId);

  const currentUser = localStorage
    .getItem("teleflix_user")
    ?.toLowerCase()
    .trim();
  const isAdmin = currentUser === "zeeshan";

  const displayTitle = movie.customTitle || movie.title;
  const displayPoster = movie.customPoster || movie.poster;

  const updateMutation = useMutation({
    mutationFn: async (data: {
      customTitle: string;
      customPoster: string;
      customOverview: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/movies/${movie.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/movies.json"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Updated",
        description: "Movie information updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update movie information.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <div
        data-testid={`card-${safeId}`}
        className="movie-card-hover bg-card rounded-md flex flex-col group"
      >
        <div className="aspect-[2/3] rounded-t-md relative overflow-hidden">
          {displayPoster ? (
            <img
              src={displayPoster}
              alt={displayTitle}
              className="w-full h-full object-cover"
              loading="lazy"
              data-testid={`img-poster-${safeId}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <Film
                className="w-12 h-12 text-muted-foreground/40"
                data-testid={`icon-film-${safeId}`}
              />
            </div>
          )}

          {/* TMDB Rating badge */}
          {movie.rating && movie.rating > 0 && (
            <div
              data-testid={`badge-rating-${safeId}`}
              className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1"
            >
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-medium text-white">
                {movie.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* User tracking status badge */}
          {trackedData && (
            <div
              className="absolute top-2 left-2"
              data-testid={`badge-tracking-${safeId}`}
            >
              <StatusBadge
                status={trackedData.status}
                rating={trackedData.rating}
              />
            </div>
          )}

          {/* Admin Edit Button - Visible to everyone for now */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-12 h-8 px-2 bg-zinc-900 text-white shadow-lg border border-zinc-700 z-20 font-bold text-[10px]"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditDialogOpen(true);
            }}
          >
            <Edit className="h-3 w-3 mr-1" />
            EDIT
          </Button>

          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="p-2 sm:p-3 flex flex-col gap-1.5 sm:gap-2 flex-1">
          <h3
            data-testid={`text-title-${safeId}`}
            className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2 leading-tight min-h-[2rem] sm:min-h-[2.5rem]"
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          <span
            data-testid={`text-size-${safeId}`}
            className="text-[10px] sm:text-xs text-muted-foreground"
          >
            {movie.size}
          </span>

          <div className="mt-auto flex flex-col gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 sm:gap-2 h-8 sm:h-9 text-[10px] sm:text-xs"
              onClick={() => setIsDialogOpen(true)}
              data-testid={`button-track-${safeId}`}
            >
              <ListPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{trackedData ? "Update" : "Track"}</span>
            </Button>

            <a
              href={movie.link}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-watch-${safeId}`}
              className="w-full"
            >
              <Button
                className="w-full gap-1.5 sm:gap-2 h-8 sm:h-9 text-[10px] sm:text-xs"
                size="sm"
                data-testid={`button-watch-${safeId}`}
              >
                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Telegram</span>
              </Button>
            </a>
          </div>
        </div>
      </div>

      <RatingDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        mediaId={safeId}
        mediaTitle={displayTitle}
        mediaPoster={displayPoster}
        existingData={trackedData}
        onSave={saveTrackedData}
        onDelete={deleteTrackedData}
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Movie Information</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Custom Title</Label>
              <Input
                id="title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter custom title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="poster">Custom Poster URL</Label>
              <Input
                id="poster"
                value={customPoster}
                onChange={(e) => setCustomPoster(e.target.value)}
                placeholder="Paste TMDB poster URL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateMutation.mutate({
                  customTitle,
                  customPoster,
                  customOverview: movie.customOverview || "",
                })
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
