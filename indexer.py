#!/usr/bin/env python3
"""
Tele-Flix Smart Indexer (Restored & Upgraded)
-------------------------
1. Fixes .env loading for Replit.
2. Supports Multiple Channels (Anime & J-Horror).
3. Surgical Cleaning (Protects 'on', handles 2160p/BluRay).
4. PeerID Fix (Dialog Sync).
5. Manual Override Preservation.
"""

import os
import re
import json
import asyncio
import hashlib
import requests
import time
import unicodedata
from pyrogram import Client
from dotenv import load_dotenv

# --- NEW: Load variables from .env ---
load_dotenv()

# ---------------- CONFIGURATION ----------------
API_ID = os.environ.get("TELEGRAM_API_ID")
API_HASH = os.environ.get("TELEGRAM_API_HASH")
TMDB_API_KEY = os.environ.get("TMDB_API_KEY")

# YOUR NEW CATEGORIES
CHANNELS = [{
    "id": -1003838058874,
    "link_id": "3838058874",
    "category": "anime"
}, {
    "id": -1003747953815,
    "link_id": "3747953815",
    "category": "j-horror"
}]

OUTPUT_FILE = "client/public/movies.json"
TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/multi"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
# -----------------------------------------------

if not API_ID or not API_HASH:
    print("Error: TELEGRAM credentials missing in .env file.")
    import sys
    sys.exit(1)


def generate_stable_id(title: str) -> str:
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', title.lower()).strip('-')
    hash_suffix = hashlib.md5(title.encode()).hexdigest()[:6]
    return f"id-{slug}-{hash_suffix}"


