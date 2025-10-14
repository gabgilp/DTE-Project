import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';



const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Debug: Make sure canvas is visible
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0'; // Behind UI elements
renderer.domElement.style.width = '100vw';
renderer.domElement.style.height = '100vh';



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

// --- Create Solar Panel Groups ---
function createSolarPanel(xOffset = 0, panelName = 'panel') {
  const panel = new THREE.Group();
  
  // Base - Smaller square
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.02, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  base.position.set(xOffset, 0.01, 0);
  panel.add(base);

  // Leg - Slightly taller to connect to panel
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.06, 16),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  leg.position.set(xOffset, 0.45, 0);
  leg.rotation.x = 0;
  panel.add(leg);

  // Panel bezel
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.05, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  bezel.rotation.x = -Math.PI / 6;
  bezel.position.set(xOffset, 0.85, -0.25);
  panel.add(bezel);

  // Inner panel - this will change color based on power
  const cellSurface = new THREE.Mesh(
    new THREE.BoxGeometry(1.00, 0.01, 0.90),
    new THREE.MeshStandardMaterial({ color: 0x0066ff })
  );
  cellSurface.rotation.x = -Math.PI / 6;
  cellSurface.position.set(xOffset, 0.875, -0.25);
  panel.add(cellSurface);
  
  return { group: panel, cellSurface: cellSurface };
}

// Create single panel for replay mode
const singlePanel = createSolarPanel(0, 'single');
const solarPanel = singlePanel.group;
const cellSurface = singlePanel.cellSurface;

// Create dual panels for prediction mode (initially hidden)
const actualPanel = createSolarPanel(-1.5, 'actual');
const predictedPanel = createSolarPanel(1.5, 'predicted');

// Add panels to scene
scene.add(solarPanel);
scene.add(actualPanel.group);
scene.add(predictedPanel.group);

// Add text labels for dual panels
function createTextSprite(text, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 128;
  
  context.fillStyle = 'rgba(0, 0, 0, 0.8)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  context.font = 'bold 48px Arial';
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(2, 0.5, 1);
  
  return sprite;
}

// Create labels
const actualLabel = createTextSprite('📊 ACTUAL', '#3498db');
actualLabel.position.set(-1.5, 1.8, 0);
scene.add(actualLabel);

const predictedLabel = createTextSprite('🔮 PREDICTED', '#e74c3c');
predictedLabel.position.set(1.5, 1.8, 0);
scene.add(predictedLabel);

// Show single panel by default (before mode selection)
solarPanel.visible = true; 
actualPanel.group.visible = false;
predictedPanel.group.visible = false;
actualLabel.visible = false;
predictedLabel.visible = false;

// Camera position - positioned to see the panel(s)
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

// Initialize scene - make sure it's visible from start
cellSurface.material.color = new THREE.Color(0x0066ff); // Blue by default



// Initialize with blue panel and clear data
cellSurface.material.color = new THREE.Color(0x0066ff); // Blue by default

// Initialize HUD elements safely
const powerElement = document.getElementById('power');
const moduleElement = document.getElementById('module');
const ambientElement = document.getElementById('ambient');
const irradiationElement = document.getElementById('irradiation');
const timestampElement = document.getElementById('timestamp');

if (powerElement) powerElement.textContent = '-';
if (moduleElement) moduleElement.textContent = '-';
if (ambientElement) ambientElement.textContent = '-';
if (irradiationElement) irradiationElement.textContent = '-';
if (timestampElement) timestampElement.textContent = '-';

// Ensure control panel is visible on initialization
const controlPanel = document.getElementById('controls');
if (controlPanel) {
  controlPanel.style.display = 'block';
  controlPanel.style.visibility = 'visible';
}

// Force initial render to ensure scene is visible
renderer.render(scene, camera);

// Animation
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();



// --- Global Mode Selection Functions (called from HTML onclick) ---
// These must be defined after all other variables are initialized
window.selectReplayMode = function() {
  selectMode('replay');
};

window.selectPredictionMode = function() {
  selectMode('prediction');
};



// --- Simulation Control Variables ---
let selectedPlant = '';
let selectedInverter = '';
let isPlaying = false;
let simulationInterval = null;
let currentTimestamp = new Date(Date.UTC(2020, 4, 15, 0, 0, 0)); // May 15, 2020 00:00:00 UTC (month is 0-indexed)
let speedMultiplier = 1; // Default speed (1x = 3 seconds)
let isFirstStart = true; // Track if this is the first start or resume

// --- Mode Management Variables ---
let currentMode = null; // 'replay' or 'prediction'

