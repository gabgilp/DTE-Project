import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(4, 10, 6);
scene.add(dirLight);

// Ground - Green circular grass area
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(5, 32), // Circular ground with radius 5 and 32 segments for smoothness
  new THREE.MeshStandardMaterial({ color: 0x4a7c59 }) // Green color
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Skybox - Light blue background
scene.background = new THREE.Color(0x87ceeb); // Sky blue color

// --- Create a Solar Panel Group ---
const solarPanel = new THREE.Group();

// Base - Smaller square
const base = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 0.02, 0.6), // Made it a smaller square: 0.6x0.6 instead of 0.8x0.8
  new THREE.MeshStandardMaterial({ color: 0x555555 })
);
base.position.y = 0.01;
solarPanel.add(base);

// Leg - Slightly taller to connect to panel
const leg = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 1.06, 16), // Increased from 0.8 to 0.86 to reach panel
  new THREE.MeshStandardMaterial({ color: 0x555555 })
);
leg.position.set(0, 0.45, 0); // Adjusted Y position for taller leg (half of 0.86 + base height)
leg.rotation.x = 0; // No tilt - straight vertical
solarPanel.add(leg);

// Panel bezel - Adjusted position for medium leg height
const bezel = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.05, 1.0), // Same size as before
  new THREE.MeshStandardMaterial({ color: 0x333333 })
);
bezel.rotation.x = -Math.PI / 6;
bezel.position.y = 0.85; // Adjusted for medium leg height
bezel.position.z = -0.25;
solarPanel.add(bezel);

// Inner panel - Made bigger so bezel looks smaller
const cellSurface = new THREE.Mesh(
  new THREE.BoxGeometry(1.00, 0.01, 0.90), // Increased from 0.95x0.85 to 1.05x0.95 (bigger panel)
  new THREE.MeshStandardMaterial({ color: 0x0066ff })
);
cellSurface.rotation.x = -Math.PI / 6; // Same rotation as bezel to lay flat on it
cellSurface.position.y = 0.875; // Slightly above bezel surface
cellSurface.position.z = -0.25; // Same Z position as bezel
solarPanel.add(cellSurface);

scene.add(solarPanel);

// Camera position - positioned to see the front of the angled panel
camera.position.set(2.5, 1.5, -2);
camera.lookAt(0, 0.5, -0.3); // Look at the panel area

// Simple manual orbit controls
let isMouseDown = false;
let mouseX = 0, mouseY = 0;
let cameraDistance = 4;
let cameraAngleX = 0.35; // vertical angle - reduced from 0.5 to 0.35 for less steep angle
let cameraAngleY = -0.5; // horizontal angle
const lookAtTarget = new THREE.Vector3(0, 0.3, -0.3); // lowered from Y=0.5 to Y=0.3

function updateCameraPosition() {
  camera.position.x = lookAtTarget.x + cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);
  camera.position.y = lookAtTarget.y + cameraDistance * Math.sin(cameraAngleX);
  camera.position.z = lookAtTarget.z + cameraDistance * Math.cos(cameraAngleX) * Math.sin(cameraAngleY);
  camera.lookAt(lookAtTarget);
}

// Mouse event listeners
renderer.domElement.addEventListener('mousedown', (event) => {
  isMouseDown = true;
  mouseX = event.clientX;
  mouseY = event.clientY;
});

renderer.domElement.addEventListener('mouseup', () => {
  isMouseDown = false;
});

renderer.domElement.addEventListener('mousemove', (event) => {
  if (!isMouseDown) return;
  
  const deltaX = event.clientX - mouseX;
  // Remove deltaY - no vertical movement
  
  cameraAngleY += deltaX * 0.01; // Only horizontal rotation
  // Remove cameraAngleX changes - lock vertical angle
  
  updateCameraPosition();
  
  mouseX = event.clientX;
  mouseY = event.clientY;
});

// Mouse wheel for zooming
renderer.domElement.addEventListener('wheel', (event) => {
  cameraDistance += event.deltaY * 0.01;
  cameraDistance = Math.max(1, Math.min(10, cameraDistance));
  updateCameraPosition();
});

// Set initial camera position
updateCameraPosition();

// Animation
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// --- Simulation Control Variables ---
let selectedPlant = '';
let selectedInverter = '';
let isPlaying = false;
let simulationInterval = null;
let currentTimestamp = new Date(Date.UTC(2020, 4, 15, 0, 0, 0)); // May 15, 2020 00:00:00 UTC (month is 0-indexed)
let speedMultiplier = 1; // Default speed (1x = 3 seconds)
let isFirstStart = true; // Track if this is the first start or resume

