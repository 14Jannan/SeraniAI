#!/usr/bin/env python
import sys
import subprocess
import uvicorn

# Ensure sqlite3 is new enough for chromadb on older Pythons
try:
    import sqlite3

    if sqlite3.sqlite_version_info < (3, 35, 0):
        # Install pysqlite3-binary and swap modules so chromadb can use it
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pysqlite3-binary"])
        import pysqlite3 as _pysqlite3

        sys.modules["sqlite3"] = _pysqlite3
except Exception:
    # If any of this fails, let uvicorn import flow raise the original error
    pass

from app.config import CHROMA_HOST, CHROMA_PORT


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=CHROMA_HOST,
        port=CHROMA_PORT,
        reload=False,
    )
