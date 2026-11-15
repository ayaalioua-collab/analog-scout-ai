
import os
import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Analog Scout AI API",
    description="NASA data discovery and AI assistant",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://analog-scout-ai-nu.vercel.app",
        "https://analog-scout-ai.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

PDS_API = "https://pds.nasa.gov/api/search/1/products"
GROQ_API = "https://api.groq.com/openai/v1/chat/completions"


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    context: str = Field(default="", max_length=30000)


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

Your task is to explain the project's planetary analog analysis.

SCIENTIFIC RULES:
- Use supplied project context as your factual source.
- Never invent measurements, similarity scores, or NASA findings.
- Never recalculate similarity scores or distances.
- Distinguish numerical terrain similarity from geological similarity.
- A feature contribution percentage represents its share
  of the weighted squared distance, NOT its similarity percentage.
- A larger contribution means a larger influence on the distance,
  not necessarily a better match.
- Never describe two values as nearly identical unless
  the supplied numbers support that statement.
- Missing features are excluded from the calculation.
- A missing feature with 0% contribution does not mean
  that the feature matches.
- Clearly distinguish documented facts from hypotheses.
- If information is unavailable, say so.
- Explain scientific concepts in clear, concise language.
- Answer in the same language as the user's question.
- Give a direct answer before adding explanations.
"""

    user_message = f"""
PROJECT CONTEXT:
{request.context if request.context else "No project data was supplied."}

USER QUESTION:
{request.question}

Answer using only the supplied project information.
"""

    try:
        response = requests.post(
            GROQ_API,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openai/gpt-oss-20b",
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": user_message
                    }
                ],
                "temperature": 0.3,
                "reasoning_effort": "low",
                "max_completion_tokens": 1200
            },
            timeout=60
        )

        response.raise_for_status()
        data = response.json()

        if not isinstance(data, dict):
            raise ValueError("Groq returned an invalid response object.")

        choices = data.get("choices") or []

        if not choices:
            print("Groq response contains no choices.")
            raise HTTPException(
                status_code=502,
                detail="AI provider returned no response choices."
            )

        choice = choices[0] or {}
        message = choice.get("message") or {}

        answer = message.get("content")
        finish_reason = choice.get("finish_reason")

        reasoning = message.get("reasoning")
        reasoning_length = (
            len(reasoning) if isinstance(reasoning, str) else 0
        )

        usage = data.get("usage") or {}

        print(
            "Groq response:",
            {
                "finish_reason": finish_reason,
                "answer_length": len(answer) if isinstance(answer, str) else 0,
                "reasoning_length": reasoning_length,
                "usage": usage
            }
        )

        if not isinstance(answer, str) or not answer.strip():
            print(
                "Groq returned an empty final answer.",
                "Finish reason:",
                finish_reason
            )

            raise HTTPException(
                status_code=502,
                detail=(
                    "AI provider returned an empty final answer. "
                    "Please retry with a shorter question."
                )
            )

        return {
            "answer": answer.strip(),
            "model": data.get("model"),
            "service": "Groq",
            "finish_reason": finish_reason
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

    except (KeyError, IndexError, ValueError, TypeError) as error:
        print(f"Groq response parsing error: {str(error)}")

        raise HTTPException(
            status_code=502,
            detail="Invalid AI provider response."
        )
