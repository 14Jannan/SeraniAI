#!/usr/bin/env python
import uvicorn
from app.config import CHROMA_HOST, CHROMA_PORT

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=CHROMA_HOST,
        port=CHROMA_PORT,
        reload=False
    )
