from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import pandas as pd
from main import client


router = APIRouter()

@router.get("/replay")
def replay(
    plant: int = Query(1, description="Choose plant: 1 or 2"),
    timestamp: str = Query(..., description="Format: YYYY-MM-DD HH:MM:SS")
):
    if client is None:
        return JSONResponse(status_code=503, content={"error": "Database connection unavailable"})

    try:
        ts = pd.to_datetime(timestamp)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

    if plant not in [1, 2]:
        return JSONResponse(status_code=400, content={"error": "Invalid plant number"})

    try:
        # Query InfluxDB for data at the specific timestamp
        query = f"""
        SELECT *
        FROM plant{plant}
        WHERE time = '{ts.isoformat()}Z'
        ORDER BY time
        """
        
        result = client.query(query=query, language="sql", mode="pandas")
        
        if result.empty:
            return {"message": "No data found for that timestamp."}
        
        return result.to_dict(orient="records")
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Database query failed: {str(e)}"})


@router.get("/replay_range")
def replay_range(
    plant: int = Query(1, description="Plant number (1 or 2)"),
    start: str = Query(..., description="Start datetime in YYYY-MM-DD HH:MM:SS"),
    end: str = Query(..., description="End datetime in YYYY-MM-DD HH:MM:SS")
):
    if client is None:
        return JSONResponse(status_code=503, content={"error": "Database connection unavailable"})
        
    try:
        start_ts = pd.to_datetime(start)
        end_ts = pd.to_datetime(end)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

    if plant not in [1, 2]:
        return JSONResponse(status_code=400, content={"error": "Invalid plant number"})

    try:
        # Query InfluxDB for data in the time range for the specific plant
        query = f"""
        SELECT *
        FROM plant{plant}
        WHERE time >= '{start_ts.isoformat()}Z' AND time <= '{end_ts.isoformat()}Z'
        ORDER BY time
        """
        
        result = client.query(query=query, language="sql", mode="pandas")
        
        if result.empty:
            return {"message": "No data found in the given range."}
        
        return result.to_dict(orient="records")
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Database query failed: {str(e)}"})