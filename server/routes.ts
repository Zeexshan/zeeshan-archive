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
    const { customTitle, customPoster, customOverview, tmdbLink } = req.body;

    try {
      const filePath = path.join(process.cwd(), "client/public/movies.json");
      const rootFilePath = path.join(process.cwd(), "movies.json");
      
      const data = await fs.readFile(filePath, "utf-8");
      const movies = JSON.parse(data);

      const movieIndex = movies.findIndex((m: any) => m.id === id);
      if (movieIndex === -1) {
        return res.status(404).json({ error: "Movie not found" });
      }

      let updatedData = {
        customTitle: customTitle || movies[movieIndex].customTitle,
        customPoster: customPoster || movies[movieIndex].customPoster,
        customOverview: customOverview || movies[movieIndex].customOverview,
      };

      if (tmdbLink) {
        try {
          const tmdbIdMatch = tmdbLink.match(/\/(movie|tv)\/(\d+)/);
          if (tmdbIdMatch) {
            const type = tmdbIdMatch[1];
            const tmdbId = tmdbIdMatch[2];
            const apiKey = process.env.TMDB_API_KEY;

            if (apiKey) {
              const tmdbRes = await fetch(
                `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}&language=en-US`
              );
              if (tmdbRes.ok) {
                const tmdbData: any = await tmdbRes.json();
                updatedData.customTitle = tmdbData.title || tmdbData.name;
                updatedData.customPoster = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
                updatedData.customOverview = tmdbData.overview;
              }
            }
          }
        } catch (tmdbError) {
          console.error("Error fetching TMDB data:", tmdbError);
        }
      }

      movies[movieIndex] = {
        ...movies[movieIndex],
        ...updatedData,
      };

      await fs.writeFile(filePath, JSON.stringify(movies, null, 2));
      
      // Also write to root movies.json if it exists to ensure persistence
      try {
        await fs.writeFile(rootFilePath, JSON.stringify(movies, null, 2));
      } catch (e) {
        console.error("Could not write to root movies.json");
      }

      res.json(movies[movieIndex]);
    } catch (error) {
      console.error("Error updating movie:", error);
      res.status(500).json({ error: "Failed to update movie" });
    }
  });

  return httpServer;
}