// --- Prediction Mode State ---
let predictionTimestamps = []; // Available timestamps for prediction
let currentPredictionIndex = 0; // Current index in timestamps array
let isPredictionInitialized = false; // Whether prediction mode is set up

// --- UI Control Handlers ---
const plantSelect = document.getElementById('plantSelect');
const inverterSelect = document.getElementById('inverterSelect');
const playPauseBtn = document.getElementById('playPauseBtn');
const restartBtn = document.getElementById('restartBtn');
const stopBtn = document.getElementById('stopBtn');
const statusMessage = document.getElementById('statusMessage');
const speedControl = document.getElementById('speedControl');
const dateInput = document.getElementById('dateInput');
const hourInput = document.getElementById('hourInput');
const minuteInput = document.getElementById('minuteInput');
const jumpToTimeBtn = document.getElementById('jumpToTimeBtn');

// --- Prediction Navigation Elements ---
const predictionNavigation = document.getElementById('predictionNavigation');
const prevTimestampBtn = document.getElementById('prevTimestampBtn');
const nextTimestampBtn = document.getElementById('nextTimestampBtn');

// --- Mode Selection Elements ---
const modeSelectionModal = document.getElementById('modeSelectionModal');
const replayModeBtn = document.getElementById('replayModeBtn');
const predictionModeBtn = document.getElementById('predictionModeBtn');
const modeSwitchBtn = document.getElementById('modeSwitchBtn');

// --- HUD Elements ---
const singlePanelData = document.getElementById('singlePanelData');
const dualPanelData = document.getElementById('dualPanelData');

// Initialize the HUD display (single panel visible by default)
setTimeout(() => {
  if (singlePanelData && dualPanelData) {
    singlePanelData.style.display = 'block';
    dualPanelData.style.display = 'none';
  }
  
  // Double-check control panel visibility
  const controlPanel = document.getElementById('controls');
  if (controlPanel) {
    controlPanel.style.display = 'block';
    controlPanel.style.visibility = 'visible';
  }
}, 100); // Small delay to ensure DOM is ready



// Plant selection handler
plantSelect.addEventListener('change', async (e) => {
  selectedPlant = e.target.value;
  clearStatusMessage();
  isFirstStart = true; // Reset to start from beginning when selection changes
  
  // Reset prediction state when plant changes
  if (currentMode === 'prediction') {
    isPredictionInitialized = false;
    predictionTimestamps = [];
    currentPredictionIndex = 0;
    
    // If both plant and inverter are selected, load prediction timestamps
    if (selectedPlant && selectedInverter) {
      try {
        const plantNumber = selectedPlant === 'Plant1' ? '1' : '2';
        await fetchPredictionTimestamps(plantNumber, selectedInverter);
      } catch (error) {
        console.error('Failed to load prediction timestamps:', error);
      }
    }
  }
});

// Inverter selection handler
inverterSelect.addEventListener('change', async (e) => {
  selectedInverter = e.target.value;
  clearStatusMessage();
  isFirstStart = true; // Reset to start from beginning when selection changes
  
  // If in prediction mode and both plant and inverter are selected, load prediction timestamps
  if (currentMode === 'prediction' && selectedPlant && selectedInverter) {
    try {
      const plantNumber = selectedPlant === 'Plant1' ? '1' : '2';
      await fetchPredictionTimestamps(plantNumber, selectedInverter);
    } catch (error) {
      console.error('Failed to load prediction timestamps:', error);
    }
  }
});

// Speed control handler
speedControl.addEventListener('change', (e) => {
  speedMultiplier = parseInt(e.target.value);
  
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
  
  if (currentMode === 'prediction') {
    // In prediction mode, this button generates predictions
    if (!isPredictionInitialized || predictionTimestamps.length === 0) {
      showStatusMessage('Please wait for prediction timestamps to load...');
      return;
    }
    generatePrediction();
  } else {
    // In replay mode, this button plays/pauses the simulation
    if (isPlaying) {
      pauseSimulation();
    } else {
      startSimulation();
    }
  }
});

// Restart button handler
restartBtn.addEventListener('click', () => {
  if (!selectedPlant || !selectedInverter) {
    showStatusMessage('Please select both Plant and Inverter first!');
    return;
  }
  
  if (currentMode === 'prediction') {
    resetPredictionView();
  } else {
    restartSimulation();
  }
});

// Stop button handler
stopBtn.addEventListener('click', () => {
  if (currentMode === 'prediction') {
    stopPredictionMode();
  } else {
    stopSimulation();
  }
});

