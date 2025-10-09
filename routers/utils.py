from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import pandas as pd
from main import client

router = APIRouter()

@router.get("/panels")
def get_panels(plant: int = Query(1, description="Plant number (1 or 2)")):
    if client is None:
        return JSONResponse(status_code=503, content={"error": "Database connection unavailable"})
    
    if plant not in [1, 2]:
        return JSONResponse(status_code=400, content={"error": "Invalid plant number"})
    
    try:
        # Query InfluxDB to get distinct SOURCE_KEY values for the plant
        query = f"""
        SELECT DISTINCT("SOURCE_KEY") as SOURCE_KEY
        FROM plant{plant}
        """
        
        result = client.query(query=query, language="sql", mode="pandas")
        
        if result.empty:
            return {"panels": []}
        
        panel_ids = result["SOURCE_KEY"].tolist()
        print(f"[DEBUG] Plant {plant} has panels: {panel_ids}")
        
        return {"panels": panel_ids}
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Database query failed: {str(e)}"})

@router.get("/panel_data")
def get_panel_data(
    plant: int = Query(1, description="Plant number (1 or 2)"),
    panel: str = Query(..., description="Source Key of the panel"),
    start: str = Query(..., description="Start datetime"),
    end: str = Query(..., description="End datetime")
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
        # Query InfluxDB for specific panel data in time range
        query = f"""
        SELECT *
        FROM plant{plant}
        WHERE time >= '{start_ts.isoformat()}Z' 
            AND time <= '{end_ts.isoformat()}Z'
            AND "SOURCE_KEY" = '{panel}'
        ORDER BY time
        """
        
        result = client.query(query=query, language="sql", mode="pandas")
        
        if result.empty:
            return {"message": "No data for the specified panel in this time range."}
        
        return result.to_dict(orient="records")
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Database query failed: {str(e)}"})