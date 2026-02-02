import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs/promises";
import path from "path";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // API endpoint to get all archive items (movies and series)
  app.get("/api/movies", async (_req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // Admin endpoint to save overrides for a movie
  app.patch("/api/movies/:id", async (req, res) => {
    const { id } = req.params;
    const { customTitle, customPoster, customOverview } = req.body;

    try {
      const filePath = path.join(process.cwd(), "client/public/movies.json");
      const data = await fs.readFile(filePath, "utf-8");
      const movies = JSON.parse(data);

      const movieIndex = movies.findIndex((m: any) => m.id === id);
      if (movieIndex === -1) {
        return res.status(404).json({ error: "Movie not found" });
      }

      movies[movieIndex] = {
        ...movies[movieIndex],
        customTitle: customTitle || movies[movieIndex].customTitle,
        customPoster: customPoster || movies[movieIndex].customPoster,
        customOverview: customOverview || movies[movieIndex].customOverview,
      };

      await fs.writeFile(filePath, JSON.stringify(movies, null, 2));
      res.json(movies[movieIndex]);
    } catch (error) {
      console.error("Error updating movie:", error);
      res.status(500).json({ error: "Failed to update movie" });
    }
  });

  return httpServer;
}