// Prediction navigation button handlers
if (prevTimestampBtn) {
  prevTimestampBtn.addEventListener('click', goToPreviousTimestamp);
}

if (nextTimestampBtn) {
  nextTimestampBtn.addEventListener('click', goToNextTimestamp);
}

// Jump to time button handler
jumpToTimeBtn.addEventListener('click', async () => {
  if (!selectedPlant || !selectedInverter) {
    showStatusMessage('Please select both Plant and Inverter first!');
    return;
  }
  
  await jumpToDateTime();
});

// Move global functions to the end of the file after everything is loaded

// --- Mode Switch Handler ---
if (modeSwitchBtn) {
  modeSwitchBtn.addEventListener('click', () => {
    const newMode = currentMode === 'replay' ? 'prediction' : 'replay';
    selectMode(newMode);
  });
}

// --- Mode Management Functions ---
function selectMode(mode) {
  // Stop any running simulation when switching modes
  if (isPlaying) {
    pauseSimulation();
  }
  
  // Clear any simulation interval
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  
  // Reset simulation state
  isFirstStart = true;
  
  // Reset UI elements to default state
  if (currentMode === 'replay') {
    // Reset replay mode elements
    cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
    document.getElementById('power').textContent = '-';
    document.getElementById('module').textContent = '-';
    document.getElementById('ambient').textContent = '-';
    document.getElementById('irradiation').textContent = '-';
    document.getElementById('timestamp').textContent = '-';
  } else if (currentMode === 'prediction') {
    // Reset prediction mode elements
    actualPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
    predictedPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
    
    // Clear actual data
    document.getElementById('actualPower').textContent = '-';
    document.getElementById('actualModule').textContent = '-';
    document.getElementById('actualAmbient').textContent = '-';
    document.getElementById('actualIrradiation').textContent = '-';
    document.getElementById('actualTimestamp').textContent = '-';
    
    // Clear predicted data
    document.getElementById('predictionCounter').textContent = '- / -';
    document.getElementById('predictedPower').textContent = '-';
    document.getElementById('predictedModule').textContent = '-';
    document.getElementById('predictedAmbient').textContent = '-';
    document.getElementById('predictedIrradiation').textContent = '-';
    document.getElementById('predictedTimestamp').textContent = '-';
  }
  
  currentMode = mode;
  
  // Hide the modal
  modeSelectionModal.style.display = 'none';
  
  // Show the mode switch button
  if (modeSwitchBtn) {
    modeSwitchBtn.style.display = 'block';
    modeSwitchBtn.style.visibility = 'visible';
    modeSwitchBtn.classList.add('visible');
  }
  
  // Update the UI based on the selected mode
  updateUIForMode(mode);
  
  // Show welcome message
  const modeDisplayName = mode === 'replay' ? 'Replay' : 'Prediction';
  showStatusMessage(`${modeDisplayName} Mode activated! Select plant and inverter to begin.`, true);
}

