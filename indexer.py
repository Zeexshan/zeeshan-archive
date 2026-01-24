#!/usr/bin/env python3
"""
Tele-Flix Smart Indexer (Final Fixed Version)
-------------------------
1. Fixes "Peer id invalid" by syncing dialogs first.
2. Fixes TMDB Auth (Works with short API Keys).
3. Cleans 'DD+', '2013', '6CH' and other noise properly.
4. Groups Series/Split-Movies automatically.
"""

import os
import re
import json
import asyncio
import requests
from pyrogram import Client
from pyrogram.enums import MessageMediaType

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

def clean_title_for_search(filename: str) -> tuple:
    """
    Uses Year Anchor strategy to extract title from filename.
    Returns (title, year) tuple. Year may be None.
    
    Strategy:
    1. Find 4-digit year (1920-2029) in filename
    2. Everything BEFORE the year = Movie Title
    3. Everything AFTER the year = Technical metadata (discard)
    4. If no year found, use fallback cleaning
    """
    # 1. Remove file extension
    name = re.sub(r'\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v)$', '', filename, flags=re.IGNORECASE)
    
    # 2. Remove "Part/CD/Disc" suffixes first (for split files)
    name = re.sub(r'[_\.\-\s]?(part|pt|cd|disc)\s*\d+', '', name, flags=re.IGNORECASE)
    
    # 3. Handle Season/Episode info - extract series name before it
    episode_match = re.search(r'[.\s_-](S\d+E\d+|S\d+|E\d+|Episode\s*\d+)', name, re.IGNORECASE)
    if episode_match:
        name = name[:episode_match.start()]
    
    # 4. YEAR ANCHOR STRATEGY: Find year pattern (1920-2029)
    # Match year that's separated by dots, spaces, underscores, or brackets
    year_match = re.search(r'[\.\s_\-\(\[]?(19[2-9]\d|20[0-2]\d)[\.\s_\-\)\]]?', name)
    
    if year_match:
        # Extract title (everything before year) and year
        title_part = name[:year_match.start()]
        year = year_match.group(0).strip('._-()[] ')
        
        # Clean the title
        title_part = title_part.replace('.', ' ').replace('_', ' ').replace('-', ' ')
        title_part = re.sub(r'\s+', ' ', title_part).strip()
        
        if title_part:
            return (title_part, year)
    
    # 5. FALLBACK: No year found - do basic cleanup
    # Remove brackets content
    name = re.sub(r'\[.*?\]', '', name)
    name = re.sub(r'\(.*?\)', '', name)
    
    # Replace separators with spaces
    name = name.replace('.', ' ').replace('_', ' ').replace('-', ' ')
    name = re.sub(r'\s+', ' ', name).strip()
    
    return (name, None)


def clean_title_fallback(title: str) -> str:
    """
    Fallback cleaning when Year Anchor doesn't work.
    Iteratively strips common suffixes from the end.
    """
    # Common technical suffixes that appear at the end
    suffixes = [
        r'\s*(2160p|1080p|720p|480p|4K|UHD|HD|SD)\s*$',
        r'\s*(BluRay|WEB-DL|WEBRip|HDTV|DVDRip|BDRip|HDRip)\s*$',
        r'\s*(x265|x264|HEVC|H265|H264|AVC)\s*$',
        r'\s*(AAC|AC3|DTS|DD\+|DDP|TrueHD|Atmos)\s*$',
        r'\s*\d+CH\s*$',
        r'\s*(Multi Audio|Dual Audio|ESub)\s*$',
        r'\s*[A-Z]{2,}\s*$',  # Release group names like "RARBG", "YTS"
    ]
    
    cleaned = title
    changed = True
    
    while changed:
        changed = False
        for suffix in suffixes:
            new_cleaned = re.sub(suffix, '', cleaned, flags=re.IGNORECASE).strip()
            if new_cleaned != cleaned:
                cleaned = new_cleaned
                changed = True
                break
    
    return cleaned if cleaned else title