// --- UI Control Handlers ---
const plantSelect = document.getElementById('plantSelect');
const inverterSelect = document.getElementById('inverterSelect');
const playPauseBtn = document.getElementById('playPauseBtn');
const restartBtn = document.getElementById('restartBtn');
const stopBtn = document.getElementById('stopBtn');
const statusMessage = document.getElementById('statusMessage');
const speedControl = document.getElementById('speedControl');
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const jumpToTimeBtn = document.getElementById('jumpToTimeBtn');

// Plant selection handler
plantSelect.addEventListener('change', (e) => {
  selectedPlant = e.target.value;
  console.log('Selected plant:', selectedPlant);
  clearStatusMessage();
  isFirstStart = true; // Reset to start from beginning when selection changes
});

// Inverter selection handler
inverterSelect.addEventListener('change', (e) => {
  selectedInverter = e.target.value;
  console.log('Selected inverter:', selectedInverter);
  clearStatusMessage();
  isFirstStart = true; // Reset to start from beginning when selection changes
});

// Speed control handler
speedControl.addEventListener('change', (e) => {
  speedMultiplier = parseInt(e.target.value);
  console.log('Speed changed to:', speedMultiplier + 'x');
  
  // If simulation is running, restart with new speed
  if (isPlaying) {
    clearInterval(simulationInterval);
    const newInterval = 3000 / speedMultiplier; // 3 seconds divided by speed multiplier
    simulationInterval = setInterval(fetchData, newInterval);
  }
});

// Play/Pause button handler
playPauseBtn.addEventListener('click', () => {
  if (!selectedPlant || !selectedInverter) {
    showStatusMessage('Please select both Plant and Inverter first!');
    return;
  }
  
  if (isPlaying) {
    pauseSimulation();
  } else {
    startSimulation();
  }
});

// Restart button handler
restartBtn.addEventListener('click', () => {
  if (!selectedPlant || !selectedInverter) {
    showStatusMessage('Please select both Plant and Inverter first!');
    return;
  }
  
  restartSimulation();
});

// Stop button handler
stopBtn.addEventListener('click', () => {
  stopSimulation();
});

// Jump to time button handler
jumpToTimeBtn.addEventListener('click', () => {
  if (!selectedPlant || !selectedInverter) {
    showStatusMessage('Please select both Plant and Inverter first!');
    return;
  }
  
  jumpToDateTime();
});

let statusMessageTimeout = null;
let isStatusMessageProtected = false;

function showStatusMessage(message, protect = false) {
  // Clear any existing timeout
  if (statusMessageTimeout) {
    clearTimeout(statusMessageTimeout);
  }
  
  // Force clear protection when showing new message
  isStatusMessageProtected = false;
  statusMessage.textContent = message;
  
  // Set protection flag if requested
  isStatusMessageProtected = protect;
  
  // Set timeout to clear message
  statusMessageTimeout = setTimeout(() => {
    statusMessage.textContent = '';
    isStatusMessageProtected = false;
  }, 3000); // Clear after 3 seconds
}

function clearStatusMessage() {
  // Don't clear if message is protected
  if (isStatusMessageProtected) {
    return;
  }
  statusMessage.textContent = '';
}

function startSimulation() {
  isPlaying = true;
  playPauseBtn.textContent = '⏸️ Pause';
  playPauseBtn.style.background = '#f44336'; // Red for pause
  
  console.log(`Starting simulation for ${selectedPlant}, Inverter ${selectedInverter} at ${speedMultiplier}x speed`);
  
  // Only reset timestamp on first start, not when resuming
  if (isFirstStart) {
    currentTimestamp = new Date(Date.UTC(2020, 4, 15, 0, 0, 0)); // May 15, 2020 00:00:00 UTC
    isFirstStart = false;
  }
  
  // Debug: Check the timestamp immediately after creation
  console.log('Initial timestamp created:', currentTimestamp.toISOString());
  console.log('UTC Hours:', currentTimestamp.getUTCHours());
  console.log('UTC Minutes:', currentTimestamp.getUTCMinutes());
  
  // Start fetching data
  fetchData();
  const interval = 3000 / speedMultiplier; // Calculate interval based on speed
  simulationInterval = setInterval(fetchData, interval);
}

