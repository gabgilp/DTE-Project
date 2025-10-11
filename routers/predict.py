from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter(
    prefix="/predict",
    tags=["predict"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
def predict_root():
    return {"message": "Predict endpoint - functionality to be implemented"}

@router.get("/test")
def predict_test():
    return {"message": "Predict test endpoint", "status": "working"}