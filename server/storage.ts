import { type Movie, type InsertMovie } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

export interface IStorage {
  getMovies(): Promise<Movie[]>;
}

export class MemStorage implements IStorage {
  private moviesFilePath: string;

  constructor() {
    this.moviesFilePath = path.join(process.cwd(), "movies.json");
  }

  async getMovies(): Promise<Movie[]> {
    try {
      if (fs.existsSync(this.moviesFilePath)) {
        const data = fs.readFileSync(this.moviesFilePath, "utf-8");
        const rawMovies = JSON.parse(data);
        if (!Array.isArray(rawMovies)) {
          return [];
        }
        // Map raw JSON to Movie type (add id if missing)
        return rawMovies.map((m: InsertMovie, index: number) => ({
          id: `movie-${index}`,
          title: m.title,
          size: m.size,
          link: m.link,
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
