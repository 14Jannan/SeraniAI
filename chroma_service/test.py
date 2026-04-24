import sys
import os

# Add the current directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.chroma_service import chroma_service

def test_chroma():
    print("--- ChromaDB Service Test ---")
    
    # 1. Check collection counts
    print("\nChecking collection counts:")
    collections = ["journals", "courses", "chat_messages", "users"]
    for col in collections:
        try:
            count = chroma_service.get_collection_count(col)
            print(f"Collection '{col}': {count} documents")
        except Exception as e:
            print(f"Error getting count for '{col}': {e}")

    # 2. Test adding and searching
    test_collection = "journals"
    test_text = "This is a test journal entry about meditation and mindfulness."
    print(f"\nTesting add/search in '{test_collection}':")
    
    try:
        # Add
        doc_id = chroma_service.add_embedding(
            text=test_text,
            collection=test_collection,
            metadata={"source": "test_script", "type": "test"}
        )
        print(f"Successfully added test document with ID: {doc_id}")
        
        # Search
        query = "meditation"
        print(f"Searching for query: '{query}'")
        results, distances = chroma_service.search(query, test_collection, n_results=1)
        
        if results:
            print(f"Found match: {results[0]['document']}")
            print(f"Distance: {distances[0][0]}")
        else:
            print("No results found.")
            
        # Clean up (optional, but good for test)
        # chroma_service.delete(test_collection, [doc_id])
        # print("Cleaned up test document.")
        
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_chroma()
