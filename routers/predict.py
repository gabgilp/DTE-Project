from fastapi import APIRouter

router = APIRouter()

@router.get("/predict")
def predict():
    return {"message": "Prediction endpoint coming soon... Stay tuned!"}