function updateUIForMode(mode) {
  try {
    if (mode === 'replay') {
      
      // Update mode switch button
      modeSwitchBtn.textContent = '🔮 Switch to Prediction Mode';
      
      // Update control panel title
      document.querySelector('#controls h3').innerHTML = 'Solar Inverter Simulation<br/>Replay Mode';
      
      // Show single panel, hide dual panels
      solarPanel.visible = true;
      actualPanel.group.visible = false;
      predictedPanel.group.visible = false;
      actualLabel.visible = false;
      predictedLabel.visible = false;
      
      // Adjust camera for single panel view
      cameraDistance = 4; // Reset to default
      updateCameraPosition();
      
      // Show all replay controls
      dateInput.parentElement.style.display = 'block';
      speedControl.parentElement.style.display = 'block';
      
      // Hide prediction navigation
      if (predictionNavigation) predictionNavigation.style.display = 'none';
      
      // Show single panel HUD, hide dual panel HUD
      if (singlePanelData) singlePanelData.style.display = 'block';
      if (dualPanelData) dualPanelData.style.display = 'none';
      
      // Update button text to reflect replay functionality
      playPauseBtn.textContent = '▶️ Play';
      
      // Show restart and stop buttons in replay mode
      restartBtn.style.display = 'inline-block';
      stopBtn.style.display = 'inline-block';
      
    } else if (mode === 'prediction') {
      
      // Update mode switch button
      modeSwitchBtn.textContent = '📊 Switch to Replay Mode';
      
      // Update control panel title
      document.querySelector('#controls h3').innerHTML = 'Solar Inverter Simulation<br/>Prediction Mode';
      
      // Hide single panel, show dual panels
      solarPanel.visible = false;
      actualPanel.group.visible = true;
      predictedPanel.group.visible = true;
      actualLabel.visible = true;
      predictedLabel.visible = true;
      
      // Adjust camera for dual panel view (wider view)
      cameraDistance = 6; // Zoom out more for dual panels
      updateCameraPosition();
      
      // Show date/time navigation for jumping to specific timestamps, hide speed control
      dateInput.parentElement.style.display = 'block';
      speedControl.parentElement.style.display = 'none';
      
      // Show prediction navigation
      if (predictionNavigation) predictionNavigation.style.display = 'block';
      
      // Hide single panel HUD, show dual panel HUD
      if (singlePanelData) singlePanelData.style.display = 'none';
      if (dualPanelData) dualPanelData.style.display = 'block';
      
      // Update button text to reflect prediction functionality
      playPauseBtn.textContent = '🔮 Generate Prediction';
      
      // Hide restart and stop buttons in prediction mode
      restartBtn.style.display = 'none';
      stopBtn.style.display = 'none';
    }
    
    // Ensure control panel stays visible
    const controlPanel = document.getElementById('controls');
    if (controlPanel) {
      controlPanel.style.display = 'block';
      controlPanel.style.visibility = 'visible';
    }
    
    // Ensure mode switch button stays visible
    if (modeSwitchBtn) {
      modeSwitchBtn.style.display = 'block';
      modeSwitchBtn.style.visibility = 'visible';
      modeSwitchBtn.classList.add('visible');
    }
    
    // Force a render after mode change
    renderer.render(scene, camera);
    
  } catch (error) {
    console.error('Error updating UI for mode:', error);
  }
}

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
  

  
  // Only reset timestamp on first start, not when resuming
  if (isFirstStart) {
    currentTimestamp = new Date(Date.UTC(2020, 4, 15, 0, 0, 0)); // May 15, 2020 00:00:00 UTC
    isFirstStart = false;
  }
  

  
  // Start fetching data
  fetchData();
  const interval = 3000 / speedMultiplier; // Calculate interval based on speed
  simulationInterval = setInterval(fetchData, interval);
}

