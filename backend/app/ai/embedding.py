import os
from typing import List, Optional
from loguru import logger
from app.core.config import settings

pinecone_client = None
pinecone_index = None


def get_pinecone_client():
    global pinecone_client
    if pinecone_client is None:
        from pinecone import Pinecone
        pinecone_client = Pinecone(
            api_key=settings.PINECONE_API_KEY,
            environment=settings.PINECONE_ENVIRONMENT
        )
    return pinecone_client


def get_pinecone_index():
    global pinecone_index
    if pinecone_index is None:
        client = get_pinecone_client()
        try:
            pinecone_index = client.Index(settings.PINECONE_INDEX_NAME)
        except Exception:
            client.create_index(
                name=settings.PINECONE_INDEX_NAME,
                dimension=1536,
                metric="cosine"
            )
            pinecone_index = client.Index(settings.PINECONE_INDEX_NAME)
    return pinecone_index


async def embed_text(text: str) -> List[float]:
    import google.generativeai as genai
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    
    result = genai.embed_content(
        model="gemini-embedding-001",
        content=text,
        task_type="retrieval_document"
    )
    return result["embedding"]


async def embed_documents(texts: List[str]) -> List[List[float]]:
    import google.generativeai as genai
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    
    embeddings = []
    for text in texts:
        result = genai.embed_content(
            model="gemini-embedding-001",
            content=text,
            task_type="retrieval_document"
        )
        embeddings.append(result["embedding"])
    return embeddings


async def upsert_vectors(
    vectors: List[dict],
    namespace: str = ""
):
    index = get_pinecone_index()
    index.upsert(vectors=vectors, namespace=namespace)


async def query_vectors(
    query_embedding: List[float],
    top_k: int = 5,
    filter_dict: Optional[dict] = None,
    namespace: str = ""
) -> List[dict]:
    index = get_pinecone_index()
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        filter=filter_dict,
        namespace=namespace,
        include_metadata=True
    )
    return results.get("matches", [])


async def delete_vectors(ids: List[str], namespace: str = ""):
    index = get_pinecone_index()
    index.delete(ids=ids, namespace=namespace)


async def delete_vectors_by_filter(filter_dict: dict, namespace: str = ""):
    if not filter_dict:
        raise ValueError("delete_vectors_by_filter requires a non-empty filter_dict")
    client = get_pinecone_client()
    try:
        description = client.describe_index(settings.PINECONE_INDEX_NAME)
    except Exception as exc:
        raise RuntimeError("Unable to describe Pinecone index for filter deletes") from exc
    spec = None
    if isinstance(description, dict):
        spec = description.get("spec")
    else:
        spec = getattr(description, "spec", None)
    serverless = False
    if isinstance(spec, dict):
        serverless = spec.get("serverless") is not None
    elif spec is not None:
        serverless = getattr(spec, "serverless", None) is not None
    if not serverless:
        raise RuntimeError("Filter-based deletes require a serverless Pinecone index")
    index = get_pinecone_index()
    try:
        index.delete(filter=filter_dict, namespace=namespace)
    except Exception as exc:
        logger.exception("Failed to delete vectors by filter")
        raise
