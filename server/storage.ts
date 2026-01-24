import { type Movie, type InsertMovie } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

export interface IStorage {
  getMovies(): Promise<Movie[]>;
}

export class MemStorage implements IStorage {
  private moviesFilePath: string;
  private publicMoviesFilePath: string;

  constructor() {
    this.moviesFilePath = path.join(process.cwd(), "movies.json");
    this.publicMoviesFilePath = path.join(process.cwd(), "client/public/movies.json");
  }

  async getMovies(): Promise<Movie[]> {
    try {
      // Try public folder first, then root folder for backward compatibility
      let filePath = this.publicMoviesFilePath;
      if (!fs.existsSync(filePath)) {
        filePath = this.moviesFilePath;
      }
      
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        const rawMovies = JSON.parse(data);
        if (!Array.isArray(rawMovies)) {
          return [];
        }
        // Map raw JSON to Movie type (add id if missing, include optional fields)
        return rawMovies.map((m: InsertMovie, index: number) => ({
          id: `movie-${index}`,
          title: m.title,
          size: m.size,
          link: m.link,
          poster: m.poster || null,
          overview: m.overview || null,
          rating: m.rating || null,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error reading movies.json:", error);
      return [];
    }
  }
}

export const storage = new MemStorage();
