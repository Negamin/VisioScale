// Estado da aplicação no cliente
const appState = {
    isCalibrated: false,
    isScanning: false,
    measurements: []
};

// Elementos DOM
const videoStream = document.getElementById('video-stream');
const canvasOverlay = document.getElementById('canvas-overlay');
const ctx = canvasOverlay.getContext('2d');
const measureBtn = document.getElementById('measure-btn');
const scanRoomBtn = document.getElementById('scan-room-btn');
const resetBtn = document.getElementById('reset-btn');
const startBtn = document.getElementById('start-btn');
const guideOverlay = document.getElementById('guide-overlay');
const statusIndicator = document.getElementById('status-indicator');
const measurementsList = document.getElementById('measurements-list');
const referenceSetup = document.getElementById('reference-setup');
const calibrateBtn = document.getElementById('calibrate-btn');
const referenceType = document.getElementById('reference-type');
const customReference = document.getElementById('custom-reference');
const referenceWidth = document.getElementById('reference-width');
const referenceHeight = document.getElementById('reference-height');
const loadingIndicator = document.getElementById('loading');

// Ajustar tamanho do canvas para corresponder ao vídeo
function adjustCanvasSize() {
    const videoRect = videoStream.getBoundingClientRect();
    canvasOverlay.width = videoRect.width;
    canvasOverlay.height = videoRect.height;
}

// Inicializar configurações
function init() {
    // Ajustar o canvas quando o vídeo estiver carregado
    videoStream.onload = function() {
        adjustCanvasSize();
        // Esconder o indicador de carregamento após carregar o vídeo
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
            statusIndicator.textContent = 'Pronto para calibrar';
        }, 2000);
    };
    
    // Ajustar canvas ao redimensionar janela
    window.addEventListener('resize', adjustCanvasSize);
    
    // Inicializar eventos
    setupEventListeners();
}

// Configurar event listeners
function setupEventListeners() {
    startBtn.addEventListener('click', () => {
        guideOverlay.classList.add('hidden');
        referenceSetup.classList.add('active');
    });
    
    referenceType.addEventListener('change', () => {
        if (referenceType.value === 'custom') {
            customReference.style.display = 'block';
        } else {
            customReference.style.display = 'none';
        }
    });
    
    calibrateBtn.addEventListener('click', calibrateCamera);
    measureBtn.addEventListener('click', measureObject);
    scanRoomBtn.addEventListener('click', toggleRoomScan);
    resetBtn.addEventListener('click', resetMeasurements);
}

// Calibrar câmera com objeto de referência
async function calibrateCamera() {
    statusIndicator.textContent = 'Calibrando...';
    
    const data = {
        referenceType: referenceType.value
    };
    
    if (referenceType.value === 'custom') {
        const width = referenceWidth.value;
        const height = referenceHeight.value;
        
        if (!width || !height) {
            alert('Por favor, insira dimensões válidas para o objeto de referência.');
            return;
        }
        
        data.width = width;
        data.height = height;
    }
    
    try {
        const response = await fetch('/api/calibrate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            appState.isCalibrated = true;
            drawCalibrationResult(result.calibration);
            statusIndicator.textContent = 'Calibrado! Pronto para medir';
            referenceSetup.classList.remove('active');
            
            // Atualizar lista de medições após calibração
            fetchMeasurements();
        } else {
            statusIndicator.textContent = 'Erro na calibração';
            alert(`Erro na calibração: ${result.error}`);
        }
    } catch (error) {
        console.error('Erro ao calibrar:', error);
        statusIndicator.textContent = 'Erro na calibração';
    }
}

// Medir objeto atual
async function measureObject() {
    if (!appState.isCalibrated) {
        alert('Por favor, calibre a câmera primeiro usando um objeto de referência.');
        referenceSetup.classList.add('active');
        return;
    }
    
    statusIndicator.textContent = 'Medindo...';
    
    try {
        const response = await fetch('/api/measure', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            drawMeasurementResult(result.measurement);
            statusIndicator.textContent = `Objeto: ${result.measurement.width}cm x ${result.measurement.height}cm`;
            
            // Atualizar lista de medições
            fetchMeasurements();
        } else {
            statusIndicator.textContent = 'Erro na medição';
            alert(`Erro na medição: ${result.error}`);
        }
    } catch (error) {
        console.error('Erro ao medir:', error);
        statusIndicator.textContent = 'Erro na medição';
    }
}

