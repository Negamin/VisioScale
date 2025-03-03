from flask import Flask, render_template, Response, request, jsonify
import cv2
import numpy as np
import math
import os
import time
from threading import Thread

app = Flask(__name__)

# Variáveis globais para o estado da aplicação
calibration = {
    "is_calibrated": False,
    "reference_width": 0,  # cm
    "reference_height": 0,  # cm
    "pixel_ratio": 0,  # cm por pixel
}

measurements = []
room_dimensions = {"width": 0, "height": 0, "area": 0}
scanning_active = False

# Inicializar a câmera
camera = None

def init_camera():
    global camera
    camera = cv2.VideoCapture(1)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    return camera

def generate_frames():
    global camera
    if camera is None or not camera.isOpened():
        camera = init_camera()
    
    while True:
        success, frame = camera.read()
        if not success:
            break
        else:
            # Aplicar processamento de imagem se necessário
            if scanning_active:
                frame = add_scanning_visualization(frame)
            
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

def add_scanning_visualization(frame):
    """Adiciona visualização para o modo de escaneamento"""
    # Detectar bordas
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    # Encontrar contornos
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Desenhar contornos maiores
    cv2.drawContours(frame, [c for c in contours if cv2.contourArea(c) > 500], -1, (0, 255, 0), 2)
    
    # Adicionar pontos de interesse
    for i in range(20):
        x = np.random.randint(0, frame.shape[1])
        y = np.random.randint(0, frame.shape[0])
        cv2.circle(frame, (x, y), 3, (255, 0, 0), -1)
    
    # Adicionar texto informativo
    cv2.putText(frame, "Mapeando ambiente...", (20, 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
    
    return frame

def calibrate_with_reference(frame, reference_type, custom_width=None, custom_height=None):
    """Calibra o sistema com um objeto de referência"""
    # Definir dimensões do objeto de referência
    if reference_type == "credit-card":
        real_width = 8.56  # cm
        real_height = 5.398  # cm
    elif reference_type == "a4-paper":
        real_width = 21.0  # cm
        real_height = 29.7  # cm
    else:  # custom
        real_width = float(custom_width)
        real_height = float(custom_height)
    
    # Detectar objeto (simplificado para demonstração)
    # Em uma aplicação real, usaríamos algoritmos de visão computacional mais avançados
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    # Encontrar contornos
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if len(contours) > 0:
        # Pegar o maior contorno (assumindo que é o objeto de referência)
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # Calcular proporção pixel/cm
        pixel_ratio_width = real_width / w
        pixel_ratio_height = real_height / h
        pixel_ratio = (pixel_ratio_width + pixel_ratio_height) / 2
        
        # Atualizar calibração
        calibration["is_calibrated"] = True
        calibration["reference_width"] = real_width
        calibration["reference_height"] = real_height
        calibration["pixel_ratio"] = pixel_ratio
        
        return True, {"width": w, "height": h, "x": x, "y": y, "pixel_ratio": pixel_ratio}
    
    return False, None

def measure_object(frame):
    """Mede um objeto na imagem atual"""
    if not calibration["is_calibrated"]:
        return False, {"error": "Sistema não calibrado"}
    
    # Detectar objeto (simplificado)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    # Encontrar contornos
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if len(contours) > 0:
        # Pegar o maior contorno (assumindo que é o objeto de interesse)
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # Calcular dimensões reais
        real_width = round(w * calibration["pixel_ratio"], 2)
        real_height = round(h * calibration["pixel_ratio"], 2)
        
        # Adicionar à lista de medições
        new_measurement = {
            "type": "Objeto",
            "width": real_width,
            "height": real_height,
            "timestamp": time.time()
        }
        
        measurements.append(new_measurement)
        
        return True, {
            "width": real_width,
            "height": real_height,
            "pixel_dims": {"x": x, "y": y, "w": w, "h": h}
        }
    
    return False, {"error": "Nenhum objeto detectado"}

def scan_room():
    """Simula o escaneamento do ambiente"""
    global room_dimensions
    
    # Em uma implementação real, isso usaria SLAM ou ARKit/ARCore
    # Para demonstração, usamos valores simulados
    width_cm = round(np.random.uniform(300, 500), 2)
    height_cm = round(np.random.uniform(300, 500), 2)
    area_m2 = round((width_cm * height_cm) / 10000, 2)
    
    room_dimensions = {
        "width": width_cm,
        "height": height_cm,
        "area": area_m2
    }
    
    return room_dimensions

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), 
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/calibrate', methods=['POST'])
def api_calibrate():
    data = request.json
    reference_type = data.get('referenceType')
    
    # Capturar frame atual
    global camera
    if camera is None or not camera.isOpened():
        camera = init_camera()
    
    success, frame = camera.read()
    if not success:
        return jsonify({"success": False, "error": "Não foi possível capturar imagem"})
    
    # Calibrar com referência
    if reference_type == "custom":
        custom_width = data.get('width')
        custom_height = data.get('height')
        success, result = calibrate_with_reference(frame, reference_type, custom_width, custom_height)
    else:
        success, result = calibrate_with_reference(frame, reference_type)
    
    if success:
        return jsonify({"success": True, "calibration": result})
    else:
        return jsonify({"success": False, "error": "Não foi possível detectar objeto de referência"})

@app.route('/api/measure', methods=['POST'])
def api_measure():
    # Verificar calibração
    if not calibration["is_calibrated"]:
        return jsonify({"success": False, "error": "Sistema não calibrado"})
    
    # Capturar frame atual
    global camera
    if camera is None or not camera.isOpened():
        camera = init_camera()
    
    success, frame = camera.read()
    if not success:
        return jsonify({"success": False, "error": "Não foi possível capturar imagem"})
    
    # Medir objeto
    success, result = measure_object(frame)
    
    if success:
        return jsonify({"success": True, "measurement": result})
    else:
        return jsonify({"success": False, "error": result["error"]})

@app.route('/api/scan/start', methods=['POST'])
def api_scan_start():
    global scanning_active
    scanning_active = True
    return jsonify({"success": True, "scanning": True})

@app.route('/api/scan/stop', methods=['POST'])
def api_scan_stop():
    global scanning_active
    scanning_active = False
    
    # Calcular dimensões do ambiente
    room_dims = scan_room()
    
    return jsonify({
        "success": True, 
        "scanning": False,
        "room": room_dims
    })

@app.route('/api/measurements', methods=['GET'])
def api_measurements():
    return jsonify({
        "measurements": measurements,
        "room": room_dimensions
    })

@app.route('/api/reset', methods=['POST'])
def api_reset():
    global measurements, room_dimensions
    measurements = []
    room_dimensions = {"width": 0, "height": 0, "area": 0}
    return jsonify({"success": True})

if __name__ == '__main__':
    try:
        init_camera()
        app.run(host='0.0.0.0', port=5000, debug=False)
    finally:
        if camera is not None and camera.isOpened():
            camera.release()