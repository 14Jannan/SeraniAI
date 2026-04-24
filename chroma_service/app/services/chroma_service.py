import chromadb
from chromadb.config import Settings
import uuid
from typing import List, Dict, Any, Optional
from app.config import PERSIST_DIR, EMBEDDING_MODEL, COLLECTIONS

class ChromaServiceSingleton:
    """Singleton service for managing ChromaDB operations"""
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ChromaServiceSingleton, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None:
            # Initialize ChromaDB with persistent storage
            self._client = chromadb.PersistentClient(path=PERSIST_DIR)
            self._ensure_collections()

    def _ensure_collections(self):
        """Create collections if they don't exist"""
        for collection_name in COLLECTIONS.values():
            try:
                self._client.get_collection(name=collection_name)
            except:
                self._client.create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"}
                )

    def add_embedding(self, text: str, collection: str, metadata: Optional[Dict] = None) -> str:
        """Add a single embedding to a collection"""
        doc_id = str(uuid.uuid4())
        col = self._client.get_collection(name=collection)
        col.add(
            ids=[doc_id],
            documents=[text],
            metadatas=[metadata or {}]
        )
        return doc_id

    def add_embeddings_batch(self, texts: List[str], collection: str, metadatas: Optional[List[Dict]] = None) -> List[str]:
        """Add multiple embeddings to a collection"""
        ids = [str(uuid.uuid4()) for _ in texts]
        col = self._client.get_collection(name=collection)
        col.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas or [{} for _ in texts]
        )
        return ids

    def search(self, query: str, collection: str, n_results: int = 5) -> tuple[List[Dict], List[List[float]]]:
        """Search for similar documents"""
        col = self._client.get_collection(name=collection)
        results = col.query(
            query_texts=[query],
            n_results=n_results
        )
        
        # Format results
        formatted_results = []
        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                formatted_results.append({
                    "id": results["ids"][0][i],
                    "document": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {}
                })
        
        distances = results["distances"]
        return formatted_results, distances

    def delete(self, collection: str, ids: List[str]) -> bool:
        """Delete embeddings from a collection"""
        col = self._client.get_collection(name=collection)
        col.delete(ids=ids)
        return True

    def get_collection_count(self, collection: str) -> int:
        """Get the number of documents in a collection"""
        col = self._client.get_collection(name=collection)
        return col.count()

    def clear_collection(self, collection: str) -> bool:
        """Clear all documents from a collection"""
        try:
            col = self._client.get_collection(name=collection)
            # Get all documents and delete them
            all_data = col.get()
            if all_data["ids"]:
                col.delete(ids=all_data["ids"])
            return True
        except:
            return False

    def persist(self):
        """Persist is now handled automatically in modern ChromaDB"""
        pass

# Global instance
chroma_service = ChromaServiceSingleton()
