# Tele-Flix Archive

## Overview

Tele-Flix Archive is a Netflix-style web application for browsing a private Telegram movie archive. The system consists of two main components:

1. **Python Indexer** (`indexer.py`) - Scans a Telegram channel, extracts video file information, cleans messy filenames (especially anime/series naming conventions), and exports structured JSON data
2. **Web Interface** - A modern React frontend with a dark Netflix-inspired theme that displays movies in a responsive grid with real-time search and direct Telegram links

The application transforms complex filenames like `Frieren.Beyond.Journeys.End.S01E01.1080p.BluRay.x265-Pahe.in` into clean, readable titles like `Frieren Beyond Journeys End - S01E01`.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library (New York style)
- **Build Tool**: Vite with path aliases (`@/` for client/src, `@shared/` for shared)

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript (transpiled with tsx)
- **API Pattern**: RESTful endpoints under `/api/`
- **Data Source**: Reads from `movies.json` file (populated by Python indexer)

### Data Flow
1. Python indexer connects to Telegram using Pyrogram library
2. Scans channel messages for video files
3. Cleans filenames using regex patterns to extract titles
4. Exports to `movies.json` with title, size, and Telegram link
5. Express server reads JSON and serves via `/api/movies`
6. React frontend fetches and displays with search filtering

### Database Schema
- Uses Drizzle ORM with PostgreSQL dialect (schema defined but storage currently uses JSON file)
- Movies table: id, title, size, link
- The MemStorage class reads from `movies.json` as primary data source

### Key Design Decisions
- **File-based storage over database**: Movies data comes from Python indexer output, making JSON file simpler than database sync
- **Monorepo structure**: Client, server, and shared code in single repository with path aliases
- **Dark theme default**: Netflix-inspired UI uses dark mode as the only theme
- **Responsive grid**: 3-6 columns depending on screen size for movie cards

## External Dependencies

### Telegram Integration
- **Pyrogram**: Python library for Telegram API access
- **Credentials**: `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` environment variables required
- **Channel ID**: Configured as `-1003686417406` with link format `https://t.me/c/3686417406/{message_id}`

### Third-Party Services
- **Google Fonts**: Inter font family loaded from fonts.googleapis.com

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-kit`: ORM (configured but using JSON storage)
- `express`: HTTP server
- `wouter`: Client-side routing
- Radix UI primitives: Accessible component foundations

### Python Dependencies
- `pyrogram`: Telegram MTProto API client
- Standard library: `os`, `re`, `json`, `asyncio`

### Development Tools
- Vite with React plugin
- Replit-specific plugins for development (cartographer, dev-banner, error overlay)
- ESBuild for production server bundling