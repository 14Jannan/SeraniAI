const path = require("path");
const { LocalIndex } = require("vectra");

// ── Embedding model (Xenova – local, no API key needed) ──────────────────────
let extractor;

async function getExtractor() {
    if (!extractor) {
        console.log("Initializing Xenova extractor...");
        const { pipeline } = await import("@xenova/transformers");
        extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        console.log("Xenova extractor ready.");
    }
    return extractor;
}

async function embed(text) {
    const ext = await getExtractor();
    const output = await ext(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
}

// ── Vectra index (file-backed, no server needed) ─────────────────────────────
const INDEX_DIR = path.join(__dirname, "..", "chroma_data");
let index;

async function getIndex() {
    if (!index) {
        index = new LocalIndex(INDEX_DIR);
        if (!(await index.isIndexCreated())) {
            await index.createIndex();
            console.log("Vectra index created at", INDEX_DIR);
        } else {
            console.log("Vectra index loaded from", INDEX_DIR);
        }
    }
    return index;
}

// ── Drop-in collection wrapper ────────────────────────────────────────────────
// Exposes .add() / .query() / .delete() so chatControllers.js needs no changes.

const collection = {
    /**
     * Add documents to the vector store.
     * { ids, documents, metadatas }
     */
    async add({ ids, documents, metadatas }) {
        const idx = await getIndex();
        for (let i = 0; i < documents.length; i++) {
            const vector = await embed(documents[i]);
            await idx.insertItem({
                id: ids[i],
                vector,
                metadata: {
                    ...metadatas[i],
                    document: documents[i],
                },
            });
        }
    },

    /**
     * Query for semantically similar documents.
     * { queryTexts: [string], nResults: number, where: { userId } }
     * Returns a ChromaDB-compatible result shape:
     *   { documents: [[...]], metadatas: [[...]], distances: [[...]] }
     */
    async query({ queryTexts, nResults = 10, where = {} }) {
        const idx = await getIndex();
        const queryVector = await embed(queryTexts[0]);

        // Fetch more than nResults so we can filter by userId afterwards
        const rawResults = await idx.queryItems(queryVector, nResults * 4);

        // Filter by metadata (userId)
        const filtered = rawResults.filter((r) => {
            for (const [key, val] of Object.entries(where)) {
                if (r.item.metadata[key] !== val) return false;
            }
            return true;
        });

        const top = filtered.slice(0, nResults);

        return {
            documents: [top.map((r) => r.item.metadata.document)],
            metadatas: [top.map((r) => r.item.metadata)],
            distances: [top.map((r) => r.score)],
        };
    },

    /**
     * Delete items matching a metadata filter.
     * { where: { userId } | { sessionId } }
     */
    async delete({ where = {} }) {
        const idx = await getIndex();
        const allItems = await idx.listItems();

        const toDelete = allItems.filter((item) => {
            for (const [key, val] of Object.entries(where)) {
                if (item.metadata[key] !== val) return false;
            }
            return true;
        });

        for (const item of toDelete) {
            await idx.deleteItem(item.id);
        }

        if (toDelete.length > 0) {
            console.log(`Vectra: deleted ${toDelete.length} items matching`, where);
        }
    },
};

// ── Public API (same shape as before) ─────────────────────────────────────────
async function getOrCreateCollection() {
    await getIndex(); // ensure index is ready
    return collection;
}

module.exports = { getOrCreateCollection };
