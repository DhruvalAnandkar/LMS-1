from typing import List, Dict, Any
from app.ai.embedding import embed_text, query_vectors


async def _chat_google(system_prompt: str, user_message: str) -> str:
    """Call Google Generative AI (Gemini)."""
    import asyncio
    import google.generativeai as genai
    from app.core.config import settings

    if not settings.GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is not configured")

    genai.configure(api_key=settings.GOOGLE_API_KEY)
    model = genai.GenerativeModel(
        model_name=settings.GOOGLE_AI_MODEL,
        system_instruction=system_prompt,
    )
    response = await asyncio.to_thread(model.generate_content, user_message)
    return response.text


async def _chat_azure(system_prompt: str, user_message: str, settings) -> str:
    """Call Azure OpenAI."""
    from openai import AsyncAzureOpenAI

    if not settings.AZURE_OPENAI_KEY or not settings.AZURE_OPENAI_ENDPOINT:
        raise ValueError("Azure OpenAI credentials are not configured")

    client = AsyncAzureOpenAI(
        api_key=settings.AZURE_OPENAI_KEY,
        api_version=settings.AZURE_OPENAI_API_VERSION,
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
    )
    response = await client.chat.completions.create(
        model=settings.AZURE_OPENAI_DEPLOYMENT,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.7,
        max_tokens=1000
    )
    return response.choices[0].message.content


async def process_document(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap

    return chunks


# ── Public entry-point ────────────────────────────────────────────────

async def chat_with_course(
    course_id: int,
    user_message: str,
    course_context: str = "",
) -> str:
    from app.core.config import settings
    
    query_embedding = await embed_text(user_message)

    context_chunks = await query_vectors(
        query_embedding=query_embedding,
        top_k=5,
        filter_dict={"course_id": str(course_id)},
        namespace=str(course_id),
    )

    context_text = "\n\n".join(
        [chunk.get("metadata", {}).get("text", "") for chunk in context_chunks]
    )

    system_prompt = f"""You are a helpful teaching assistant for this course. 
Use the provided course material to answer student questions accurately.
If the answer is not in the material, say so honestly.

Course Material:
{context_text}

Course Additional Context:
{course_context}

Be helpful, clear, and educational in your responses."""
    
    provider = settings.AI_PROVIDER.lower().strip()
    if provider == "google":
        return await _chat_google(system_prompt, user_message)
    if provider != "azure":
        raise ValueError(f"Unsupported AI_PROVIDER: {settings.AI_PROVIDER}")
    return await _chat_azure(system_prompt, user_message, settings)
