
from fastapi import FastAPI, HTTPException
import requests

app = FastAPI(
    title="Analog Scout AI API",
    description="NASA planetary data discovery service",
    version="1.0.0"
)

PDS_API = "https://pds.nasa.gov/api/search/1/products"


@app.get("/")
def home():
    return {
        "project": "Analog Scout AI",
        "status": "online",
        "service": "NASA Data Discovery API"
    }


@app.get("/nasa-search")
def nasa_search(
    planet: str = "mars",
    limit: int = 10
):
    planet = planet.lower()

    if planet not in ["mars", "moon"]:
        raise HTTPException(
            status_code=400,
            detail="Planet must be mars or moon."
        )

    limit = max(1, min(limit, 50))

    params = {
        "q": planet,
        "limit": limit
    }

    try:
        response = requests.get(
            PDS_API,
            params=params,
            timeout=30
        )

        response.raise_for_status()

        data = response.json()

        return {
            "planet": planet,
            "source": "NASA Planetary Data System",
            "results": data
        }

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"NASA API request failed: {str(error)}"
        )

