from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import embeddings
from app.config import CHROMA_HOST, CHROMA_PORT, CHROMA_ALLOWED_ORIGIN

app = FastAPI(
    title="ChromaDB Vector Service",
    description="Vector embeddings and semantic search service",
    version="1.0.0"
)

# This service is only ever called server-to-server by the Node backend, so
# CORS should allow that one origin, not "*". allow_credentials=True is
# invalid together with a wildcard origin anyway (browsers reject it).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CHROMA_ALLOWED_ORIGIN] if CHROMA_ALLOWED_ORIGIN else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(embeddings.router)

@app.get("/")
async def root():
    return {"message": "ChromaDB Vector Service is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=CHROMA_HOST,
        port=CHROMA_PORT,
        reload=False
    )
