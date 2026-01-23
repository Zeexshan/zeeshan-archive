import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-4 mb-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="max-w-2xl mx-auto">
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      </header>

      {/* Grid skeleton */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="aspect-[2/3] rounded-t-md" />
              <div className="p-3 bg-card rounded-b-md space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
