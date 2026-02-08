const API_URL = "http://127.0.0.1:5000";

// --- DOM ELEMENTS ---
const canvas = document.getElementById('signalCanvas');
const ctx = canvas.getContext('2d');
const imgInput = document.getElementById('imgInput');
const uploadBtn = document.getElementById('uploadBtn');
const floorPlanImg = document.getElementById('floorPlanImg');
const uploadHint = document.getElementById('uploadHint');
const generateBtn = document.getElementById('generateBtn'); 
const resetBtn = document.getElementById('resetBtn');
const tableBody = document.getElementById('tableBody');
const aiOutput = document.getElementById('aiOutput');
const modeSelect = document.getElementById('mode');
const espStatus = document.getElementById('espStatus');
const canvasWrapper = document.querySelector('.canvas-wrapper'); 
const downSpeedEl = document.getElementById('downSpeed');
const upSpeedEl = document.getElementById('upSpeed');
const modal = document.getElementById('locationModal');
const locNameInput = document.getElementById('locNameInput');
const confirmLocBtn = document.getElementById('confirmLocBtn');
const cancelLocBtn = document.getElementById('cancelLocBtn');

// --- VARIABLES ---
let points = []; 
let pointCount = 0;
let tempClick = { x: 0, y: 0 };
let espCheckInterval = null;
let lastHeatmapData = null; 
let bgImage = new Image(); 

// --- 1. UPLOAD & UPSCALE ---
uploadBtn.addEventListener('click', () => imgInput.click());
imgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const tempImg = new Image();
            tempImg.onload = function() {
                const maxDim = 1400;
                const scale = maxDim / Math.max(tempImg.width, tempImg.height);
                const targetWidth = tempImg.width * scale;
                const targetHeight = tempImg.height * scale;
                const offCanvas = document.createElement('canvas');
                offCanvas.width = targetWidth;
                offCanvas.height = targetHeight;
                const offCtx = offCanvas.getContext('2d');
                offCtx.drawImage(tempImg, 0, 0, targetWidth, targetHeight);
                bgImage.src = offCanvas.toDataURL('image/jpeg', 0.9);
                floorPlanImg.style.display = 'none';
                uploadHint.style.display = 'none';
            };
            tempImg.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    }
});

bgImage.onload = function() { resizeCanvas(); };
window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
    if (!bgImage.src) return;
    canvas.width = bgImage.width;
    canvas.height = bgImage.height;
    const containerRatio = canvasWrapper.clientWidth / canvasWrapper.clientHeight;
    const imageRatio = bgImage.width / bgImage.height;
    if (imageRatio > containerRatio) {
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
    } else {
        canvas.style.width = 'auto';
        canvas.style.height = '100%';
    }
    if(lastHeatmapData) redrawAll(lastHeatmapData);
    else redrawAll();
}

// --- 2. DRAWING ---
function drawDot(x, y, signal) {
    let color = "#e74c3c"; 
    if (signal > -60) color = "#27ae60"; 
    else if (signal > -75) color = "#f1c40f"; 
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2); 
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2; 
    ctx.stroke();
}

function redrawAll(heatmapData = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImage.src) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    }
    
    if (heatmapData) {
        lastHeatmapData = heatmapData;
        heatmapData.forEach(p => {
            const [hx, hy, intensity] = p;
            if (intensity < 0.1) return; 
            const hue = intensity * 120; 
            
            const radius = 150; 
            
            const gradient = ctx.createRadialGradient(hx, hy, 0, hx, hy, radius);
            gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.4)`);
            gradient.addColorStop(1, `hsla(${hue}, 70%, 60%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(hx, hy, radius, 0, Math.PI * 2); 
            ctx.fill();
        });
    }
    
    points.forEach(p => drawDot(p.x, p.y, p.signal));
}

