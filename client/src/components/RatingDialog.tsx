import { useState, useEffect } from "react";
import { Star, Bookmark, Play, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { WatchStatus, TrackedMedia } from "@/hooks/useUserMedia";

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: string;
  mediaTitle: string;
  mediaPoster?: string | null;
  existingData: TrackedMedia | null;
  onSave: (mediaId: string, data: TrackedMedia) => Promise<boolean>;
  onDelete: (mediaId: string) => Promise<boolean>;
}

const statusOptions: Array<{
  value: WatchStatus;
  label: string;
  icon: typeof Bookmark;
  color: string;
  bgColor: string;
}> = [
  { value: "plan_to_watch", label: "Plan to Watch", icon: Bookmark, color: "text-blue-400", bgColor: "bg-blue-500" },
  { value: "watching", label: "Watching", icon: Play, color: "text-orange-400", bgColor: "bg-orange-500" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "text-green-400", bgColor: "bg-green-500" },
  { value: "dropped", label: "Dropped", icon: XCircle, color: "text-gray-400", bgColor: "bg-gray-500" },
];

const ratingLabels: Record<number, string> = {
  10: "Masterpiece",
  9: "Great",
  8: "Very Good",
  7: "Good",
  6: "Fine",
  5: "Average",
  4: "Below Average",
  3: "Poor",
  2: "Very Poor",
  1: "Awful",
};

export function RatingDialog({
  isOpen,
  onClose,
  mediaId,
  mediaTitle,
  mediaPoster,
  existingData,
  onSave,
  onDelete,
}: RatingDialogProps) {
  const [status, setStatus] = useState<WatchStatus>("plan_to_watch");
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [showRatingError, setShowRatingError] = useState(false);

  useEffect(() => {
    if (existingData) {
      setStatus(existingData.status);
      setRating(existingData.rating);
      setReview(existingData.review || "");
    } else {
      setStatus("plan_to_watch");
      setRating(null);
      setReview("");
    }
    setShowRatingError(false);
  }, [existingData, isOpen]);

  const handleSave = async () => {
    if (status === "completed" && rating === null) {
      setShowRatingError(true);
      return;
    }
    
    const data: TrackedMedia = {
      status,
      rating: status === "completed" ? rating : null,
      review,
      dateAdded: existingData?.dateAdded || new Date().toISOString().split("T")[0],
      dateCompleted: status === "completed" ? new Date().toISOString().split("T")[0] : null,
    };
    
    if (await onSave(mediaId, data)) {
      onClose();
    }
  };

  const handleDelete = async () => {
    if (await onDelete(mediaId)) {
      onClose();
    }
  };

  const handleStatusChange = (newStatus: WatchStatus) => {
    setStatus(newStatus);
    setShowRatingError(false);
  };

  const displayRating = hoverRating ?? rating;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden" data-testid="dialog-rating">
        <DialogHeader className="p-4 pb-2 flex flex-row items-start gap-3">
          {mediaPoster && (
            <img
              src={mediaPoster}
              alt={mediaTitle}
              className="w-16 h-24 object-cover rounded-md flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-lg leading-tight line-clamp-2" data-testid="dialog-title">
              {mediaTitle}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Track your progress and add ratings
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Watch Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = status === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    data-testid={`button-status-${option.value}`}
                    className={`flex items-center gap-2 p-2.5 rounded-md border-2 transition-all ${
                      isSelected
                        ? `${option.bgColor} border-transparent text-white`
                        : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={status !== "completed" ? "opacity-50 pointer-events-none" : ""}>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Rating {status !== "completed" && <span className="text-muted-foreground font-normal">(Complete to rate)</span>}
              {status === "completed" && <span className="text-destructive font-normal ml-1">*</span>}
            </label>
            <div className="flex items-center gap-1 mb-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => {
                    setRating(star);
                    setShowRatingError(false);
                  }}
                  data-testid={`button-star-${star}`}
                  className="p-0.5 transition-transform hover:scale-110"
                  disabled={status !== "completed"}
                >
                  <Star
                    className={`w-6 h-6 transition-colors ${
                      displayRating && star <= displayRating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{displayRating}/10</span>
                {" - "}
                {ratingLabels[displayRating]}
              </div>
            )}
            {showRatingError && (
              <div className="text-sm text-destructive mt-1" data-testid="rating-error">
                Please select a rating to mark as completed
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Personal Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value.slice(0, 500))}
              placeholder="Write your thoughts..."
              className="resize-none min-h-[80px]"
              data-testid="textarea-review"
            />
            <div className="text-xs text-muted-foreground text-right mt-1">
              {review.length}/500
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 pt-2 gap-2 flex-row">
          {existingData && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              data-testid="button-delete"
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            data-testid="button-save"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
