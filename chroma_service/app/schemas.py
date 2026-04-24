from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class EmbeddingRequest(BaseModel):
    text: str
    collection: str
    metadata: Optional[Dict[str, Any]] = None

class BulkEmbeddingRequest(BaseModel):
    texts: List[str]
    collection: str
    metadatas: Optional[List[Dict[str, Any]]] = None

class SearchRequest(BaseModel):
    query: str
    collection: str
    n_results: int = 5

class SimilaritySearchRequest(BaseModel):
    embedding: List[float]
    collection: str
    n_results: int = 5

class DeleteRequest(BaseModel):
    collection: str
    ids: List[str]

class EmbeddingResponse(BaseModel):
    id: str
    collection: str
    status: str

class SearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    distances: List[List[float]]

class HealthResponse(BaseModel):
    status: str
    version: str
