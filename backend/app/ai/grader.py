import json
from typing import Dict, Any, Tuple
from app.ai.embedding import embed_text, query_vectors
from loguru import logger


# ── Provider-specific grading helpers ─────────────────────────────────

async def _grade_google(system_prompt: str, submission_content: str) -> dict:
    """Grade using Google Generative AI (Gemini)."""
    import asyncio
    import google.generativeai as genai
    from app.core.config import settings

    genai.configure(api_key=settings.GOOGLE_API_KEY)
    model = genai.GenerativeModel(
        model_name=settings.GOOGLE_AI_MODEL,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            max_output_tokens=1500,
            response_mime_type="application/json",
        ),
    )
    response = await asyncio.to_thread(model.generate_content, submission_content)
    return json.loads(response.text)


async def _grade_azure(system_prompt: str, submission_content: str, settings) -> dict:
    """Grade using Azure OpenAI."""
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
            {"role": "user", "content": submission_content},
        ],
        temperature=0.3,
        max_tokens=1500,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


# ── Public entry-point ────────────────────────────────────────────────

async def grade_submission(
    submission_content: str,
    assignment_title: str,
    assignment_description: str,
    assignment_rubric: str,
    course_id: int,
    max_grade: float = 100.0,
) -> Tuple[float, str]:
    from app.core.config import settings
    
    course_context = ""
    try:
        query_emb = await embed_text(submission_content)
        context_chunks = await query_vectors(
            query_embedding=query_emb,
            top_k=3,
            filter_dict={"course_id": str(course_id)},
            namespace=str(course_id),
        )
        course_context = "\n\n".join(
            [chunk.get("metadata", {}).get("text", "") for chunk in context_chunks]
        )
    except Exception:
        pass

    system_prompt = f"""You are an expert assignment grader. Evaluate the student submission based on the assignment requirements and rubric.

Assignment Title: {assignment_title}
Assignment Description: {assignment_description}
Assignment Rubric: {assignment_rubric}

Course Material (for reference):
{course_context}

Evaluate the submission thoroughly and provide:
1. A grade out of {max_grade}
2. Detailed feedback explaining the grade
3. Specific points for improvement

Respond in the following JSON format:
{{
    "grade": <numeric grade>,
    "feedback": "<detailed feedback>"
}}

Be fair, objective, and constructive in your evaluation."""
    
    provider = settings.AI_PROVIDER.lower().strip()
    try:
        if provider == "google":
            result = await _grade_google(system_prompt, submission_content)
        else:
            result = await _grade_azure(system_prompt, submission_content, settings)
    except Exception as exc:
        logger.exception(f"{provider.capitalize()} AI grading failed")
        raise RuntimeError(f"{provider.capitalize()} AI grading failed") from exc

    grade = float(result.get("grade", 0))
    feedback = str(result.get("feedback", ""))

    return grade, feedback
