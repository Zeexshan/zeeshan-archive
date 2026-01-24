import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Trophy, Star, ArrowLeft, Download, Upload, Grid, List, 
  Filter, ChevronDown, Film, Folder, Eye, Bookmark, XCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserMedia, type WatchStatus } from "@/hooks/useUserMedia";
import { StatusBadge, getStatusLabel } from "@/components/StatusBadge";
import type { ArchiveItem } from "@shared/schema";

type SortOption = "rating_desc" | "rating_asc" | "recent" | "alpha";
type FilterOption = "all" | "high" | "medium" | "low";
type ViewMode = "list" | "grid";
type TabOption = "rankings" | "plan_to_watch" | "watching" | "dropped";

const rankColors: Record<number, string> = {
  1: "bg-gradient-to-r from-yellow-500 to-yellow-600",
  2: "bg-gradient-to-r from-gray-300 to-gray-400",
  3: "bg-gradient-to-r from-orange-600 to-orange-700",
};

export default function Rankings() {
  const [sortBy, setSortBy] = useState<SortOption>("rating_desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState<TabOption>("rankings");
  
  const { 
    getCompletedMedia, 
    getMediaByStatus, 
    getStats, 
    exportData, 
    importData,
    isAvailable 
  } = useUserMedia();

  const { data: archiveItems } = useQuery<ArchiveItem[]>({
    queryKey: ["/movies.json"],
    queryFn: async () => {
      const res = await fetch("/movies.json");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const itemsMap = useMemo(() => {
    const map = new Map<string, ArchiveItem>();
    if (archiveItems) {
      archiveItems.forEach(item => map.set(item.id, item));
    }
    return map;
  }, [archiveItems]);

  const stats = getStats();

  const completedMedia = useMemo(() => {
    let items = getCompletedMedia();
    
    if (filterBy === "high") items = items.filter(i => (i.data.rating || 0) >= 8);
    else if (filterBy === "medium") items = items.filter(i => (i.data.rating || 0) >= 5 && (i.data.rating || 0) < 8);
    else if (filterBy === "low") items = items.filter(i => (i.data.rating || 0) < 5);

    if (sortBy === "rating_asc") items = [...items].sort((a, b) => (a.data.rating || 0) - (b.data.rating || 0));
    else if (sortBy === "alpha") items = [...items].sort((a, b) => {
      const itemA = itemsMap.get(a.id);
      const itemB = itemsMap.get(b.id);
      return (itemA?.title || "").localeCompare(itemB?.title || "");
    });
    else if (sortBy === "recent") items = [...items].sort((a, b) => 
      (b.data.dateCompleted || "").localeCompare(a.data.dateCompleted || "")
    );

    return items;
  }, [getCompletedMedia, filterBy, sortBy, itemsMap]);

  const getListByStatus = (status: WatchStatus) => getMediaByStatus(status);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tele-flix-tracking-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          if (importData(content)) {
            window.location.reload();
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const tabs = [
    { id: "rankings" as TabOption, label: "Rankings", icon: Trophy, count: stats.completed },
    { id: "plan_to_watch" as TabOption, label: "Plan to Watch", icon: Bookmark, count: stats.planToWatch },
    { id: "watching" as TabOption, label: "Watching", icon: Eye, count: stats.watching },
    { id: "dropped" as TabOption, label: "Dropped", icon: XCircle, count: stats.dropped },
  ];

  const renderRankingsList = () => {
    if (completedMedia.length === 0) {
      return (
        <div className="text-center py-16" data-testid="empty-rankings">
          <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Your Rankings Board is Empty!</h2>
          <p className="text-muted-foreground mb-6">
            Start tracking and rating your completed anime to build your personal top list.
          </p>
          <Link href="/">
            <Button data-testid="button-go-catalog">Go to Catalog</Button>
          </Link>
        </div>
      );
    }

    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {completedMedia.map((entry, index) => {
            const item = itemsMap.get(entry.id);
            if (!item) return null;
            
            const rank = index + 1;
            const bgColor = rankColors[rank] || (rank <= 10 ? "bg-blue-600" : "bg-zinc-600");
            
            return (
              <div
                key={entry.id}
                className="relative bg-card rounded-md overflow-hidden"
                data-testid={`ranking-card-${rank}`}
              >
                <div className={`absolute top-2 left-2 z-10 w-8 h-8 ${bgColor} rounded-md flex items-center justify-center`}>
                  <span className="text-white font-bold text-sm">{rank}</span>
                </div>
                <div className="aspect-[2/3]">
                  {item.poster ? (
                    <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      {item.type === "series" ? <Folder className="w-8 h-8 text-zinc-600" /> : <Film className="w-8 h-8 text-zinc-600" />}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-sm font-medium line-clamp-1">{item.title}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-medium">{entry.data.rating}/10</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {completedMedia.map((entry, index) => {
          const item = itemsMap.get(entry.id);
          if (!item) return null;
          
          const rank = index + 1;
          const bgColor = rankColors[rank] || (rank <= 10 ? "bg-blue-600" : "bg-zinc-600");
          const percentile = Math.round((1 - rank / completedMedia.length) * 100);
          
          return (
            <div
              key={entry.id}
              className="flex items-center gap-4 p-3 bg-card rounded-md hover-elevate"
              data-testid={`ranking-row-${rank}`}
            >
              <div className={`w-12 h-12 ${bgColor} rounded-md flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold text-lg">{rank}</span>
              </div>
              
              {item.poster ? (
                <img src={item.poster} alt={item.title} className="w-12 h-16 object-cover rounded-md flex-shrink-0" />
              ) : (
                <div className="w-12 h-16 bg-zinc-800 rounded-md flex items-center justify-center flex-shrink-0">
                  {item.type === "series" ? <Folder className="w-5 h-5 text-zinc-600" /> : <Film className="w-5 h-5 text-zinc-600" />}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground line-clamp-1">{item.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.type === "series" ? "Series" : "Movie"}
                  </Badge>
                  {entry.data.review && (
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      "{entry.data.review.slice(0, 50)}..."
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-lg font-bold">{entry.data.rating}</span>
                  <span className="text-muted-foreground">/10</span>
                </div>
                <span className="text-xs text-muted-foreground">Top {percentile}%</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStatusList = (status: WatchStatus) => {
    const items = getListByStatus(status);
    
    if (items.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No items in this list yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((entry) => {
          const item = itemsMap.get(entry.id);
          if (!item) return null;
          
          return (
            <div
              key={entry.id}
              className="flex items-center gap-4 p-3 bg-card rounded-md hover-elevate"
            >
              {item.poster ? (
                <img src={item.poster} alt={item.title} className="w-12 h-16 object-cover rounded-md flex-shrink-0" />
              ) : (
                <div className="w-12 h-16 bg-zinc-800 rounded-md flex items-center justify-center flex-shrink-0">
                  {item.type === "series" ? <Folder className="w-5 h-5 text-zinc-600" /> : <Film className="w-5 h-5 text-zinc-600" />}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground line-clamp-1">{item.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.type === "series" ? "Series" : "Movie"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Added {entry.data.dateAdded}
                  </span>
                </div>
              </div>
              
              <StatusBadge status={entry.data.status} size="md" />
            </div>
          );
        })}
      </div>
    );
  };

  if (!isAvailable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Storage Unavailable</h2>
          <p className="text-muted-foreground">
            Tracking features require localStorage which is not available in your browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-rankings">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  My Rankings
                </h1>
                <p className="text-sm text-muted-foreground">
                  {stats.completed} completed | Avg: {stats.averageRating.toFixed(1)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleImport} data-testid="button-import">
                <Upload className="w-4 h-4 mr-1" />
                Import
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="gap-2"
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <Badge variant="secondary" className="ml-1">{tab.count}</Badge>
              </Button>
            );
          })}
        </div>

        {activeTab === "rankings" && (
          <>
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-sort">
                      Sort <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSortBy("rating_desc")}>Rating (High to Low)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("rating_asc")}>Rating (Low to High)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("recent")}>Recently Completed</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("alpha")}>Alphabetical</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-filter">
                      <Filter className="w-4 h-4 mr-1" /> Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setFilterBy("all")}>All Ratings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterBy("high")}>8+ (Great)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterBy("medium")}>5-7 (Average)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterBy("low")}>Below 5 (Poor)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {renderRankingsList()}
          </>
        )}

        {activeTab === "plan_to_watch" && renderStatusList("plan_to_watch")}
        {activeTab === "watching" && renderStatusList("watching")}
        {activeTab === "dropped" && renderStatusList("dropped")}
      </main>
    </div>
  );
}