function pauseSimulation() {
  isPlaying = false;
  playPauseBtn.textContent = '▶️ Play';
  playPauseBtn.style.background = '#4CAF50'; // Green for play
  

  
  // Stop fetching data
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function restartSimulation() {
  
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
  hourInput.value = '00';
  minuteInput.value = '00';
  
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

async function jumpToDateTime() {
  
  // Store current playing state
  const wasPlaying = isPlaying;
  
  // If currently playing, pause first to stop the interval
  if (isPlaying) {
    pauseSimulation();
  }
  
  // Parse the selected date and time
  const selectedDate = dateInput.value; // Format: YYYY-MM-DD
  const selectedHour = hourInput.value; // Format: HH 
  const selectedMinute = minuteInput.value; // Format: MM
  
  // Split the date and get time values
  const [year, month, day] = selectedDate.split('-').map(Number);
  const hours = parseInt(selectedHour);
  const minutes = parseInt(selectedMinute);
  
  // Create new timestamp in local time (month is 0-indexed in JavaScript Date)
  // Use local time to match the prediction timestamps format
  const targetTimestamp = new Date(year, month - 1, day, hours, minutes, 0);
  
  if (currentMode === 'prediction') {
    // Handle prediction mode jump
    if (!isPredictionInitialized || predictionTimestamps.length === 0) {
      showStatusMessage('Please select plant and inverter first for prediction mode');
      return;
    }
    
    // Find the closest timestamp in the prediction timestamps array
    let closestIndex = 0;
    let minDiff = Infinity;
    
    for (let i = 0; i < predictionTimestamps.length; i++) {
      // Use local time interpretation for consistent comparison
      const predTimestamp = new Date(predictionTimestamps[i]);
      const diff = Math.abs(predTimestamp.getTime() - targetTimestamp.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    // Update current prediction index - this is the key fix!
    currentPredictionIndex = closestIndex;
    const selectedTimestamp = predictionTimestamps[currentPredictionIndex];
    
    // Clear prediction data first
    clearPredictionData();
    
    // Update the UI to reflect the new timestamp
    updatePredictionUI();
    
    // Load actual data for the selected timestamp
    await loadActualDataForPrediction(selectedTimestamp);
    
    const jumpedTime = new Date(selectedTimestamp);
    showStatusMessage(`Jumped to timestamp ${currentPredictionIndex + 1}/${predictionTimestamps.length}: ${jumpedTime.toLocaleString()} (UTC: ${jumpedTime.toISOString().slice(0, 19)})`, true);
    
  } else {
    // Handle replay mode jump (existing logic)
    currentTimestamp = targetTimestamp;
    
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
}

function resetPredictionView() {
  
  // Reset both panels to blue and clear data
  actualPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
  predictedPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
  
  // Clear actual data
  document.getElementById('actualPower').textContent = '-';
  document.getElementById('actualModule').textContent = '-';
  document.getElementById('actualAmbient').textContent = '-';
  document.getElementById('actualIrradiation').textContent = '-';
  document.getElementById('actualTimestamp').textContent = '-';
  
  // Clear predicted data
  document.getElementById('predictionCounter').textContent = '- / -';
  document.getElementById('predictedPower').textContent = '-';
  document.getElementById('predictedModule').textContent = '-';
  document.getElementById('predictedAmbient').textContent = '-';
  document.getElementById('predictedIrradiation').textContent = '-';
  document.getElementById('predictedTimestamp').textContent = '-';
  
  showStatusMessage('Prediction view reset. Ready to generate new prediction.', true);
}

function stopPredictionMode() {
  
  // Reset all selections
  selectedPlant = null;
  selectedInverter = null;
  plantSelect.value = '';
  inverterSelect.value = '';
  
  // Reset both panels to blue and clear data
  actualPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
  predictedPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
  
  // Clear actual data
  document.getElementById('actualPower').textContent = '-';
  document.getElementById('actualModule').textContent = '-';
  document.getElementById('actualAmbient').textContent = '-';
  document.getElementById('actualIrradiation').textContent = '-';
  document.getElementById('actualTimestamp').textContent = '-';
  
  // Clear predicted data
  document.getElementById('predictionCounter').textContent = '- / -';
  document.getElementById('predictedPower').textContent = '-';
  document.getElementById('predictedModule').textContent = '-';
  document.getElementById('predictedAmbient').textContent = '-';
  document.getElementById('predictedIrradiation').textContent = '-';
  document.getElementById('predictedTimestamp').textContent = '-';
  
  showStatusMessage('Prediction mode stopped. Select plant and inverter to begin.', true);
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
    

    
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Check if API returned "No data found for that timestamp" message
    if (data.message && data.message === "No data found for that timestamp.") {
      // No data for any inverter at this timestamp
      
      // Update timestamp display even when no data
      const displayString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
      document.getElementById('timestamp').textContent = displayString;
      
      // Set panel to blue and show message
      cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
      showStatusMessage(`No data available at this time`);
      
      // Clear HUD data
      document.getElementById('power').textContent = '-';
      document.getElementById('module').textContent = '-';
      document.getElementById('ambient').textContent = '-';
      document.getElementById('irradiation').textContent = '-';
      
      // Increment timestamp by 15 minutes for next fetch (even when no data)
      currentTimestamp.setUTCMinutes(currentTimestamp.getUTCMinutes() + 15);
      
      return;
    }
    
    // Look for data from the selected inverter
    const inverterData = data.find(d => d.SOURCE_KEY == selectedInverter);
    
    if (!inverterData) {
      // No data for this inverter at this timestamp
      
      // Update timestamp display even when no data
      const displayString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
      document.getElementById('timestamp').textContent = displayString;
      
      // Set panel to blue and show message
      cellSurface.material.color = new THREE.Color(0x0066ff); // Blue
      showStatusMessage(`No data from inverter ${selectedInverter} at this time`);
      
      // Clear HUD data
      document.getElementById('power').textContent = '-';
      document.getElementById('module').textContent = '-';
      document.getElementById('ambient').textContent = '-';
      document.getElementById('irradiation').textContent = '-';
      
      // Increment timestamp by 15 minutes for next fetch (even when no data)
      currentTimestamp.setUTCMinutes(currentTimestamp.getUTCMinutes() + 15);
      
      return;
    }
    


    // Update timestamp display (show current timestamp)
    const displayString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
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
    
    // Increment timestamp by 15 minutes for next fetch (ONLY after successful processing)
    currentTimestamp.setUTCMinutes(currentTimestamp.getUTCMinutes() + 15);

  } catch (err) {
    console.error('API error:', err);
    showStatusMessage('Error fetching data from API');
    
    // Set panel to blue on error
    cellSurface.material.color = new THREE.Color(0x0066ff);
    
    // Update timestamp display even on error
    const year = currentTimestamp.getUTCFullYear();
    const month = String(currentTimestamp.getUTCMonth() + 1).padStart(2, '0');
    const day = String(currentTimestamp.getUTCDate()).padStart(2, '0');
    const hours = String(currentTimestamp.getUTCHours()).padStart(2, '0');
    const minutes = String(currentTimestamp.getUTCMinutes()).padStart(2, '0');
    const seconds = String(currentTimestamp.getUTCSeconds()).padStart(2, '0');
    const displayString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
    document.getElementById('timestamp').textContent = displayString;
    
    // Clear HUD data on error
    document.getElementById('power').textContent = '-';
    document.getElementById('module').textContent = '-';
    document.getElementById('ambient').textContent = '-';
    document.getElementById('irradiation').textContent = '-';
    
    // Increment timestamp by 15 minutes for next fetch (even on API error)
    currentTimestamp.setUTCMinutes(currentTimestamp.getUTCMinutes() + 15);
  }
}

// --- Prediction Mode Functions ---
async function fetchPredictionTimestamps(plant, inverter) {
  try {
    const response = await fetch(`http://127.0.0.1:8000/predict/timestamps?plant=${plant}&inverter=${inverter}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    predictionTimestamps = data.timestamps;
    currentPredictionIndex = 0;
    isPredictionInitialized = true;
    
    showStatusMessage(`Loaded ${predictionTimestamps.length} prediction timestamps`, true);
    
    // Update UI to show first timestamp
    if (predictionTimestamps.length > 0) {
      updatePredictionUI();
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching prediction timestamps:', error);
    showStatusMessage('Error loading prediction timestamps. Please check your connection.');
    predictionTimestamps = [];
    isPredictionInitialized = false;
    throw error;
  }
}

function updatePredictionUI() {
  if (predictionTimestamps.length === 0) return;
  
  const currentTimestamp = predictionTimestamps[currentPredictionIndex];
  // Use local time interpretation (same as actual timestamp)
  const timestamp = new Date(currentTimestamp);
  
  // Update the prediction counter and timestamp display
  document.getElementById('predictionCounter').textContent = 
    `${currentPredictionIndex + 1} / ${predictionTimestamps.length}`;
  document.getElementById('predictedTimestamp').textContent = timestamp.toLocaleString();
  
  // Enable/disable navigation buttons
  const prevBtn = document.getElementById('prevTimestampBtn');
  const nextBtn = document.getElementById('nextTimestampBtn');
  
  if (prevBtn) prevBtn.disabled = currentPredictionIndex === 0;
  if (nextBtn) nextBtn.disabled = currentPredictionIndex === predictionTimestamps.length - 1;
  
  // Enable prediction button if we have timestamps
  const generateBtn = document.getElementById('playPauseBtn');
  if (generateBtn && currentMode === 'prediction') {
    generateBtn.disabled = false;
  }
}

function goToPreviousTimestamp() {
  if (currentPredictionIndex > 0) {
    currentPredictionIndex--;
    updatePredictionUI();
    showStatusMessage(`Moved to timestamp ${currentPredictionIndex + 1}/${predictionTimestamps.length}`);
    // Automatically generate prediction for the new timestamp
    generatePrediction();
  }
}

function goToNextTimestamp() {
  if (currentPredictionIndex < predictionTimestamps.length - 1) {
    currentPredictionIndex++;
    updatePredictionUI();
    showStatusMessage(`Moved to timestamp ${currentPredictionIndex + 1}/${predictionTimestamps.length}`);
    // Automatically generate prediction for the new timestamp
    generatePrediction();
  }
}

async function generatePrediction() {
  // Check if prediction is initialized
  if (!isPredictionInitialized || predictionTimestamps.length === 0) {
    showStatusMessage('Please select plant and inverter first to load prediction timestamps.');
    return;
  }
  
  // Show loading state
  showStatusMessage('Generating prediction...', true);
  actualPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Blue for loading (same as no data)
  predictedPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Blue for loading (same as no data)
  
  // Clear current data
  document.getElementById('actualPower').textContent = 'Loading...';
  document.getElementById('actualModule').textContent = 'Loading...';
  document.getElementById('actualAmbient').textContent = 'Loading...';
  document.getElementById('actualIrradiation').textContent = 'Loading...';
  document.getElementById('actualTimestamp').textContent = 'Loading...';
  
  document.getElementById('predictedPower').textContent = 'Generating...';
  
  // Add a 0.8-second delay to make the prediction generation feel more natural
  await new Promise(resolve => setTimeout(resolve, 800));
  
  try {
    const plantNumber = selectedPlant === 'Plant1' ? '1' : '2';
    const currentTimestamp = predictionTimestamps[currentPredictionIndex];
    
    // Step 1: Get actual historical data for the current timestamp
    let actualData = null;
    try {
      const replayUrl = `http://127.0.0.1:8000/replay?plant=${plantNumber}&timestamp=${encodeURIComponent(currentTimestamp)}`;
      const replayResponse = await fetch(replayUrl);
      const replayData = await replayResponse.json();
      actualData = replayData.find(d => d.SOURCE_KEY == selectedInverter);
    } catch (error) {
      console.error('Error fetching actual data:', error);
    }
    
    // Step 2: Generate prediction using the real API
    const predictUrl = `http://127.0.0.1:8000/predict/generate?plant=${plantNumber}&inverter=${selectedInverter}&timestamp=${encodeURIComponent(currentTimestamp)}`;
    const predictResponse = await fetch(predictUrl);
    
    if (!predictResponse.ok) {
      throw new Error(`Prediction API error: ${predictResponse.status}`);
    }
    
    const prediction = await predictResponse.json();
    
    // Update actual data UI (if available)
    if (actualData) {
      document.getElementById('actualPower').textContent = actualData.AC_POWER.toFixed(2);
      document.getElementById('actualModule').textContent = actualData.MODULE_TEMPERATURE.toFixed(2);
      document.getElementById('actualAmbient').textContent = actualData.AMBIENT_TEMPERATURE.toFixed(2);
      document.getElementById('actualIrradiation').textContent = actualData.IRRADIATION.toFixed(2);
      // Use local time interpretation (same as predicted timestamp should be)
      document.getElementById('actualTimestamp').textContent = new Date(currentTimestamp).toLocaleString();
    } else {
      // No actual data available
      document.getElementById('actualPower').textContent = 'N/A';
      document.getElementById('actualModule').textContent = 'N/A';
      document.getElementById('actualAmbient').textContent = 'N/A';
      document.getElementById('actualIrradiation').textContent = 'N/A';
      // Use local time interpretation (same as predicted timestamp should be)
      document.getElementById('actualTimestamp').textContent = new Date(currentTimestamp).toLocaleString();
    }
    
    // Update predicted data UI - only AC_POWER changes, weather data stays same as actual
    document.getElementById('predictedPower').textContent = prediction.predicted_ac_power.toFixed(2);
    
    // For weather data, use actual data if available, otherwise show same as prediction timestamp
    if (actualData) {
      document.getElementById('predictedModule').textContent = actualData.MODULE_TEMPERATURE.toFixed(2);
      document.getElementById('predictedAmbient').textContent = actualData.AMBIENT_TEMPERATURE.toFixed(2);
      document.getElementById('predictedIrradiation').textContent = actualData.IRRADIATION.toFixed(2);
    } else {
      document.getElementById('predictedModule').textContent = 'N/A';
      document.getElementById('predictedAmbient').textContent = 'N/A';
      document.getElementById('predictedIrradiation').textContent = 'N/A';
    }
    
    // Update prediction counter and timestamp - this was already set by updatePredictionUI, but refresh it
    document.getElementById('predictionCounter').textContent = 
      `${currentPredictionIndex + 1} / ${predictionTimestamps.length}`;
    document.getElementById('predictedTimestamp').textContent = new Date(currentTimestamp).toLocaleString();
    
    // Update panel colors based on power
    if (actualData) {
      const actualRatio = Math.min(actualData.AC_POWER / 1000.0, 1.0);
      const actualColor = new THREE.Color(1 - actualRatio, actualRatio, 0);
      actualPanel.cellSurface.material.color = actualColor;
    } else {
      actualPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Blue if no actual data
    }
    
    const predictedRatio = Math.min(prediction.predicted_ac_power / 1000.0, 1.0);
    const predictedColor = new THREE.Color(1 - predictedRatio, predictedRatio, 0);
    predictedPanel.cellSurface.material.color = predictedColor;
    
    showStatusMessage(`Prediction completed! AC Power: ${prediction.predicted_ac_power.toFixed(2)} kW`, true);
    
  } catch (error) {
    console.error('Prediction error:', error);
    showStatusMessage('Error generating prediction. Please try again.');
    actualPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Reset to blue
    predictedPanel.cellSurface.material.color = new THREE.Color(0x0066ff); // Reset to blue
    
    // Clear data on error
    document.getElementById('actualPower').textContent = '-';
    document.getElementById('actualModule').textContent = '-';
    document.getElementById('actualAmbient').textContent = '-';
    document.getElementById('actualIrradiation').textContent = '-';
    document.getElementById('actualTimestamp').textContent = '-';
    
    document.getElementById('predictedPower').textContent = '-';
    document.getElementById('predictedModule').textContent = '-';
    document.getElementById('predictedAmbient').textContent = '-';
    document.getElementById('predictedIrradiation').textContent = '-';
    document.getElementById('predictedTimestamp').textContent = '-';
  }
}

// Helper function to clear prediction data
function clearPredictionData() {
  // Clear predicted data
  document.getElementById('predictionCounter').textContent = '- / -';
  document.getElementById('predictedPower').textContent = '-';
  document.getElementById('predictedModule').textContent = '-';
  document.getElementById('predictedAmbient').textContent = '-';
  document.getElementById('predictedIrradiation').textContent = '-';
  document.getElementById('predictedTimestamp').textContent = '-';
  
  // Clear actual data
  document.getElementById('actualPower').textContent = '-';
  document.getElementById('actualModule').textContent = '-';
  document.getElementById('actualAmbient').textContent = '-';
  document.getElementById('actualIrradiation').textContent = '-';
  document.getElementById('actualTimestamp').textContent = '-';
  
  // Reset panel colors to blue
  actualPanel.cellSurface.material.color = new THREE.Color(0x0066ff);
  predictedPanel.cellSurface.material.color = new THREE.Color(0x0066ff);
}

// Helper function to load actual data for a prediction timestamp
async function loadActualDataForPrediction(timestamp) {
  try {
    showStatusMessage('Loading actual data...', true);
    
    // Convert timestamp to the format expected by the replay API
    const plantNumber = selectedPlant === 'Plant1' ? '1' : '2';
    const url = `http://127.0.0.1:8000/replay?plant=${plantNumber}&timestamp=${encodeURIComponent(timestamp)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const actualData = data.find(d => d.SOURCE_KEY == selectedInverter);
    
    if (actualData) {
      // Update actual data UI
      document.getElementById('actualPower').textContent = actualData.AC_POWER.toFixed(2);
      document.getElementById('actualModule').textContent = actualData.MODULE_TEMPERATURE.toFixed(2);
      document.getElementById('actualAmbient').textContent = actualData.AMBIENT_TEMPERATURE.toFixed(2);
      document.getElementById('actualIrradiation').textContent = actualData.IRRADIATION.toFixed(2);
      // Use local time interpretation (consistent with predicted timestamp)
      document.getElementById('actualTimestamp').textContent = new Date(timestamp).toLocaleString();
      
      // Update actual panel color
      const actualRatio = Math.min(actualData.AC_POWER / 1000.0, 1.0);
      const actualColor = new THREE.Color(1 - actualRatio, actualRatio, 0);
      actualPanel.cellSurface.material.color = actualColor;
      
      // Clear prediction data (prediction will be generated when user clicks the button)
      document.getElementById('predictedPower').textContent = 'Click Generate to predict';
      document.getElementById('predictedModule').textContent = actualData.MODULE_TEMPERATURE.toFixed(2);
      document.getElementById('predictedAmbient').textContent = actualData.AMBIENT_TEMPERATURE.toFixed(2);
      document.getElementById('predictedIrradiation').textContent = actualData.IRRADIATION.toFixed(2);
      
      // Don't overwrite the timestamp - keep the one set by updatePredictionUI
      // document.getElementById('predictedTimestamp').textContent = 'Awaiting prediction...';
      
      // Reset predicted panel to blue
      predictedPanel.cellSurface.material.color = new THREE.Color(0x0066ff);
      
    } else {
      throw new Error(`No data found for inverter ${selectedInverter}`);
    }
    
  } catch (error) {
    console.error('Error loading actual data:', error);
    showStatusMessage(`Error loading actual data: ${error.message}`);
    
    // Set default values on error
    document.getElementById('actualPower').textContent = 'Error';
    document.getElementById('actualModule').textContent = 'Error';
    document.getElementById('actualAmbient').textContent = 'Error';
    document.getElementById('actualIrradiation').textContent = 'Error';
    // Use local time interpretation (consistent with predicted timestamp)
    document.getElementById('actualTimestamp').textContent = new Date(timestamp).toLocaleString();
    
    // Reset panel colors to blue on error
    actualPanel.cellSurface.material.color = new THREE.Color(0x0066ff);
    predictedPanel.cellSurface.material.color = new THREE.Color(0x0066ff);
  }
}

// Initialize with blue panel
cellSurface.material.color = new THREE.Color(0x0066ff); // Blue by default
