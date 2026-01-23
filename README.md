# Tele-Flix Archive

A beautiful Netflix-style web interface for browsing your private Telegram movie archive. This project includes a Python automation tool that scans your Telegram channel and a modern React frontend for browsing.

## Features

- **Netflix-inspired dark theme** - Beautiful, modern UI with a familiar feel
- **Intelligent filename cleaning** - Automatically extracts clean titles from complex filenames
- **Real-time search** - Instantly filter through your movie collection
- **Responsive design** - Works beautifully on mobile, tablet, and desktop
- **Direct Telegram links** - One-click access to watch/download from Telegram

## Project Components

### 1. Python Indexer (`indexer.py`)
An intelligent script that:
- Connects to your Telegram channel
- Scans all messages for video files
- Cleans messy filenames (e.g., `Frieren.Beyond.Journeys.End.S01E01.1080p.BluRay.x265-Pahe.in` → `Frieren Beyond Journeys End - S01E01`)
- Exports a structured JSON database

### 2. Web Interface
A stunning Netflix-style single-page application that:
- Displays your movie collection in a responsive grid
- Provides instant search filtering
- Links directly to Telegram for viewing

## Setup Instructions

### Step 1: Get Telegram API Credentials

1. Go to [https://my.telegram.org](https://my.telegram.org)
2. Log in with your phone number
3. Click on "API Development Tools"
4. Create a new application (any name is fine)
5. Note down your **API ID** and **API Hash**

### Step 2: Add Secrets to Replit

1. In your Replit project, click on "Secrets" (lock icon) in the left sidebar
2. Add the following secrets:
   - `TELEGRAM_API_ID` - Your numeric API ID
   - `TELEGRAM_API_HASH` - Your API Hash string

### Step 3: Run the Indexer

There are two ways to run the indexer:

**Option A: Using the Shell**
```bash
./run.sh
```

**Option B: Direct Python**
```bash
python indexer.py
```

On first run, Pyrogram will ask you to authenticate with your Telegram account. Follow the prompts to enter your phone number and the verification code.

### Step 4: View Your Archive

Once the indexer completes, the web interface will automatically display your movies. Access it through the Replit webview or your deployment URL.

## Updating the Catalog

Whenever you add new movies to your Telegram channel, simply run the indexer again:

```bash
./run.sh
```

This will rescan the channel and update `movies.json` with the latest content.

## Customization

### Changing the Target Channel

To scan a different Telegram channel, edit `indexer.py`:

```python
# Change this line with your channel ID
CHANNEL_ID = -1001234567890  # Your channel ID (with -100 prefix)
CHANNEL_LINK_ID = "1234567890"  # Same ID without -100 prefix
```

**How to get your channel ID:**
1. Forward a message from your channel to [@userinfobot](https://t.me/userinfobot)
2. The bot will reply with the channel ID
3. Private channels have a `-100` prefix

### Filename Cleaning Patterns

The indexer intelligently cleans these patterns:
- Season/Episode: `S01E01`, `s1e1`
- Quality: `1080p`, `720p`, `4K`, `UHD`
- Sources: `BluRay`, `WEB-DL`, `HDTV`
- Codecs: `x265`, `HEVC`, `H.264`
- Audio: `AAC`, `DTS`, `Atmos`
- Release groups: `Pahe.in`, `RARBG`, `YTS`

To add custom patterns, edit the `patterns_to_remove` list in `indexer.py`.

## File Structure

```
├── indexer.py        # Telegram channel scanner
├── run.sh            # Easy-run script for the indexer
├── movies.json       # Generated movie database
├── README.md         # This documentation
├── client/           # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── MovieCard.tsx
│   │   │   ├── MovieGrid.tsx
│   │   │   └── LoadingState.tsx
│   │   ├── pages/
│   │   │   └── home.tsx
│   │   └── App.tsx
│   └── index.html
├── server/           # Express backend
│   ├── routes.ts     # API endpoints
│   └── storage.ts    # Data access layer
└── shared/
    └── schema.ts     # TypeScript types
```

## Security Reminders

- **Never commit API credentials** to your code repository
- **Keep secrets in environment variables** using Replit Secrets
- **Private channels are protected** - only channel members can access the links

## Troubleshooting

### "TELEGRAM_API_ID or TELEGRAM_API_HASH not found"
Make sure you've added both secrets in Replit's Secrets panel.

### "Channel not found" or "Access denied"
1. Ensure you're a member of the channel
2. Verify the channel ID is correct (with `-100` prefix for private channels)
3. Check that your Telegram account has access to the channel

### "Session expired"
Delete the `tele_flix_session.session` file and run the indexer again to re-authenticate.

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Tanstack Query
- **Backend**: Express.js, TypeScript
- **Indexer**: Python, Pyrogram, TGCrypto
- **Styling**: Netflix-inspired dark theme with Inter font

## License

This project is for personal use only. Respect copyright laws and only use this for content you have rights to access.
