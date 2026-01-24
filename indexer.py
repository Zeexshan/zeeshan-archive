#!/usr/bin/env python3
"""
Tele-Flix Smart Indexer (Final Fixed Version)
-------------------------
1. Fixes "Peer id invalid" by syncing dialogs first.
2. Fixes TMDB Auth (Works with short API Keys).
3. Cleans '6CH', 'Multi Audio', and Years properly.
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


def clean_title_for_search(filename: str) -> str:
    """
    Aggressively cleans a filename to get the core title for TMDB search.
    """
    # 1. Remove file extension
    name = re.sub(r'\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v)$',
                  '',
                  filename,
                  flags=re.IGNORECASE)

    # 2. Remove "Part/CD/Disc" suffixes (Crucial for split files!)
    # Matches: _part001, -part1, .cd1, _disc 1, _pt01
    name = re.sub(r'[_\.\-\s]?(part|pt|cd|disc)\s*\d+',
                  '',
                  name,
                  flags=re.IGNORECASE)

    # 3. Identify and remove Season/Episode info (S01E01)
    match = re.search(r'(S\d+E\d+|S\d+|E\d+|Episode\s*\d+)', name,
                      re.IGNORECASE)
    if match:
        name = name[:match.start()]  # Take everything BEFORE the episode info

    # 4. Remove common "Pirate/Release" tags
    tags = [
        r'[\.\s]?(2160p|1080p|720p|480p|4K|HD|SD)',
        r'[\.\s]?(BluRay|WEB-DL|WEBRip|HDTV|DVDRip|BD)',
        r'[\.\s]?(x265|x264|HEVC|AAC|AC3|DTS|10bit|HDR|Dolby|Atmos)',
        r'[\.\s]?(Pahe\.in|Pahe|RARBG|PSA|YTS|YIFY|EMBER|GECKOS|Toonworld4all)',
        r'[\.\s]?(Multi Audio|Multi|Dual Audio|ESub|Sub|Dub)',
        r'[\.\s]?(\d+CH|6CH|2CH|5\.1CH|5\.1)',  # Audio Channels
        r'\[.*?\]',
        r'\(.*?\)'
    ]
    for tag in tags:
        name = re.sub(tag, '', name, flags=re.IGNORECASE)

    # 5. Fix "Year" sticking to other text (e.g., "Name 2016R" -> "Name 2016")
    name = re.sub(r'(19|20)(\d{2})[A-Za-z]+', r'\1\2', name)

    # 6. Final cleanup
    name = name.replace('.', ' ').replace('_', ' ').replace('-', ' ').strip()
    name = re.sub(r'\s+', ' ', name)  # Remove double spaces

    return name


def get_tmdb_metadata(clean_name):
    """Query TMDB for poster, overview, and rating."""
    if not TMDB_API_KEY:
        print("⚠️  TMDB_API_KEY missing! Skipping.")
        return None, None, 0

    # Use Query Parameters (Works with Short API Key)
    params = {
        "api_key": TMDB_API_KEY,
        "query": clean_name,
        "include_adult": "false",
        "language": "en-US"
    }

    try:
        response = requests.get(TMDB_SEARCH_URL, params=params, timeout=5)

        # Check for Auth Errors
        if response.status_code == 401:
            print("❌ Error: TMDB API Key is Invalid (401 Unauthorized)")
            return None, None, 0

        data = response.json()

        if data.get("results"):
            # Success!
            result = data["results"][0]
            title_found = result.get('name') or result.get('title')
            print(f"✅ TMDB Found: {title_found}")

            poster_path = result.get("poster_path")
            full_poster = f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else None
            return full_poster, result.get("overview"), result.get(
                "vote_average")
        else:
            print(f"❌ TMDB Not Found: '{clean_name}'")
            # Fallback: Try searching without the year
            if re.search(r'\d{4}', clean_name):
                no_year = re.sub(r'\d{4}', '', clean_name).strip()
                # Recursive call (limit depth)
                if clean_name != no_year:
                    print(f"   ↳ Retrying without year: '{no_year}'")
                    return get_tmdb_metadata(no_year)

    except Exception as e:
        print(f"⚠️  Connection Error: {e}")

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
        app = Client("tele_flix_session",
                     api_id=int(API_ID),
                     api_hash=API_HASH,
                     session_string=session_string,
                     in_memory=True)
    else:
        app = Client("tele_flix_session",
                     api_id=int(API_ID),
                     api_hash=API_HASH,
                     workdir=".")

    # Data structures
    grouped_content = {}
    tmdb_cache = {}

    async with app:
        print("Connected!")

        # --- CRITICAL FIX: SYNC DIALOGS TO FIND PEER ID ---
        print("Syncing dialogs to cache peer IDs...")
        try:
            async for dialog in app.get_dialogs():
                pass  # Just iterating populates the cache
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

            # 1. Clean Title
            clean_title = clean_title_for_search(file_name)

            # 2. Fetch Metadata
            if clean_title not in tmdb_cache:
                print(f"🔎 Searching: '{clean_title}'")
                tmdb_cache[clean_title] = get_tmdb_metadata(clean_title)

            poster, overview, rating = tmdb_cache[clean_title]

            # 3. Create Item
            episode_data = {
                "title": file_name,
                "episodeId": file_name,
                "size": format_file_size(file_size or 0),
                "link": f"https://t.me/c/{CHANNEL_LINK_ID}/{message.id}"
            }

            # 4. Grouping
            if clean_title in grouped_content:
                grouped_content[clean_title]["episodes"].append(episode_data)
                grouped_content[clean_title]["type"] = "series"
            else:
                grouped_content[clean_title] = {
                    "type": "movie",
                    "id": f"content-{len(grouped_content)}",
                    "title": clean_title,
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
            data["episodes"].sort(
                key=lambda x: x['title'])  # Sort parts 001, 002
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
