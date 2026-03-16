from typing import Dict, Any, Tuple
from app.ai.embedding import embed_text, query_vectors
from loguru import logger


async def grade_submission(
    submission_content: str,
    assignment_title: str,
    assignment_description: str,
    assignment_rubric: str,
    course_id: int,
    max_grade: float = 100.0
) -> Tuple[float, str]:
    from app.core.config import settings
    from openai import AsyncAzureOpenAI
    
    if not settings.AZURE_OPENAI_KEY or not settings.AZURE_OPENAI_ENDPOINT:
        raise ValueError("Azure OpenAI credentials are not configured")

    client = AsyncAzureOpenAI(
        api_key=settings.AZURE_OPENAI_KEY,
        api_version=settings.AZURE_OPENAI_API_VERSION,
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
    )
    
    course_context = ""
    try:
        query_emb = await embed_text(submission_content)
        context_chunks = await query_vectors(
            query_embedding=query_emb,
            top_k=3,
            filter_dict={"course_id": str(course_id)},
            namespace=str(course_id)
        )
        course_context = "\n\n".join([
            chunk.get("metadata", {}).get("text", "")
            for chunk in context_chunks
        ])
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
    
    try:
        response = await client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": submission_content}
            ],
            temperature=0.3,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )
    except Exception as exc:
        logger.exception("Azure AI grading failed")
        raise RuntimeError("Azure AI grading failed") from exc

    response_text = response.choices[0].message.content or ""
    import json
    try:
        result = json.loads(response_text)
    except json.JSONDecodeError as exc:
        logger.warning(
            "Failed to parse AI response as JSON. response_preview={preview}",
            preview=response_text[:500],
        )
        raise ValueError("Failed to parse AI response as JSON") from exc
    
    grade = float(result.get("grade", 0))
    feedback = str(result.get("feedback", ""))
    
    return grade, feedback
