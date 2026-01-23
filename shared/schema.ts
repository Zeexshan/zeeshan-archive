import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Movies table for the Telegram archive
export const movies = pgTable("movies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  size: text("size").notNull(),
  link: text("link").notNull(),
});

export const insertMovieSchema = createInsertSchema(movies).omit({
  id: true,
});

export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type Movie = typeof movies.$inferSelect;

// Array schema for validation
export const moviesArraySchema = z.array(insertMovieSchema);
export type MoviesArray = z.infer<typeof moviesArraySchema>;
