from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from influxdb_client_3 import InfluxDBClient3

# Initialize InfluxDB client 
client = None
try:
    client = InfluxDBClient3(
        host="http://127.0.0.1:8181",
        token="apiv3_7yspe-v_XcKVaJGo4IEyAZxL_g_SMK_6iQeb2tODrMlvKYj9cnaSYO6ut-Wbs1MWTFfxfjBJj0LoRK2oBw-Nsg",
        org="",
        database="solarplants",
        auth_scheme="Bearer"
    )
    print("[DEBUG] InfluxDB client initialized successfully")
except Exception as e:
    print(f"[WARNING] Failed to connect to InfluxDB: {e}")
    exit(1) 
    

from routers.replay import router as replay_router
from routers.utils import router as utils_router
from routers.predict import router as predict_router

app = FastAPI()

# Add CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",  # Alternative localhost
        "http://localhost:3000",  # Common React port
        "http://127.0.0.1:3000",  # Alternative
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(replay_router)
app.include_router(utils_router)
app.include_router(predict_router)


@app.get("/")
def read_root():
    return {"message": "🌞 Solar Twin Backend is running!"}
