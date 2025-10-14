# 🌞 Solar Power Digital Twin

This is a **Digital Twin project** for the course *Digital Twin Engineering*. It provides a complete system for replaying historical solar power data and generating predictions using LSTM models, with an interactive 3D visualization.

---

## 🚀 Easiest Way to Run (Recommended)

**One command to start everything:**

```bash
python3 start.py
```

This automatically:
- ✅ Creates virtual environment
- ✅ Installs all Python & Node dependencies
- ✅ Starts database, backend, and frontend
- ✅ Opens your browser automatically

👉 **See [QUICKSTART.md](QUICKSTART.md) for full guide**

---

## 📦 Manual Setup (Alternative)

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

### 3. Run the influxDB database
```bash
influxdb3 serve \
--node-id host01 \
--object-store file \
--data-dir .influxdb3 \
--max-http-request-size 16000000
```

### 4. Run the FastAPI server
```bash
uvicorn main:app --reload
```
By default, the API will run at:
🌐 http://127.0.0.1:8000

### 4. Run the frontend
```bash
npm run dev
```

By default, the frontend will run at:
🌐 http://localhost:5173
