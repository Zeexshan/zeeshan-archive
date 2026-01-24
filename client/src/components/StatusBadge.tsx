import { Bookmark, Play, CheckCircle, XCircle, Star } from "lucide-react";
import type { WatchStatus } from "@/hooks/useUserMedia";

interface StatusBadgeProps {
  status: WatchStatus;
  rating?: number | null;
  size?: "sm" | "md";
}

const statusConfig: Record<WatchStatus, { label: string; bgColor: string; icon: typeof Bookmark }> = {
  plan_to_watch: {
    label: "Plan to Watch",
    bgColor: "bg-blue-500/90",
    icon: Bookmark
  },
  watching: {
    label: "Watching",
    bgColor: "bg-orange-500/90",
    icon: Play
  },
  completed: {
    label: "Completed",
    bgColor: "bg-green-500/90",
    icon: CheckCircle
  },
  dropped: {
    label: "Dropped",
    bgColor: "bg-gray-500/90",
    icon: XCircle
  }
};

export function StatusBadge({ status, rating, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = size === "sm" 
    ? "px-1.5 py-0.5 text-[10px]" 
    : "px-2 py-1 text-xs";
  
  const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  if (status === "completed" && rating !== null && rating !== undefined) {
    return (
      <div
        className={`${config.bgColor} ${sizeClasses} rounded-md flex items-center gap-1 backdrop-blur-sm`}
        data-testid="badge-status"
      >
        <Star className={`${iconSize} text-yellow-300 fill-yellow-300`} />
        <span className="font-semibold text-white">{rating.toFixed(1)}</span>
      </div>
    );
  }

  return (
    <div
      className={`${config.bgColor} ${sizeClasses} rounded-md flex items-center gap-1 backdrop-blur-sm`}
      data-testid="badge-status"
    >
      <Icon className={`${iconSize} text-white`} />
      <span className="font-medium text-white whitespace-nowrap">
        {size === "sm" ? config.label.split(" ")[0] : config.label}
      </span>
    </div>
  );
}

export function getStatusLabel(status: WatchStatus): string {
  return statusConfig[status].label;
}

export function getStatusColor(status: WatchStatus): string {
  return statusConfig[status].bgColor;
}
