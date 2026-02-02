import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database table (for potential future use)
export const movies = pgTable("movies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  size: text("size").notNull(),
  link: text("link").notNull(),
  poster: text("poster"),
  overview: text("overview"),
  rating: real("rating"),
  category: text("category").default("anime"),
  customTitle: text("custom_title"),
  customPoster: text("custom_poster"),
  customOverview: text("custom_overview"),
});

export const insertMovieSchema = createInsertSchema(movies).omit({
  id: true,
});

// Episode type - individual episode in a series
export interface Episode {
  title: string;
  episodeId: string; // e.g., "S01E01"
  size: string;
  link: string;
}

// Standalone Movie type
export interface Movie {
  type: "movie";
  id: string;
  title: string;
  size: string;
  link: string;
  poster: string | null;
  overview: string | null;
  rating: number | null;
  category?: string;
  customTitle?: string | null;
  customPoster?: string | null;
  customOverview?: string | null;
}

// Series type - contains multiple episodes
export interface Series {
  type: "series";
  id: string;
  title: string;
  poster: string | null;
  overview: string | null;
  rating: number | null;
  category?: string;
  customTitle?: string | null;
  customPoster?: string | null;
  customOverview?: string | null;
  episodeCount: number;
  episodes: Episode[];
}

// Union type for archive items
export type ArchiveItem = Movie | Series;

// Legacy types for backward compatibility
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type DbMovie = typeof movies.$inferSelect;

// Array schema for validation
export const moviesArraySchema = z.array(insertMovieSchema);
export type MoviesArray = z.infer<typeof moviesArraySchema>;
