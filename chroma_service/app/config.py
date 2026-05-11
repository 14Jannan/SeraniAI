import os
from dotenv import load_dotenv

load_dotenv()

CHROMA_PORT = int(os.getenv("CHROMA_PORT", 5000))
CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
PERSIST_DIR = os.getenv("PERSIST_DIR", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# Collection names for different data types
COLLECTIONS = {
    "journals": "journals",
    "courses": "courses",
    "chat": "chat_messages",
    "users": "users",
}