def clean_title_for_search(filename: str) -> tuple:
    # 1. Standard Cleanup
    name = re.sub(r'[_\.]', ' ', filename)
    name = re.sub(r'\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v)$',
                  '',
                  name,
                  flags=re.IGNORECASE)

    # 2. Remove Junk Prefixes
    name = re.sub(r'^[Ww]atch\s+', '', name)
    name = re.sub(r'@\w+', '', name)

    # 3. THE GROUPING FIX: Strip "part" identifiers BEFORE grouping
    # This ensures "Movie part001" and "Movie part002" become just "Movie"
    name = re.sub(r'\bpart\s*\d+\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\bpt\s*\d+\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\bpart\s*\d+\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\bpt\s*\d+\b', '', name, flags=re.IGNORECASE)

    # 4. Cutoff logic (Rest of your existing logic)
    cutoff_keywords = [
        r'Sub', r'Dub', r'Dual', r'Audio', r'online', r'Free', r'HiAnime',
        r'1080p', r'720p', r'480p', r'2160p', r'4k', r'BluRay', r'WebRip',
        r'WEBRip', r'x264', r'x265', r'HEVC', r'10bit', r'HDR'
    ]
    cutoff_pattern = r'\b(' + '|'.join(cutoff_keywords) + r')\b.*'
    name = re.sub(cutoff_pattern, '', name, flags=re.IGNORECASE)
    # ... rest of your function

    # 4. Remove remaining technical trash
    tech_trash = [
        r'AAC', r'5\.1', r'7\.1', r'AC3', r'EAC3', r'DTS', r'TrueHD',
        r'H\.264', r'H\.265', r'DVDRip', r'HDTV'
    ]
    name = re.sub(r'\b(' + '|'.join(tech_trash) + r')\b',
                  '',
                  name,
                  flags=re.IGNORECASE)

    # 5. Detect Episode Numbering
    episode_patterns = [
        r'[.\s_-](S\d+E\d+|S\d+|E\d+)', r'\b(Episode|Ep\.?|EP\-?)\s*\d+',
        r'\s-\s+\d+'
    ]
    for pattern in episode_patterns:
        match = re.search(pattern, name, re.IGNORECASE)
        if match:
            name = name[:match.start()]
            break

    # 6. Extract Year
    year_match = re.search(r'\b(19[2-9]\d|20[0-2]\d)\b', name)
    year = None
    if year_match:
        year = year_match.group(0)
        name = name.replace(year, "")

    # 7. Final Polish
    name = re.sub(r'[^a-zA-Z0-9\s!&,\'-]', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return (name, year)


def get_group_key(title: str) -> str:
    return re.sub(r'[^a-zA-Z0-9]', '', title.lower())


def search_tmdb_recursive(title: str, year: str = None):
    if not TMDB_API_KEY or not title: return None

    def call_api(query):
        params = {
            "api_key": TMDB_API_KEY,
            "query": query,
            "include_adult": "false",
            "language": "en-US"
        }
        if year: params["year"] = year
        try:
            res = requests.get(TMDB_SEARCH_URL, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("results"): return data["results"][0]
        except:
            pass
        return None

    # Attempt 1: Full Title
    print(f"    🔎 Searching: '{title}'...")
    result = call_api(title)
    if result: return result

    # Attempt 2: Smart Chopping
    words = title.split()
    if len(words) > 1:
        # Try removing last word
        sub_title_2 = " ".join(words[:-1])
        print(f"    ✂️  Trying: '{sub_title_2}'...")
        result = call_api(sub_title_2)
        if result: return result

    return None


def format_file_size(size_bytes: int) -> str:
    if size_bytes < 0: return "Unknown"
    if size_bytes >= 1024**3: return f"{size_bytes / (1024**3):.1f} GB"
    return f"{size_bytes / (1024**2):.1f} MB"


async def scan_channel():
    print("Connecting to Telegram...")
    session_string = os.environ.get("TELEGRAM_SESSION_STRING")

    app = Client("tele_flix_session",
                 api_id=int(API_ID),
                 api_hash=API_HASH,
                 session_string=session_string,
                 workdir=".")

    # Preserve manual overrides
    existing_overrides = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                for item in existing_data:
                    if item.get("customTitle") or item.get("customPoster"):
                        existing_overrides[item["id"]] = {
                            "customTitle": item.get("customTitle"),
                            "customPoster": item.get("customPoster"),
                            "customOverview": item.get("customOverview")
                        }
        except:
            pass

    async with app:
        print("Connected! Syncing dialogs (Fixes PeerID error)...")
        try:
            async for dialog in app.get_dialogs():
                pass
        except:
            pass

        grouped_content = {}
        tmdb_cache = {}

        for channel in CHANNELS:
            print(f"Scanning: {channel['category']}...")
            async for message in app.get_chat_history(channel["id"]):
                media = message.video or message.document
                if not media: continue

                file_name = media.file_name
                file_size = media.file_size

                search_title, year = clean_title_for_search(file_name)
                group_key = f"{channel['category']}_{get_group_key(search_title)}"
                stable_id = generate_stable_id(
                    f"{channel['category']}_{search_title}")

                if search_title not in tmdb_cache:
                    metadata = search_tmdb_recursive(search_title, year)
                    if metadata:
                        poster = f"{TMDB_IMAGE_BASE}{metadata.get('poster_path')}" if metadata.get(
                            "poster_path") else None
                        tmdb_cache[search_title] = (
                            poster, metadata.get("overview"),
                            metadata.get("vote_average"))
                    else:
                        tmdb_cache[search_title] = (None, None, 0)

                poster, overview, rating = tmdb_cache[search_title]

                episode_data = {
                    "title": file_name,
                    "episodeId": file_name,
                    "size": format_file_size(file_size or 0),
                    "link": f"https://t.me/c/{channel['link_id']}/{message.id}"
                }

                if group_key in grouped_content:
                    grouped_content[group_key]["episodes"].append(episode_data)
                    grouped_content[group_key]["type"] = "series"
                else:
                    overrides = existing_overrides.get(stable_id, {})
                    grouped_content[group_key] = {
                        "type": "movie",
                        "id": stable_id,
                        "title": search_title,
                        "poster": poster,
                        "overview": overview,
                        "rating": rating,
                        "category": channel["category"],
                        "customTitle": overrides.get("customTitle"),
                        "customPoster": overrides.get("customPoster"),
                        "customOverview": overrides.get("customOverview"),
                        "episodes": [episode_data]
                    }

    final_list = []
    for data in grouped_content.values():
        if len(data["episodes"]) > 1:
            data["episodes"].sort(key=lambda x: x['title'])
            data["episodeCount"] = len(data["episodes"])
            final_list.append(data)
        else:
            single_ep = data["episodes"][0]
            data.update({"size": single_ep["size"], "link": single_ep["link"]})
            del data["episodes"]
            final_list.append(data)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)

    print(f"\n🎉 Saved {len(final_list)} items to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(scan_channel())