function pauseSimulation() {
  isPlaying = false;
  playPauseBtn.textContent = '▶️ Play';
  playPauseBtn.style.background = '#4CAF50'; // Green for play
  
  console.log('Simulation paused');
  
  // Stop fetching data
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function restartSimulation() {
  console.log('Restarting simulation');
  
  // Store current playing state
  const wasPlaying = isPlaying;
  
  // If currently playing, pause first to stop the interval
  if (isPlaying) {
    pauseSimulation();
  }
  
  // Reset timestamp to beginning
  currentTimestamp = new Date(Date.UTC(2020, 4, 15, 0, 0, 0)); // May 15, 2020 00:00:00 UTC
  
  // Reset the panel to blue and clear data
  cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
  document.getElementById('power').textContent = '-';
  document.getElementById('module').textContent = '-';
  document.getElementById('ambient').textContent = '-';
  document.getElementById('irradiation').textContent = '-';
  document.getElementById('timestamp').textContent = '2020-05-15 00:00:00 UTC';
  
  showStatusMessage('Simulation restarted', true); // Protect this message
  
  // If it was playing before, start playing again
  if (wasPlaying) {
    startSimulation();
  }
}

function stopSimulation() {
  console.log('Stopping simulation');
  
  // Stop the simulation if it's playing
  if (isPlaying) {
    pauseSimulation();
  }
  
  // Reset timestamp to beginning
  currentTimestamp = new Date(Date.UTC(2020, 4, 15, 0, 0, 0)); // May 15, 2020 00:00:00 UTC
  
  // Reset all selectors to their default state
  selectedPlant = null;
  selectedInverter = null;
  plantSelect.value = '';
  inverterSelect.value = '';
  speedControl.value = '1'; // Reset to 1x speed
  speedMultiplier = 1;
  
  // Reset date/time inputs to start
  dateInput.value = '2020-05-15';
  timeInput.value = '00:00';
  
  // Reset first start flag
  isFirstStart = true;
  
  // Reset the panel to blue and clear data
  cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
  document.getElementById('power').textContent = '-';
  document.getElementById('module').textContent = '-';
  document.getElementById('ambient').textContent = '-';
  document.getElementById('irradiation').textContent = '-';
  document.getElementById('timestamp').textContent = '-';
  
  showStatusMessage('Simulation stopped', true); // Protect this message
}

function jumpToDateTime() {
  console.log('Jumping to selected date/time');
  
  // Store current playing state
  const wasPlaying = isPlaying;
  
  // If currently playing, pause first to stop the interval
  if (isPlaying) {
    pauseSimulation();
  }
  
  // Parse the selected date and time
  const selectedDate = dateInput.value; // Format: YYYY-MM-DD
  const selectedTime = timeInput.value; // Format: HH:MM
  
  // Split the date and time
  const [year, month, day] = selectedDate.split('-').map(Number);
  const [hours, minutes] = selectedTime.split(':').map(Number);
  
  // Create new timestamp (month is 0-indexed in JavaScript Date)
  currentTimestamp = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  
  console.log('Jumped to timestamp:', currentTimestamp.toISOString());
  
  // Reset the panel to blue and clear data initially
  cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
  document.getElementById('power').textContent = '-';
  document.getElementById('module').textContent = '-';
  document.getElementById('ambient').textContent = '-';
  document.getElementById('irradiation').textContent = '-';
  
  // Update timestamp display
  const displayString = `${currentTimestamp.getUTCFullYear()}-${String(currentTimestamp.getUTCMonth() + 1).padStart(2, '0')}-${String(currentTimestamp.getUTCDate()).padStart(2, '0')} ${String(currentTimestamp.getUTCHours()).padStart(2, '0')}:${String(currentTimestamp.getUTCMinutes()).padStart(2, '0')}:${String(currentTimestamp.getUTCSeconds()).padStart(2, '0')} UTC`;
  document.getElementById('timestamp').textContent = displayString;
  
  showStatusMessage(`Jumped to ${displayString}`, true);
  
  // Fetch data for the new timestamp immediately
  fetchData();
  
  // If it was playing before, start playing again
  if (wasPlaying) {
    startSimulation();
  }
}

// --- Fetch and update color ---
async function fetchData() {
  if (!selectedPlant || !selectedInverter) return;
  
  try {
    // Convert plant name to number for API
    const plantNumber = selectedPlant === 'Plant1' ? '1' : '2';
    
    // Format timestamp for API (YYYY-MM-DD HH:MM:SS) - use UTC to avoid timezone issues
    const year = currentTimestamp.getUTCFullYear();
    const month = String(currentTimestamp.getUTCMonth() + 1).padStart(2, '0');
    const day = String(currentTimestamp.getUTCDate()).padStart(2, '0');
    const hours = String(currentTimestamp.getUTCHours()).padStart(2, '0');
    const minutes = String(currentTimestamp.getUTCMinutes()).padStart(2, '0');
    const seconds = String(currentTimestamp.getUTCSeconds()).padStart(2, '0');
    
    const timestampString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const url = `http://127.0.0.1:8000/replay?plant=${plantNumber}&timestamp=${encodeURIComponent(timestampString)}`;
    
    console.log('Fetching data from:', url);
    console.log('Current timestamp:', timestampString);
    
    const res = await fetch(url);
    const data = await res.json();
    
    // Increment timestamp by 15 minutes for next fetch (using UTC methods)
    currentTimestamp.setUTCMinutes(currentTimestamp.getUTCMinutes() + 15);
    
    // Check if API returned "No data found for that timestamp" message
    if (data.message && data.message === "No data found for that timestamp.") {
      // No data for any inverter at this timestamp
      console.log(`No data found for any inverter at this timestamp`);
      
      // Update timestamp display even when no data
      const displayTimestamp = new Date(currentTimestamp.getTime() - 15 * 60000);
      const displayString = `${displayTimestamp.getUTCFullYear()}-${String(displayTimestamp.getUTCMonth() + 1).padStart(2, '0')}-${String(displayTimestamp.getUTCDate()).padStart(2, '0')} ${String(displayTimestamp.getUTCHours()).padStart(2, '0')}:${String(displayTimestamp.getUTCMinutes()).padStart(2, '0')}:${String(displayTimestamp.getUTCSeconds()).padStart(2, '0')} UTC`;
      document.getElementById('timestamp').textContent = displayString;
      
      // Set panel to blue and show message
      cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
      showStatusMessage(`No data available at this time`);
      
      // Clear HUD data
      document.getElementById('power').textContent = '-';
      document.getElementById('module').textContent = '-';
      document.getElementById('ambient').textContent = '-';
      document.getElementById('irradiation').textContent = '-';
      
      return;
    }
    
    // Look for data from the selected inverter
    const inverterData = data.find(d => d.SOURCE_KEY == selectedInverter);
    
    if (!inverterData) {
      // No data for this inverter at this timestamp
      console.log(`No data found for inverter ${selectedInverter} at this timestamp`);
      
      // Update timestamp display even when no data
      const displayTimestamp = new Date(currentTimestamp.getTime() - 15 * 60000);
      const displayString = `${displayTimestamp.getUTCFullYear()}-${String(displayTimestamp.getUTCMonth() + 1).padStart(2, '0')}-${String(displayTimestamp.getUTCDate()).padStart(2, '0')} ${String(displayTimestamp.getUTCHours()).padStart(2, '0')}:${String(displayTimestamp.getUTCMinutes()).padStart(2, '0')}:${String(displayTimestamp.getUTCSeconds()).padStart(2, '0')} UTC`;
      document.getElementById('timestamp').textContent = displayString;
      
      // Set panel to blue and show message
      cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
      showStatusMessage(`No data from inverter ${selectedInverter} at this time`);
      
      // Clear HUD data
      document.getElementById('power').textContent = '-';
      document.getElementById('module').textContent = '-';
      document.getElementById('ambient').textContent = '-';
      document.getElementById('irradiation').textContent = '-';
      
      return;
    }
    
    console.log('Inverter data received:', inverterData);

    // Update timestamp display (show current timestamp before incrementing)
    const displayTimestamp = new Date(currentTimestamp.getTime() - 15 * 60000); // Show the timestamp we just fetched
    const displayString = `${displayTimestamp.getUTCFullYear()}-${String(displayTimestamp.getUTCMonth() + 1).padStart(2, '0')}-${String(displayTimestamp.getUTCDate()).padStart(2, '0')} ${String(displayTimestamp.getUTCHours()).padStart(2, '0')}:${String(displayTimestamp.getUTCMinutes()).padStart(2, '0')}:${String(displayTimestamp.getUTCSeconds()).padStart(2, '0')} UTC`;
    document.getElementById('timestamp').textContent = displayString;

    // Update HUD with inverter data
    document.getElementById('power').textContent = inverterData.AC_POWER.toFixed(2);
    document.getElementById('module').textContent = inverterData.MODULE_TEMPERATURE.toFixed(2);
    document.getElementById('ambient').textContent = inverterData.AMBIENT_TEMPERATURE.toFixed(2);
    document.getElementById('irradiation').textContent = inverterData.IRRADIATION.toFixed(2);

    // Update color (red→green based on power)
    const ratio = Math.min(inverterData.AC_POWER / 1000.0, 1.0);
    const color = new THREE.Color(1 - ratio, ratio, 0);
    cellSurface.material.color = color;
    
    // Clear any previous status message
    clearStatusMessage();

  } catch (err) {
    console.error('API error:', err);
    showStatusMessage('Error fetching data from API');
    
    // Set panel to blue on error
    cellSurface.material.color = new THREE.Color(0x0066ff);
  }
}

// Initialize with blue panel
cellSurface.material.color = new THREE.Color(0x0066ff); // Blue by default
