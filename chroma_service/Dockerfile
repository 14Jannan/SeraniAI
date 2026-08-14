FROM python:3.11-slim

# chromadb's native dependency (chroma-hnswlib) ships prebuilt manylinux
# wheels for this base image, so no compiler toolchain is needed here -
# unlike plain Windows/Python 3.12, where it must be built from source.
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Persisted vector store - mount a volume here in production so embeddings
# survive container restarts/redeploys.
VOLUME ["/app/chroma_db"]

EXPOSE 5000

ENV CHROMA_HOST=0.0.0.0
ENV CHROMA_PORT=5000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
