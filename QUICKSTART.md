# Quick Start Guide

## One-Command Launcher (Recommended)

The easiest way to run the entire Solar Power Digital Twin:

```bash
python3 start.py
```

That's it! The script will automatically:
1. Check all prerequisites (Python, Node.js, InfluxDB CLI)
2. Create a virtual environment
3. Install all Python dependencies
4. Install all frontend dependencies  
5. Start InfluxDB database
6. Load data (if needed)
7. Start backend API
8. Start frontend
9. Open your browser to the application

**No manual setup required!**

---

## Prerequisites

Before running `start.py`, you need these installed:

### Required:
- **Python >=3.8 and  <3.13** (check: `python3 --version`)
- **Node.js 16+** (check: `node --version`)
- **npm** (check: `npm --version`)
- **InfluxDB 3 CLI** ([Download](https://github.com/InfluxCommunity/influxdb3-python))

### The script handles automatically:
- Creating Python virtual environment
- Installing all Python packages (FastAPI, TensorFlow, etc.)
- Installing all Node packages (Vite, etc.)
- Loading database data
- Starting all services
- Opening browser

---

## What Gets Started

When you run `start.py`, it launches:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | 3D visualization interface |
| **Backend** | http://127.0.0.1:8000 | FastAPI REST API |
| **Database** | http://127.0.0.1:8181 | InfluxDB time-series database |
| **API Docs** | http://127.0.0.1:8000/docs | Interactive API documentation |

---

## Usage

### Start Everything
```bash
python3 start.py
```

The script will:
- Show colored progress for each step
- Automatically open your browser when ready
- Keep running until you press `Ctrl+C`

### Stop Everything
Press `Ctrl+C` in the terminal

The script will gracefully shut down all services.

---

## Manual Setup (Alternative)

If you prefer to run services manually:

### 1. Install Dependencies
```bash
# Python dependencies
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Frontend dependencies
cd simulation
npm install
cd ..
```

### 2. Start Services (3 separate terminals)

**Terminal 1 - Database:**
```bash
influxdb3 serve \
  --node-id host01 \
  --object-store file \
  --data-dir .influxdb3 \
  --max-http-request-size 16000000
```

**Terminal 2 - Backend:**
```bash
source venv/bin/activate
uvicorn main:app
```

**Terminal 3 - Frontend:**
```bash
cd simulation
npm run dev
```

### 3. Load Data (First Time Only)
```bash
source venv/bin/activate
python data_prep.py
```

---

## Troubleshooting

### Script fails at prerequisites check

**Problem:** Missing Python, Node.js, or InfluxDB CLI

**Solution:**
- Install Python 3.8+: https://www.python.org/
- Install Node.js 16+: https://nodejs.org/
- Install InfluxDB 3 CLI: https://github.com/InfluxCommunity/influxdb3-python

### Port already in use

**Problem:** `Address already in use` error

**Solution:** Kill existing processes:
```bash
# macOS/Linux
lsof -ti:8000 | xargs kill  # Backend
lsof -ti:8181 | xargs kill  # Database
lsof -ti:5173 | xargs kill  # Frontend

# Or use the Activity Monitor / Task Manager
```

### Data loading fails

**Problem:** Database data won't load

**Solution:**
1. Delete existing database: `rm -rf .influxdb3`
2. Run script again: `python3 start.py`

### Virtual environment issues

**Problem:** Virtual environment creation fails

**Solution:**
```bash
# Delete old venv
rm -rf venv

# Install venv module
python3 -m pip install --user virtualenv

# Try again
python3 start.py
```

### Frontend won't start

**Problem:** npm packages won't install

**Solution:**
```bash
# Clear npm cache
cd simulation
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Try again
cd ..
python3 start.py
```

---

## Features

- **Automatic dependency installation**
- **Sequential service startup with error checking**
- **Colored terminal output for easy monitoring**
- **Automatic browser launch**
- **Graceful shutdown of all services**
- **Virtual environment isolation**
- **Database data loading**
- **Process monitoring**

---

## For Reviewers/Instructors

To run this project:

1. Ensure prerequisites are installed (Python, Node.js, InfluxDB CLI)
2. Run: `python3 start.py`
3. Wait for browser to open automatically
4. Select "Replay Mode" or "Prediction Mode"
5. Choose Plant 1, Inverter 1
6. Press Play or Generate Prediction

**That's it!** No manual configuration needed.

---

## Project Structure

```
DTE-Project/
├── start.py              ← Run this to start everything!
├── main.py               ← FastAPI backend
├── data_prep.py          ← Database data loader
├── requirements.txt      ← Python dependencies
├── data/                 ← CSV data files
├── simulation/           ← Frontend code
│   ├── main.js          ← 3D visualization
│   ├── index.html       ← UI
│   └── package.json     ← Node dependencies
└── *.keras               ← LSTM models
```

---

## Additional Resources

- **Docker Setup:** See [DOCKER_SETUP.md](DOCKER_SETUP.md) for containerized deployment
- **Full Documentation:** See main [README.md](README.md)
- **API Documentation:** http://127.0.0.1:8000/docs (after starting services)
