let animationId = null;
let currentChart = null;

function startSimulation() {
    // Получаем параметры
    const latitude = parseFloat(document.getElementById('latitude').textContent);
    const height = parseFloat(document.getElementById('height').value);
    
    // Очистка предыдущей анимации
    if (animationId) cancelAnimationFrame(animationId);
    if (currentChart) currentChart.destroy();

    // Физические константы
    const g = 9.81;
    const earthRot = 7.2921159e-5;
    const rotationRate = earthRot * Math.sin(latitude * Math.PI / 180);
    const period = 2 * Math.PI * Math.sqrt(height / g);
    const rotationPeriod = (2 * Math.PI) / (Math.abs(rotationRate) * 3600);
    const simulationDuration = rotationPeriod*3600;

    // Обновляем информацию о периоде
    document.getElementById('period-value').textContent = rotationPeriod.toFixed(2);

    // 1. ПРЕДВАРИТЕЛЬНЫЙ РАСЧЕТ ВСЕХ ТОЧЕК
    const totalPoints = 500; // Количество точек для 1 минуты анимации (100 FPS)
    const timeStep = simulationDuration / totalPoints;
    
    const pendulumPoints = [];
    const chartPoints = [];
    
    const DAMPING_COEFFICIENT = 0;
    const INITIAL_ANGLE = Math.PI/6;
    const pendulumLength = 200;
    const scaleFactor = 10;
    
    // Предварительный расчет всех точек
    for (let i = 0; i < totalPoints; i++) {
        const t = i * timeStep;
        
        // Физические расчеты
        const angle = INITIAL_ANGLE * Math.exp(-DAMPING_COEFFICIENT * t) * 
                     Math.cos(2 * Math.PI * t / period);
        const rotationAngle = rotationRate * t;
        
        // Точки для маятника
        const bobX = pendulumLength * Math.sin(angle) * Math.cos(rotationAngle);
        const bobY = pendulumLength * Math.sin(angle) * Math.sin(rotationAngle);
        pendulumPoints.push({angle, bobX, bobY, t});
        
        // Точки для графика
        const x = scaleFactor * Math.sin(angle) * Math.cos(rotationAngle);
        const y = scaleFactor * Math.sin(angle) * Math.sin(rotationAngle);
        chartPoints.push({x, y});
    }

    // 2. ИНИЦИАЛИЗАЦИЯ ГРАФИКА С ПРЕДВАРИТЕЛЬНЫМИ ДАННЫМИ
    const ctx = document.getElementById('chart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Траектория',
                data: chartPoints,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                pointRadius: 0,
                borderWidth: 1,
                showLine: true,
                fill: true
            }]
        },
        options: {
            responsive: true,
            animation: { duration: 0 },
            elements: { line: { tension: 0 } },
            plugins: { legend: { display: false } },
            scales: {
                x: { min: -5, max: 5, grid: { color: 'rgba(0,0,0,0.1)' } },
                y: { min: -5, max: 5, grid: { color: 'rgba(0,0,0,0.1)' } }
            }
        }
    });

    // 3. АНИМАЦИЯ МАЯТНИКА (ИСПОЛЬЗУЕТ ПРЕДВАРИТЕЛЬНЫЕ ДАННЫЕ)
    const string = document.querySelector('.string');
    const bob = document.querySelector('.bob');
    const startTime = Date.now();
    const animationDurationMs = 60000; // 1 минута = 60000 мс
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDurationMs, 1);
        const pointIndex = Math.floor(progress * (pendulumPoints.length - 1));
        
        // Получаем предварительно рассчитанные значения
        const {angle, bobX, bobY} = pendulumPoints[pointIndex];
        
        // Применяем преобразования
        string.style.transform = `rotate(${angle * 180/Math.PI}deg)`;
        bob.style.transform = `translate(${bobX}px, ${bobY}px)`;
        
        // Подсвечиваем текущую точку на графике
        if (pointIndex % 10 === 0) { // Обновляем каждую 10-ю точку
            currentChart.data.datasets[0].pointBackgroundColor = chartPoints.map((_, i) => 
                i === pointIndex ? '#e74c3c' : 'rgba(0,0,0,0)');
            currentChart.update('none');
        }
        
        if (progress < 1) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Инициализация карты
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Обработчик клика по карте (только обновляет координаты)
map.on('click', function(e) {
    document.getElementById('latitude').textContent = e.latlng.lat.toFixed(2);
    document.getElementById('longitude').textContent = e.latlng.lng.toFixed(2);
});

// Обработчик кнопки запуска
document.getElementById('start-btn').addEventListener('click', function() {
    const height = parseFloat(document.getElementById('height').value);
    if (!height || height < 0.1 || height > 10) {
        alert("Введите высоту от 0.1 до 10 метров");
        return;
    }
    startSimulation();
});