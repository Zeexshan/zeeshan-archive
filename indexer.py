#!/usr/bin/env python3
"""
Tele-Flix Smart Indexer (Stable ID Version)
-------------------------
1. Fixes "Peer id invalid" by syncing dialogs first.
2. Fixes TMDB Auth.
3. Cleans 'DD+', '2013', '6CH' and other noise properly.
4. Groups Series/Split-Movies automatically.
5. [NEW] Generates STABLE IDs so ratings don't shift when new movies are added.
"""

import os
import re
import json
import asyncio
import hashlib
import requests
from pyrogram import Client

# ---------------- CONFIGURATION ----------------
API_ID = os.environ.get("TELEGRAM_API_ID")
API_HASH = os.environ.get("TELEGRAM_API_HASH")
TMDB_API_KEY = os.environ.get("TMDB_API_KEY")

CHANNEL_ID = -1003686417406
CHANNEL_LINK_ID = "3686417406"
OUTPUT_FILE = "client/public/movies.json"

TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/multi"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
# -----------------------------------------------

def generate_stable_id(title: str) -> str:
    """
    Creates a unique, stable ID from the title.
    Example: "Iron Man" -> "id-iron-man-a1b2"
    """
    # Create a clean slug
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', title.lower()).strip('-')
    # Add a short hash of the full title to prevent collisions
    hash_suffix = hashlib.md5(title.encode()).hexdigest()[:6]
    return f"id-{slug}-{hash_suffix}"

def clean_title_for_search(filename: str) -> tuple:
    """Uses Year Anchor strategy to extract title from filename."""
    name = re.sub(r'\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v)$', '', filename, flags=re.IGNORECASE)
    name = re.sub(r'[_\.\-\s]?(part|pt|cd|disc)\s*\d+', '', name, flags=re.IGNORECASE)
    
    episode_match = re.search(r'[.\s_-](S\d+E\d+|S\d+|E\d+|Episode\s*\d+)', name, re.IGNORECASE)
    if episode_match:
        name = name[:episode_match.start()]
    
    year_match = re.search(r'[\.\s_\-\(\[]?(19[2-9]\d|20[0-2]\d)[\.\s_\-\)\]]?', name)
    
    if year_match:
        title_part = name[:year_match.start()]
        year = year_match.group(0).strip('._-()[] ')
        title_part = title_part.replace('.', ' ').replace('_', ' ').replace('-', ' ')
        title_part = re.sub(r'\s+', ' ', title_part).strip()
        if title_part:
            return (title_part, year)
    
    name = re.sub(r'\[.*?\]', '', name)
    name = re.sub(r'\(.*?\)', '', name)
    name = name.replace('.', ' ').replace('_', ' ').replace('-', ' ')
    name = re.sub(r'\s+', ' ', name).strip()
    return (name, None)

def get_tmdb_metadata(title: str, year: str = None):
    """Query TMDB for poster, overview, and rating."""
    if not TMDB_API_KEY:
        return None, None, 0

    def do_search(query: str, search_year: str = None):
        params = {
            "api_key": TMDB_API_KEY,
            "query": query,
            "include_adult": "false",
            "language": "en-US"
        }
        if search_year: params["year"] = search_year
        try:
            response = requests.get(TMDB_SEARCH_URL, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("results"): return data["results"][0]
        except: pass
        return None

    def extract_result(result):
        poster_path = result.get("poster_path")
        full_poster = f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else None
        return full_poster, result.get("overview"), result.get("vote_average")

    if year:
        result = do_search(title, year)
        if result: return extract_result(result)
    
    result = do_search(title)
    if result: return extract_result(result)
    
    return None, None, 0

def format_file_size(size_bytes: int) -> str:
    if size_bytes < 0: return "Unknown"
    if size_bytes >= 1024**3: return f"{size_bytes / (1024**3):.1f} GB"
    return f"{size_bytes / (1024**2):.1f} MB"

async def scan_channel():
    if not API_ID or not API_HASH:
        print("Error: TELEGRAM credentials missing.")
        return

    print("Connecting to Telegram...")
    session_string = os.environ.get("TELEGRAM_SESSION_STRING")

    if session_string:
        app = Client("tele_flix_session", api_id=int(API_ID), api_hash=API_HASH, session_string=session_string, in_memory=True)
    else:
        app = Client("tele_flix_session", api_id=int(API_ID), api_hash=API_HASH, workdir=".")

    grouped_content = {}
    tmdb_cache = {}

    async with app:
        print("Connected! Syncing dialogs...")
        try:
            async for dialog in app.get_dialogs(): pass
        except: pass

        print("Scanning channel...")
        async for message in app.get_chat_history(CHANNEL_ID):
            if not message.media: continue

            file_name = None
            file_size = 0
            if message.video:
                file_name = message.video.file_name
                file_size = message.video.file_size
            elif message.document:
                file_name = message.document.file_name
                file_size = message.document.file_size

            if not file_name: continue

            title, year = clean_title_for_search(file_name)
            group_key = title

            # --- NEW STABLE ID GENERATION ---
            # We generate the ID based on the Title, not the order.
            stable_id = generate_stable_id(title)

            if group_key not in tmdb_cache:
                print(f"Searching: '{title}'" + (f" ({year})" if year else ""))
                tmdb_cache[group_key] = get_tmdb_metadata(title, year)

            poster, overview, rating = tmdb_cache[group_key]

            episode_data = {
                "title": file_name, 
                "episodeId": file_name, 
                "size": format_file_size(file_size or 0),
                "link": f"https://t.me/c/{CHANNEL_LINK_ID}/{message.id}"
            }

            if group_key in grouped_content:
                grouped_content[group_key]["episodes"].append(episode_data)
                grouped_content[group_key]["type"] = "series"
            else:
                grouped_content[group_key] = {
                    "type": "movie",
                    "id": stable_id,  # <--- USES STABLE ID NOW
                    "title": title,
                    "poster": poster,
                    "overview": overview,
                    "rating": rating,
                    "episodes": [episode_data]
                }

    final_list = []
    for title, data in grouped_content.items():
        if len(data["episodes"]) > 1:
            data["type"] = "series"
            data["episodeCount"] = len(data["episodes"])
            data["episodes"].sort(key=lambda x: x['title'])
            final_list.append(data)
        else:
            single_ep = data["episodes"][0]
            movie_obj = {
                "type": "movie",
                "id": data["id"],
                "title": data["title"],
                "size": single_ep["size"],
                "link": single_ep["link"],
                "poster": data["poster"],
                "overview": data["overview"],
                "rating": data["rating"]
            }
            final_list.append(movie_obj)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)

    print(f"\n🎉 Saved {len(final_list)} items to {OUTPUT_FILE} (Stable IDs Active)")

if __name__ == "__main__":
    asyncio.run(scan_channel())
