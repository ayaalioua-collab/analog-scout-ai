
import os
import requests

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="Analog Scout AI API",
    description="NASA data discovery and AI assistant",
    version="1.0.0"
)

PDS_API = "https://pds.nasa.gov/api/search/1/products"
GROQ_API = "https://api.groq.com/openai/v1/chat/completions"


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    context: str = Field(default="", max_length=12000)


@app.get("/")
def home():
    return {
        "project": "Analog Scout AI",
        "status": "online",
        "service": "NASA Data Discovery and AI Assistant"
    }


@app.get("/nasa-search")
def nasa_search(planet: str = "mars", limit: int = 10):
    planet = planet.lower()

    if planet not in ["mars", "moon"]:
        raise HTTPException(
            status_code=400,
            detail="Planet must be mars or moon."
        )

    limit = max(1, min(limit, 50))

    try:
        response = requests.get(
            PDS_API,
            params={"q": planet, "limit": limit},
            timeout=30
        )
        response.raise_for_status()

        return {
            "planet": planet,
            "source": "NASA Planetary Data System",
            "results": response.json()
        }

    except requests.RequestException as error:
        print(f"NASA API error: {str(error)}")
        raise HTTPException(
            status_code=502,
            detail="NASA API request failed."
        )


@app.post("/ai-chat")
def ai_chat(request: ChatRequest):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured."
        )

    system_prompt = """
You are the scientific assistant of Analog Scout AI.

Your job is to explain the project's planetary analog analysis.

Rules:
- Use the supplied project context as your factual source.
- Never invent measurements, similarity scores, or NASA findings.
- Never recalculate the similarity scores.
- Clearly distinguish known facts from hypotheses and suggestions.
- If information is missing, say so honestly.
- Explain scientific concepts in simple, clear language.
- Answer in the same language as the user's question.
"""

    user_message = f"""
PROJECT CONTEXT:
{request.context if request.context else "No project data was supplied."}

USER QUESTION:
{request.question}
"""

    try:
        response = requests.post(
            GROQ_API,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": os.getenv(
                    "GROQ_MODEL",
                    "llama-3.3-70b-versatile"
                ),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "temperature": 0.3,
                "max_tokens": 700
            },
            timeout=60
        )

        response.raise_for_status()
        data = response.json()

        answer = data["choices"][0]["message"]["content"]

        return {
            "answer": answer,
            "model": data.get("model"),
            "service": "Groq"
        }

    except requests.RequestException as error:
        if error.response is not None:
            print(
                f"Groq API error {error.response.status_code}: "
                f"{error.response.text[:1000]}"
            )
        else:
            print(f"Groq connection error: {str(error)}")

        raise HTTPException(
            status_code=502,
            detail="AI provider request failed. Check server logs."
        )

    except (KeyError, IndexError, ValueError) as error:
        print(f"Groq response parsing error: {str(error)}")
        raise HTTPException(
            status_code=502,
            detail="Invalid AI provider response."
        )
