# 🌞 Solar Twin Backend (FastAPI)

This is the backend API for our **Digital Twin project** in the course *Digital Twin Engineering*. It provides endpoints to serve weather and solar power data for further analysis, ML modeling, and visualization.

---

## 📦 Setup Instructions

### 1. Create a virtual environment (optional but recommended)
```bash
python -m venv venv
source venv/bin/activate       # On macOS/Linux
# .\venv\Scripts\activate      # On Windows
```

### 2.install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the FastAPI server
```bash
uvicorn main:app --reload
```
By default, the API will run at:
🌐 http://127.0.0.1:8000
📚 Swagger UI: http://127.0.0.1:8000/docs
