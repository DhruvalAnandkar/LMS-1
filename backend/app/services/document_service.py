import io
import uuid
from fastapi import HTTPException

from app.ai.embedding import embed_documents, upsert_vectors
from app.ai.chat import process_document


def extract_text_from_bytes(content: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        try:
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            text = ""
            for page in pdf_reader.pages:
                text += (page.extract_text() or "") + "\n"
            return text
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {str(e)}")

    if content_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        try:
            import docx
            doc = docx.Document(io.BytesIO(content))
            text = "\n".join([para.text for para in doc.paragraphs])
            return text
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to extract Word text: {str(e)}")

    if content_type == "text/plain":
        return content.decode("utf-8")

    raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX, or TXT")


async def ingest_document(
    course_id: int,
    document_id: int,
    title: str,
    content_text: str,
):
    if not content_text.strip():
        raise HTTPException(status_code=400, detail="No text content found in file")

    chunks = await process_document(content_text)

    embeddings = await embed_documents(chunks)

    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        vectors.append({
            "id": f"{course_id}_{document_id}_{uuid.uuid4()}_{i}",
            "values": embedding,
            "metadata": {
                "course_id": str(course_id),
                "document_id": str(document_id),
                "text": chunk,
                "document_title": title
            }
        })

    await upsert_vectors(vectors, namespace=str(course_id))

    return {
        "chunks": len(chunks),
        "vectors": len(vectors)
    }