def get_tmdb_metadata(title: str, year: str = None):
    """
    Query TMDB for poster, overview, and rating.
    Uses Year Anchor strategy:
    1. Try "Title Year" search first
    2. Fallback to just "Title"
    3. If still no results, try fallback cleaning
    """
    if not TMDB_API_KEY:
        print("  TMDB_API_KEY missing! Skipping.")
        return None, None, 0

    def do_search(query: str, search_year: str = None):
        """Execute a single TMDB search."""
        params = {
            "api_key": TMDB_API_KEY,
            "query": query,
            "include_adult": "false",
            "language": "en-US"
        }
        if search_year:
            params["year"] = search_year
        
        try:
            response = requests.get(TMDB_SEARCH_URL, params=params, timeout=5)
            if response.status_code == 401:
                print("  Error: TMDB API Key is Invalid")
                return None
            data = response.json()
            if data.get("results"):
                return data["results"][0]
        except Exception as e:
            print(f"  Connection Error: {e}")
        return None

    def extract_result(result):
        """Extract metadata from TMDB result."""
        title_found = result.get('name') or result.get('title')
        print(f"  TMDB Found: {title_found}")
        poster_path = result.get("poster_path")
        full_poster = f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else None
        return full_poster, result.get("overview"), result.get("vote_average")

    # Strategy 1: Search with Title + Year (most accurate)
    if year:
        print(f"  Trying: '{title}' ({year})")
        result = do_search(title, year)
        if result:
            return extract_result(result)
    
    # Strategy 2: Search with just Title
    print(f"  Trying: '{title}'")
    result = do_search(title)
    if result:
        return extract_result(result)
    
    # Strategy 3: Fallback cleaning and retry
    cleaned_title = clean_title_fallback(title)
    if cleaned_title != title:
        print(f"  Trying fallback: '{cleaned_title}'")
        result = do_search(cleaned_title)
        if result:
            return extract_result(result)
    
    print(f"  TMDB Not Found for: '{title}'")
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

    # Data structures
    grouped_content = {}
    tmdb_cache = {}

    async with app:
        print("Connected!")

        # --- CRITICAL FIX: SYNC DIALOGS TO FIND PEER ID ---
        print("Syncing dialogs to cache peer IDs...")
        try:
            async for dialog in app.get_dialogs():
                pass # Just iterating populates the cache
            print("Dialogs synced. Scanning channel...")
        except Exception as e:
            print(f"Warning during sync: {e}")
        # --------------------------------------------------

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

            # 1. Clean Title using Year Anchor strategy
            title, year = clean_title_for_search(file_name)
            
            # Use title as grouping key
            group_key = title

            # 2. Fetch Metadata (with year for better accuracy)
            if group_key not in tmdb_cache:
                print(f"Searching: '{title}'" + (f" ({year})" if year else ""))
                tmdb_cache[group_key] = get_tmdb_metadata(title, year)

            poster, overview, rating = tmdb_cache[group_key]

            # 3. Create Item
            episode_data = {
                "title": file_name, 
                "episodeId": file_name, 
                "size": format_file_size(file_size or 0),
                "link": f"https://t.me/c/{CHANNEL_LINK_ID}/{message.id}"
            }

            # 4. Grouping by cleaned title
            if group_key in grouped_content:
                grouped_content[group_key]["episodes"].append(episode_data)
                grouped_content[group_key]["type"] = "series"
            else:
                grouped_content[group_key] = {
                    "type": "movie",
                    "id": f"content-{len(grouped_content)}",
                    "title": title,
                    "poster": poster,
                    "overview": overview,
                    "rating": rating,
                    "episodes": [episode_data]
                }

    # 5. Save
    final_list = []
    for title, data in grouped_content.items():
        if len(data["episodes"]) > 1:
            # Series/Split Movie
            data["type"] = "series"
            data["episodeCount"] = len(data["episodes"])
            data["episodes"].sort(key=lambda x: x['title']) # Sort parts 001, 002
            final_list.append(data)
        else:
            # Single Movie
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

    print(f"\n🎉 Saved {len(final_list)} items to {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(scan_channel())