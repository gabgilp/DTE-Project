#!/usr/bin/env python3
"""
Solar Power Digital Twin - Automated Launcher
This script automatically starts all required services in the correct order.
"""

import subprocess
import sys
import time
import os
import platform
import signal
import re
from pathlib import Path

# ANSI color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(message):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{message.center(70)}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.END}\n")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_step(step_number, total_steps, message):
    print(f"\n{Colors.CYAN}{Colors.BOLD}[Step {step_number}/{total_steps}] {message}{Colors.END}")

# Store process handles for cleanup
processes = []

def cleanup_processes():
    """Clean up all running processes on exit"""
    print_warning("\nShutting down all services...")
    for process_name, process in processes:
        try:
            if process and process.poll() is None:
                print_info(f"Stopping {process_name}...")
                if platform.system() == 'Windows':
                    process.terminate()
                else:
                    process.send_signal(signal.SIGINT)
                process.wait(timeout=5)
        except Exception as e:
            print_error(f"Error stopping {process_name}: {e}")
    print_success("All services stopped")

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    cleanup_processes()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def check_python_version():
    """Check if Python version is 3.8 or higher"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print_error(f"Python 3.8+ required. Current version: {version.major}.{version.minor}")
        return False
    print_success(f"Python version: {version.major}.{version.minor}.{version.micro}")
    return True

def check_command_exists(command):
    """Check if a command exists in PATH"""
    try:
        subprocess.run([command, "--version"], capture_output=True, check=False)
        return True
    except FileNotFoundError:
        return False

def get_node_version():
    """Get installed Node.js version"""
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except:
        return None

def get_npm_version():
    """Get installed npm version"""
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except:
        return None

def check_influxdb3():
    """Check if influxdb3 CLI is installed"""
    if not check_command_exists("influxdb3"):
        print_error("influxdb3 CLI not found!")
        print_info("Install from: https://github.com/InfluxCommunity/influxdb3-python")
        return False
    print_success("influxdb3 CLI found")
    return True

def check_node_npm():
    """Check if Node.js and npm are installed"""
    node_version = get_node_version()
    npm_version = get_npm_version()
    
    if not node_version:
        print_error("Node.js not found!")
        print_info("Install from: https://nodejs.org/")
        return False
    
    if not npm_version:
        print_error("npm not found!")
        return False
    
    print_success(f"Node.js version: {node_version}")
    print_success(f"npm version: {npm_version}")
    
    # Check if Node.js version is 16+
    try:
        major_version = int(node_version.replace('v', '').split('.')[0])
        if major_version < 16:
            print_warning(f"Node.js {major_version} detected. Recommended: 16+")
        return True
    except:
        return True

def setup_virtual_environment():
    """Create and activate virtual environment"""
    venv_path = Path("venv")
    
    if venv_path.exists():
        print_success("Virtual environment already exists")
        return True
    
    print_info("Creating virtual environment...")
    try:
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
        print_success("Virtual environment created")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to create virtual environment: {e}")
        return False

def get_python_executable():
    """Get the path to the Python executable in venv"""
    if platform.system() == 'Windows':
        return str(Path("venv/Scripts/python.exe"))
    else:
        return str(Path("venv/bin/python"))

def get_pip_executable():
    """Get the path to pip in venv"""
    if platform.system() == 'Windows':
        return str(Path("venv/Scripts/pip"))
    else:
        return str(Path("venv/bin/pip"))

def install_python_packages():
    """Install Python dependencies from requirements.txt"""
    pip_exe = get_pip_executable()
    
    if not Path("requirements.txt").exists():
        print_error("requirements.txt not found!")
        return False
    
    print_info("Installing Python packages (this may take a few minutes)...")
    try:
        # Upgrade pip first
        subprocess.run([pip_exe, "install", "--upgrade", "pip"], 
                      check=True, capture_output=True)
        
        # Install requirements
        result = subprocess.run([pip_exe, "install", "-r", "requirements.txt"], 
                               check=True, capture_output=True, text=True)
        print_success("Python packages installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to install Python packages")
        print_error(e.stderr if e.stderr else str(e))
        return False

def check_data_files():
    """Check if required data files exist"""
    required_files = [
        "data/Plant_1_Generation_Data.csv",
        "data/Plant_1_Weather_Sensor_Data.csv",
        "data/Plant_2_Generation_Data.csv",
        "data/Plant_2_Weather_Sensor_Data.csv",
        "ML/Plant1_inverter_Model_V2.keras",
        "ML/Plant2_inverter_Model.keras",
        "ML/prediction_timestamps_plant_1.json",
        "ML/prediction_timestamps_plant_2.json"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print_error("Missing required files:")
        for file_path in missing_files:
            print_error(f"  - {file_path}")
        return False
    
    print_success("All required data files present")
    return True

def install_frontend_packages():
    """Install npm packages for frontend"""
    simulation_path = Path("simulation")
    
    if not simulation_path.exists():
        print_error("simulation/ directory not found!")
        return False
    
    package_json = simulation_path / "package.json"
    if not package_json.exists():
        print_error("simulation/package.json not found!")
        return False
    
    node_modules = simulation_path / "node_modules"
    if node_modules.exists():
        print_success("Frontend packages already installed")
        return True
    
    print_info("Installing frontend packages...")
    try:
        subprocess.run(["npm", "install"], cwd=str(simulation_path), 
                      check=True, capture_output=True)
        print_success("Frontend packages installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to install frontend packages: {e}")
        return False

def check_database_loaded():
    """Check if InfluxDB already has data"""
    influxdb_dir = Path(".influxdb3")
    if influxdb_dir.exists() and any(influxdb_dir.iterdir()):
        print_success("Database directory exists (data may already be loaded)")
        return True
    print_info("Database directory empty or doesn't exist")
    return False

def load_database_data():
    """Load data into InfluxDB using data_prep.py"""
    if not Path("data_prep.py").exists():
        print_warning("data_prep.py not found, skipping data load")
        return True
    
    print_info("Loading data into InfluxDB...")
    print_warning("This may take 1-2 minutes...")
    
    python_exe = get_python_executable()
    try:
        result = subprocess.run([python_exe, "data_prep.py"], 
                               check=True, capture_output=True, text=True, timeout=180)
        if "successfully written" in result.stdout:
            print_success("Database data loaded successfully")
        return True
    except subprocess.TimeoutExpired:
        print_error("Data loading timed out (took > 3 minutes)")
        return False
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to load database data")
        if "Connection Successful" in e.stdout:
            print_success("Database connection OK, data may already be loaded")
            return True
        print_error(e.stdout if e.stdout else str(e))
        return False

def start_influxdb():
    """Start InfluxDB server"""
    print_info("Starting InfluxDB...")
    try:
        process = subprocess.Popen(
            ["influxdb3", "serve",
             "--node-id", "host01",
             "--object-store", "file",
             "--data-dir", ".influxdb3",
             "--max-http-request-size", "16000000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        processes.append(("InfluxDB", process))
        
        # Wait for InfluxDB to start (check for startup message)
        time.sleep(3)
        if process.poll() is not None:
            print_error("InfluxDB failed to start")
            return False, None
        
        print_success("InfluxDB started on http://127.0.0.1:8181")
        return True, process
    except Exception as e:
        print_error(f"Failed to start InfluxDB: {e}")
        return False, None

def start_backend():
    """Start FastAPI backend"""
    print_info("Starting FastAPI backend...")
    python_exe = get_python_executable()
    
    try:
        process = subprocess.Popen(
            [python_exe, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        processes.append(("Backend", process))
        
        # Wait for backend to start
        time.sleep(3)
        if process.poll() is not None:
            print_error("Backend failed to start")
            return False, None
        
        print_success("Backend started on http://127.0.0.1:8000")
        print_info("API docs available at http://127.0.0.1:8000/docs")
        return True, process
    except Exception as e:
        print_error(f"Failed to start backend: {e}")
        return False, None

def start_frontend():
    """Start Vite frontend"""
    print_info("Starting frontend...")
    
    try:
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd="simulation",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        processes.append(("Frontend", process))
        
        # Wait for frontend to start and capture the URL
        frontend_url = None
        timeout = 30
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if process.poll() is not None:
                print_error("Frontend failed to start")
                return False, None
            
            # Read output line by line
            line = process.stdout.readline()
            if line:
                # Look for Vite server URL
                if "Local:" in line or "localhost" in line:
                    # Extract URL using regex
                    match = re.search(r'https?://[^\s]+', line)
                    if match:
                        frontend_url = match.group(0)
                        break
            
            time.sleep(0.1)
        
        if not frontend_url:
            frontend_url = "http://localhost:5173"
        
        print_success(f"Frontend started on {frontend_url}")
        return True, (process, frontend_url)
    except Exception as e:
        print_error(f"Failed to start frontend: {e}")
        return False, None

def open_browser(url):
    """Open URL in default browser"""
    try:
        if platform.system() == 'Darwin':  # macOS
            subprocess.run(["open", url], check=True)
        elif platform.system() == 'Windows':
            subprocess.run(["start", url], shell=True, check=True)
        else:  # Linux
            subprocess.run(["xdg-open", url], check=True)
        print_success(f"Opened {url} in browser")
        return True
    except Exception as e:
        print_warning(f"Could not open browser automatically: {e}")
        print_info(f"Please open {url} manually")
        return False

def main():
    """Main launcher function"""
    print_header("🌞 Solar Power Digital Twin - Launcher")
    
    total_steps = 9
    current_step = 0
    
    # Step 1: Check Python version
    current_step += 1
    print_step(current_step, total_steps, "Checking Python version")
    if not check_python_version():
        sys.exit(1)
    
    # Step 2: Check prerequisites
    current_step += 1
    print_step(current_step, total_steps, "Checking prerequisites")
    if not check_influxdb3():
        sys.exit(1)
    if not check_node_npm():
        sys.exit(1)
    if not check_data_files():
        sys.exit(1)
    
    # Step 3: Setup virtual environment
    current_step += 1
    print_step(current_step, total_steps, "Setting up Python virtual environment")
    if not setup_virtual_environment():
        sys.exit(1)
    
    # Step 4: Install Python packages
    current_step += 1
    print_step(current_step, total_steps, "Installing Python dependencies")
    if not install_python_packages():
        sys.exit(1)
    
    # Step 5: Install frontend packages
    current_step += 1
    print_step(current_step, total_steps, "Installing frontend dependencies")
    if not install_frontend_packages():
        sys.exit(1)
    
    # Step 6: Start InfluxDB
    current_step += 1
    print_step(current_step, total_steps, "Starting InfluxDB")
    success, influxdb_process = start_influxdb()
    if not success:
        cleanup_processes()
        sys.exit(1)
    
    # Step 7: Load database data (if needed)
    current_step += 1
    print_step(current_step, total_steps, "Checking/Loading database data")
    if not check_database_loaded():
        if not load_database_data():
            print_warning("Database data loading failed, but continuing...")
    else:
        print_success("Database data already loaded")
    
    # Step 8: Start backend
    current_step += 1
    print_step(current_step, total_steps, "Starting backend API")
    success, backend_process = start_backend()
    if not success:
        cleanup_processes()
        sys.exit(1)
    
    # Step 9: Start frontend
    current_step += 1
    print_step(current_step, total_steps, "Starting frontend")
    success, result = start_frontend()
    if not success:
        cleanup_processes()
        sys.exit(1)
    
    frontend_process, frontend_url = result
    
    # All services started successfully
    print_header("🎉 All Services Running!")
    
    print(f"\n{Colors.BOLD}Access the application:{Colors.END}")
    print(f"  {Colors.GREEN}🌐 Frontend:{Colors.END}  {frontend_url}")
    print(f"  {Colors.BLUE}📡 Backend:{Colors.END}   http://127.0.0.1:8000")
    print(f"  {Colors.CYAN}💾 Database:{Colors.END}  http://127.0.0.1:8181")
    print(f"  {Colors.YELLOW}📚 API Docs:{Colors.END}  http://127.0.0.1:8000/docs")
    
    print(f"\n{Colors.BOLD}Press Ctrl+C to stop all services{Colors.END}\n")
    
    # Open browser after a short delay
    time.sleep(2)
    open_browser(frontend_url)
    
    # Keep script running and monitor processes
    try:
        while True:
            time.sleep(1)
            # Check if any process died
            for name, process in processes:
                if process.poll() is not None:
                    print_error(f"{name} stopped unexpectedly!")
                    cleanup_processes()
                    sys.exit(1)
    except KeyboardInterrupt:
        cleanup_processes()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        cleanup_processes()
        sys.exit(1)