// --- 3. INTERACTION ---
canvas.addEventListener('mousedown', (e) => {
    if (!bgImage.src) return alert("Please upload a floor plan first!");
    if (modeSelect.value === 'esp32' && espStatus.className.includes('status-offline')) {
        return alert("ESP32 is Offline.");
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;   
    const scaleY = canvas.height / rect.height;
    tempClick.x = (e.clientX - rect.left) * scaleX;
    tempClick.y = (e.clientY - rect.top) * scaleY;
    locNameInput.value = "";
    modal.style.display = 'flex'; 
    locNameInput.focus();
});

cancelLocBtn.addEventListener('click', () => modal.style.display = 'none');
confirmLocBtn.addEventListener('click', () => {
    const locationName = locNameInput.value.trim() || `Point ${pointCount + 1}`;
    modal.style.display = 'none';
    performMeasurement(tempClick.x, tempClick.y, locationName);
});
locNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') confirmLocBtn.click();
});

function performMeasurement(x, y, locName) {
    document.body.style.cursor = "wait";
    const device = modeSelect.value; 
    fetch(`${API_URL}/get-live?device=${device}`)
    .then(res => res.json())
    .then(data => {
        document.body.style.cursor = "default";
        if (data.status === 'offline' && device === 'esp32') return alert("ESP32 Lost Connection.");

        const signal = data.signal;
        points.push({x, y, signal, name: locName});
        pointCount++;
    
        redrawAll(lastHeatmapData);
        logData(pointCount, locName, signal, device);
        updateSpeed(signal);
    })
    .catch(err => {
        document.body.style.cursor = "default";
        alert("Backend Error: " + err);
    });
}

// --- 4. ANALYTICS & HEATMAP (THE TRIGGER) ---
function updateHeatmap() {
    aiOutput.innerHTML = "⏳ Analyzing Signal...";
    generateBtn.disabled = true;

    fetch(`${API_URL}/analytics`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            width: canvas.width, 
            height: canvas.height,
            points: points 
        })
    })
    .then(res => res.json())
    .then(data => {
        generateBtn.disabled = false;
        if(data.status === 'error') {
             aiOutput.innerHTML = "❌ " + data.message;
             return;
        }
        
        redrawAll(data.heatmap_data);
        aiOutput.innerHTML = data.recommendation; 
    })
    .catch(() => {
        generateBtn.disabled = false;
        aiOutput.innerHTML = "❌ Server Error";
    });
}

generateBtn.addEventListener('click', () => {
    if (pointCount < 2) return alert("Please map at least 2 points first!");
    updateHeatmap();
});

// --- 5. UTILS ---
function logData(index, name, signal, device) {
    const row = tableBody.insertRow(0);
    let status = "Weak";
    let color = "#e74c3c"; 
    if (signal > -60) { status = "Excellent"; color = "#2ecc71"; } 
    else if (signal > -75) { status = "Good"; color = "#f1c40f"; } 
    row.innerHTML = `<td>${index}</td><td style="font-weight:bold;">${name}</td><td>${signal} dBm</td><td style="color:${color}; font-weight:bold;">${status}</td>`;
}

function updateSpeed(s) {
    let baseSpeed = Math.max(0, (s + 90) * 1.66);
    downSpeedEl.innerText = Math.round(baseSpeed);
    upSpeedEl.innerText = Math.round(baseSpeed * 0.4); 
}

modeSelect.addEventListener('change', toggleEspCheck);
function toggleEspCheck() {
    if (modeSelect.value === 'laptop') {
        espStatus.style.display = 'none';
        if (espCheckInterval) clearInterval(espCheckInterval);
        return;
    }
    espStatus.style.display = 'inline-block';
    espStatus.innerText = "Connecting...";
    espStatus.className = "status-badge status-offline";
    checkEspStatus();
    espCheckInterval = setInterval(checkEspStatus, 2000);
}

function checkEspStatus() {
    fetch(`${API_URL}/get-live?device=esp32`)
    .then(res => res.json())
    .then(data => {
        if (data.status === 'online') {
            espStatus.innerText = "ESP32: Online";
            espStatus.className = "status-badge status-online";
        } else {
            espStatus.innerText = "ESP32: Offline";
            espStatus.className = "status-badge status-offline";
        }
    })
    .catch(() => {});
}

resetBtn.addEventListener('click', () => {
    if(confirm("Clear all data?")) location.reload();
});

toggleEspCheck();