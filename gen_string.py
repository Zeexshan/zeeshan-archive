from pyrogram import Client
import os

# Your keys are already in Secrets, so we load them
api_id = os.environ.get("TELEGRAM_API_ID")
api_hash = os.environ.get("TELEGRAM_API_HASH")


async def main():
    async with Client("my_account", api_id, api_hash) as app:
        print("\nHERE IS YOUR SESSION STRING (Copy all of it):\n")
        print(await app.export_session_string())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
