from fastapi import APIRouter, HTTPException
from app.schemas import (
    EmbeddingRequest, BulkEmbeddingRequest, SearchRequest,
    SimilaritySearchRequest, DeleteRequest, EmbeddingResponse,
    SearchResponse, HealthResponse
)
from app.services.chroma_service import chroma_service

router = APIRouter(prefix="/api", tags=["embeddings"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

@router.post("/embed", response_model=EmbeddingResponse)
async def embed_text(request: EmbeddingRequest):
    """Add a single embedding to ChromaDB"""
    try:
        doc_id = chroma_service.add_embedding(
            text=request.text,
            collection=request.collection,
            metadata=request.metadata
        )
        return {
            "id": doc_id,
            "collection": request.collection,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/embed-batch")
async def embed_batch(request: BulkEmbeddingRequest):
    """Add multiple embeddings to ChromaDB"""
    try:
        doc_ids = chroma_service.add_embeddings_batch(
            texts=request.texts,
            collection=request.collection,
            metadatas=request.metadatas
        )
        return {
            "ids": doc_ids,
            "collection": request.collection,
            "count": len(doc_ids),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Search for similar documents"""
    try:
        results, distances = chroma_service.search(
            query=request.query,
            collection=request.collection,
            n_results=request.n_results
        )
        return {
            "results": results,
            "distances": distances
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/delete")
async def delete_embeddings(request: DeleteRequest):
    """Delete embeddings from ChromaDB"""
    try:
        success = chroma_service.delete(
            collection=request.collection,
            ids=request.ids
        )
        return {
            "deleted": request.ids,
            "status": "success" if success else "failed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collection-count/{collection_name}")
async def get_collection_count(collection_name: str):
    """Get the number of documents in a collection"""
    try:
        count = chroma_service.get_collection_count(collection_name)
        return {"collection": collection_name, "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear/{collection_name}")
async def clear_collection(collection_name: str):
    """Clear all documents from a collection"""
    try:
        success = chroma_service.clear_collection(collection_name)
        return {
            "collection": collection_name,
            "status": "cleared" if success else "failed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
