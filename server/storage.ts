import { type ArchiveItem, type Movie, type Series } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

export interface IStorage {
  getItems(): Promise<ArchiveItem[]>;
}

export class MemStorage implements IStorage {
  private moviesFilePath: string;
  private publicMoviesFilePath: string;

  constructor() {
    this.moviesFilePath = path.join(process.cwd(), "movies.json");
    this.publicMoviesFilePath = path.join(process.cwd(), "client/public/movies.json");
  }

  async getItems(): Promise<ArchiveItem[]> {
    try {
      // Try public folder first, then root folder for backward compatibility
      let filePath = this.publicMoviesFilePath;
      if (!fs.existsSync(filePath)) {
        filePath = this.moviesFilePath;
      }
      
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        const rawItems = JSON.parse(data);
        
        if (!Array.isArray(rawItems)) {
          return [];
        }
        
        // Handle both new format (with type) and legacy format
        return rawItems.map((item: any, index: number) => {
          if (item.type === "series") {
            return item as Series;
          } else if (item.type === "movie") {
            return item as Movie;
          } else {
            // Legacy format - treat as movie
            return {
              type: "movie" as const,
              id: item.id || `movie-${index}`,
              title: item.title,
              size: item.size,
              link: item.link,
              poster: item.poster || null,
              overview: item.overview || null,
              rating: item.rating || null,
            } as Movie;
          }
        });
      }
      return [];
    } catch (error) {
      console.error("Error reading movies.json:", error);
      return [];
    }
  }
}

export const storage = new MemStorage();
