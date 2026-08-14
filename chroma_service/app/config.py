import os
from dotenv import load_dotenv

load_dotenv()

CHROMA_PORT = int(os.getenv("CHROMA_PORT", 5000))
# Bind on all interfaces by default so this runs correctly inside a
# container/behind a load balancer, not just on localhost. Still reachable
# via http://localhost:<port> for local development.
CHROMA_HOST = os.getenv("CHROMA_HOST", "0.0.0.0")
PERSIST_DIR = os.getenv("PERSIST_DIR", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# Shared secret the Node backend must send as the X-Internal-Api-Key header.
# When unset, the service logs a loud warning and runs unauthenticated -
# fine for local dev, never acceptable for a deployed environment.
CHROMA_SERVICE_API_KEY = os.getenv("CHROMA_SERVICE_API_KEY", "")

# Origin allowed to call this service via CORS. This service is only ever
# meant to be called server-to-server by the Node backend, never directly
# from a browser, so this should normally be that backend's own URL (or
# left empty to disable browser CORS entirely).
CHROMA_ALLOWED_ORIGIN = os.getenv("CHROMA_ALLOWED_ORIGIN", "http://localhost:7001")

# Collection names for different data types
COLLECTIONS = {
    "journals": "journals",
    "courses": "courses",
    "chat": "chat_messages",
    "users": "users",
}
