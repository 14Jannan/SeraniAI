const axios = require("axios");

class ChromaDBService {
  constructor(baseUrl = process.env.CHROMA_API_URL || "http://localhost:5000/api") {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  /**
   * Health check to verify the service is running
   */
  async health() {
    try {
      const response = await this.client.get("/health");
      return response.data;
    } catch (error) {
      throw new Error(`ChromaDB health check failed: ${error.message}`);
    }
  }

  /**
   * Add a single embedding to a collection
   * @param {string} text - The text to embed
   * @param {string} collection - Collection name (journals, courses, chat, users)
   * @param {Object} metadata - Optional metadata to store with the embedding
   * @returns {Promise<string>} Document ID
   */
  async addEmbedding(text, collection, metadata = {}) {
    try {
      const response = await this.client.post("/embed", {
        text,
        collection,
        metadata,
      });
      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to add embedding: ${error.message}`);
    }
  }

  /**
   * Add multiple embeddings in batch
   * @param {string[]} texts - Array of texts to embed
   * @param {string} collection - Collection name
   * @param {Object[]} metadatas - Optional array of metadata objects
   * @returns {Promise<string[]>} Array of document IDs
   */
  async addEmbeddingsBatch(texts, collection, metadatas = null) {
    try {
      const response = await this.client.post("/embed-batch", {
        texts,
        collection,
        metadatas,
      });
      return response.data.ids;
    } catch (error) {
      throw new Error(`Failed to add batch embeddings: ${error.message}`);
    }
  }

  /**
   * Search for similar documents
   * @param {string} query - Search query text
   * @param {string} collection - Collection name
   * @param {number} nResults - Number of results to return (default: 5)
   * @returns {Promise<Object>} Search results with documents and distances
   */
  async search(query, collection, nResults = 5) {
    try {
      const response = await this.client.post("/search", {
        query,
        collection,
        n_results: nResults,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Delete embeddings from a collection
   * @param {string} collection - Collection name
   * @param {string[]} ids - Array of document IDs to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmbeddings(collection, ids) {
    try {
      await this.client.post("/delete", {
        collection,
        ids,
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete embeddings: ${error.message}`);
    }
  }

  /**
   * Get the number of documents in a collection
   * @param {string} collection - Collection name
   * @returns {Promise<number>} Document count
   */
  async getCollectionCount(collection) {
    try {
      const response = await this.client.get(`/collection-count/${collection}`);
      return response.data.count;
    } catch (error) {
      throw new Error(`Failed to get collection count: ${error.message}`);
    }
  }

  /**
   * Clear all documents from a collection
   * @param {string} collection - Collection name
   * @returns {Promise<boolean>} Success status
   */
  async clearCollection(collection) {
    try {
      const response = await this.client.post(`/clear/${collection}`);
      return response.data.status === "cleared";
    } catch (error) {
      throw new Error(`Failed to clear collection: ${error.message}`);
    }
  }
}

module.exports = ChromaDBService;