// Alternar escaneamento de ambiente
async function toggleRoomScan() {
    if (!appState.isCalibrated) {
        alert('Por favor, calibre a câmera primeiro usando um objeto de referência.');
        referenceSetup.classList.add('active');
        return;
    }
    
    if (!appState.isScanning) {
        // Iniciar escaneamento
        statusIndicator.textContent = 'Mapeando ambiente...';
        scanRoomBtn.textContent = 'Parar Mapeamento';
        
        try {
            const response = await fetch('/api/scan/start', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                appState.isScanning = true;
            }
        } catch (error) {
            console.error('Erro ao iniciar escaneamento:', error);
        }
    } else {
        // Parar escaneamento
        statusIndicator.textContent = 'Finalizando mapeamento...';
        scanRoomBtn.textContent = 'Mapear Ambiente';
        
        try {
            const response = await fetch('/api/scan/stop', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                appState.isScanning = false;
                
                // Atualizar com as dimensões do ambiente
                statusIndicator.textContent = `Ambiente: ${result.room.width}cm x ${result.room.height}cm`;
                
                // Atualizar lista de medições
                fetchMeasurements();
            }
        } catch (error) {
            console.error('Erro ao finalizar escaneamento:', error);
        }
    }
}

// Limpar todas as medições
async function resetMeasurements() {
    try {
        const response = await fetch('/api/reset', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Limpar canvas
            clearCanvas();
            
            // Atualizar lista de medições
            fetchMeasurements();
            
            statusIndicator.textContent = 'Medições apagadas';
        }
    } catch (error) {
        console.error('Erro ao resetar medições:', error);
    }
}

// Buscar medições atuais
async function fetchMeasurements() {
    try {
        const response = await fetch('/api/measurements');
        const data = await response.json();
        
        updateMeasurementsList(data.measurements, data.room);
    } catch (error) {
        console.error('Erro ao buscar medições:', error);
    }
}

// Atualizar lista de medições na interface
function updateMeasurementsList(measurements, room) {
    let html = '';
    
    // Dimensões do ambiente
    if (room.width > 0) {
        html += `
        <div class="measurement-item">
            <span><strong>Total do ambiente</strong></span>
            <span>${room.width}cm x ${room.height}cm (${room.area}m²)</span>
        </div>`;
    } else {
        html += `
        <div class="measurement-item">
            <span><strong>Total do ambiente</strong></span>
            <span>Ainda não medido</span>
        </div>`;
    }
    
    // Objetos individuais
    measurements.forEach((m, index) => {
        html += `
        <div class="measurement-item">
            <span>${m.type} ${index + 1}</span>
            <span>${m.width}cm x ${m.height}cm</span>
        </div>`;
    });
    
    measurementsList.innerHTML = html;
}

// Desenhar resultados da calibração
function drawCalibrationResult(calibration) {
    clearCanvas();
    
    // Desenhar retângulo ao redor do objeto de referência
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.strokeRect(calibration.x, calibration.y, calibration.width, calibration.height);
    
    // Adicionar pontos nos cantos
    ctx.fillStyle = '#e74c3c';
    const corners = [
        {x: calibration.x, y: calibration.y},
        {x: calibration.x + calibration.width, y: calibration.y},
        {x: calibration.x + calibration.width, y: calibration.y + calibration.height},
        {x: calibration.x, y: calibration.y + calibration.height}
    ];
    
    corners.forEach(corner => {
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Desenhar resultados da medição
function drawMeasurementResult(measurement) {
    clearCanvas();
    
    const { x, y, w, h } = measurement.pixel_dims;
    
    // Desenhar retângulo ao redor do objeto
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    
    // Adicionar pontos nos cantos
    ctx.fillStyle = '#e74c3c';
    const corners = [
        {x: x, y: y},
        {x: x + w, y: y},
        {x: x + w, y: y + h},
        {x: x, y: y + h}
    ];
    
    corners.forEach(corner => {
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Adicionar dimensões como texto
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 0.5;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    
    // Largura
    ctx.fillText(
        `${measurement.width}cm`,
        x + w/2,
        y - 10
    );
    ctx.strokeText(
        `${measurement.width}cm`,
        x + w/2,
        y - 10
    );
    
    // Altura
    ctx.fillText(
        `${measurement.height}cm`,
        x + w + 20,
        y + h/2
    );
    ctx.strokeText(
        `${measurement.height}cm`,
        x + w + 20,
        y + h/2
    );
}

// Limpar o canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', init);