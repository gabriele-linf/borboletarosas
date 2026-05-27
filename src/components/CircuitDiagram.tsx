import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { Eye, ShieldAlert, Thermometer, Radio, Volume2, Sparkles, Move } from 'lucide-react';
import { SensorData } from '../types';

// Coordenadas para formar um coração simétrico de LEDs em uma placa de prototipagem (desenho do usuário)
const heartOffsets = [
  { dx: 0, dy: 30 },     // Ponta inferior do coração
  { dx: -12, dy: 18 },   // Diagonal inferior esquerda
  { dx: 12, dy: 18 },    // Diagonal inferior direita
  { dx: -24, dy: 6 },    // Lateral inferior esquerda
  { dx: 24, dy: 6 },     // Lateral inferior direita
  { dx: -30, dy: -6 },   // Lateral superior esquerda
  { dx: 30, dy: -6 },    // Lateral superior direita
  { dx: -26, dy: -18 },  // Curva superior externa esquerda
  { dx: 26, dy: -18 },   // Curva superior externa direita
  { dx: -14, dy: -24 },  // Pico do lobo esquerdo
  { dx: 14, dy: -24 },   // Pico do lobo direito
  { dx: -5, dy: -15 },   // Junção interna esquerda
  { dx: 5, dy: -15 },    // Junção interna direita
  { dx: 0, dy: -6 },     // Centro interno superior do coração
];

interface CircuitDiagramProps {
  sensorData: SensorData;
  threshold: number;
  onTogglePresence: () => void;
  onUpdateTemperature: (temp: number) => void;
}

export default function CircuitDiagram({
  sensorData,
  threshold,
  onTogglePresence,
  onUpdateTemperature,
}: CircuitDiagramProps) {
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [butterflyPos, setButterflyPos] = useState({ x: 100, y: 130 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Sincroniza o posicionamento da borboleta caso o acionamento venha de fora (botões ou console) e não de um arraste físico ativo
  useEffect(() => {
    if (!isDragging) {
      if (sensorData.presence) {
        setButterflyPos({ x: 490, y: 150 });
      } else {
        setButterflyPos({ x: 100, y: 130 });
      }
    }
  }, [sensorData.presence, isDragging]);

  const handleMove = (clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    
    const scaleX = 800 / rect.width;
    const scaleY = 420 / rect.height;
    
    const svgX = rawX * scaleX;
    const svgY = rawY * scaleY;
    
    // Limita a borboleta nas bordas visíveis do SVG
    const constrainedX = Math.max(30, Math.min(770, svgX));
    const constrainedY = Math.max(30, Math.min(390, svgY));
    
    setButterflyPos({ x: constrainedX, y: constrainedY });
    
    // Distância até o módulo detector PIR (foco do feixe óptico em ~490, 220)
    const distToSensor = Math.hypot(constrainedX - 490, constrainedY - 220);
    
    // Raio de ativação de 95px
    const isClose = distToSensor < 95;
    
    if (isClose && !sensorData.presence) {
      onTogglePresence();
    } else if (!isClose && sensorData.presence) {
      onTogglePresence();
    }
  };

  // Trata arraste global de forma resiliente tanto no Desktop quanto no Mobile,
  // permitindo arrastar mesmo se o cursor sair temporariamente do SVG e
  // impedindo rolagem da página APENAS durante o arraste ativo!
  useEffect(() => {
    if (!isDragging) return;

    // Bloqueia rolagem do documento e gestos de arrastar viewport temporariamente
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalUserSelect = document.body.style.userSelect;

    const mainEl = document.querySelector('main');
    const originalMainOverflow = mainEl ? mainEl.style.overflow : '';
    const originalMainTouchAction = mainEl ? mainEl.style.touchAction : '';

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.userSelect = 'none';

    if (mainEl) {
      mainEl.style.overflow = 'hidden';
      mainEl.style.touchAction = 'none';
    }

    const handleWindowMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        // Evita puxar/scrollar a viewport do navegador apenas enquanto o usuário estiver arrastando a borboleta
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchend', handleWindowMouseUp);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.userSelect = originalUserSelect;

      if (mainEl) {
        mainEl.style.overflow = originalMainOverflow;
        mainEl.style.touchAction = originalMainTouchAction;
      }

      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, [isDragging]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    e.preventDefault(); // Impede focar texto ou arrastar imagem fantasma
  };
  
  // Calculate voltage and reading representation on standard scale
  // TMP36: 10mV/°C, 500mV offset. So V = (Temp * 0.01) + 0.5. At 25C: 0.75V. At 100C: 1.5V. 
  const voltage = (sensorData.temperature * 0.01) + 0.5;
  const rawAnalog = Math.round((voltage / 5.0) * 1023);

  const getComponentExplanation = (comp: string) => {
    switch (comp) {
      case 'arduino':
        return 'GR-SAKURA (Arduino Core): Placa de desenvolvimento rosa estilizada de alto desempenho. Processa os sensores residenciais e orquestra a tomada de decisão.';
      case 'pir':
        return 'Sensor PIR (Pino 2): Sensor infravermelho passivo com encaixes rosa pastel. Detecta movimento físico de corpos quentes no ambiente.';
      case 'tmp36':
        return `Sensor Térmico TMP36 (Pino A0): Mede a temperatura ambiente linearmente (+10mV por grau Celsius). Leitura de hoje: ${sensorData.temperature.toFixed(1)}°C (${rawAnalog} unidades ADC).`;
      case 'led':
        return `LED Indicador (Pino 13): Sinalização visual em azul pastel/rosa de alerta. ${sensorData.presence ? 'Iluminado pela lógica inteligente!' : 'Em repouso.'}`;
      case 'buzzer':
        return `Buzzer Piezo (Pino 8): Transdutor sonoro. Emite alertas intermitentes quando as condições térmicas ultrapassam o limite de perigo (${threshold}°C).`;
      case 'resistor':
        return 'Resistor de 220Ω: Protege o LED contra sobrecorrentes elétricas, regulando a tensão regulamentar de saída do pino digital.';
      case 'heart-board':
        return `Placa Cooper Heart (Pinos 13 & GND): Matriz de prototipagem acobertando 14 micro-LEDs dispostos em formato de coração. ${sensorData.presence ? 'Super iluminada em luz neon rosa/vermelha pelo sinal detectado da borboleta!' : 'Em espera. Simule o movimento ou arraste a borboleta com o mouse para o sensor!'}`;
      case 'butterfly':
        return 'Borboleta Interativa: Voo dinâmico e gracioso. CLIQUE E ARRASTE COM O MOUSE para aproximar a borboleta do sensor PIR (globo branco) e ver o coração de LEDs pulsar!';
      default:
        return 'Mova o cursor sobre as conexões elétricas e chips para explorar os detalhes didáticos do circuito!';
    }
  };

  const isAlarmOn = sensorData.temperature > threshold;

  return (
    <div className="bg-pink-50/70 backdrop-blur rounded-2xl border-2 border-pink-200/60 p-6 shadow-md flex flex-col justify-between h-[620px] transition-all">
      {/* Top Controls Banner on the diagram board */}
      <div className="flex items-center justify-between border-b border-pink-100 pb-3 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-500 animate-pulse" />
          <h3 className="font-bold text-pink-700 text-sm tracking-widest uppercase font-serif">Simulação: GR-SAKURA CORE</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-pink-600 font-mono font-bold bg-white/80 px-2.5 py-0.5 rounded-full border border-pink-100">
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
          CIRCUITO ROSA ONLINE
        </div>
      </div>

      {/* Embedded interactive workspace diagram - beautifully layered */}
      <div className="flex-1 relative bg-[#180a13] rounded-xl p-2 flex items-center justify-center border-2 border-pink-100/30 overflow-hidden select-none touch-none shadow-inner">
        {/* Decorative Circuit background tracks mimicking image 1 */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0 50 L 200 50 L 250 100 L 400 100 L 450 150 L 800 150" fill="none" stroke="#f472b6" strokeWidth="1.5" />
            <path d="M 100 0 L 100 200 L 150 250 L 300 250 L 350 400" fill="none" stroke="#f472b6" strokeWidth="1.2" />
            <path d="M 500 400 L 600 300 L 700 300 L 800 200" fill="none" stroke="#f472b6" strokeWidth="1.5" />
            <circle cx="200" cy="50" r="3" fill="#ec4899" />
            <circle cx="400" cy="100" r="3" fill="#ec4899" />
            <circle cx="150" cy="250" r="3" fill="#ec4899" />
            <circle cx="700" cy="300" r="3" fill="#ec4899" />
          </svg>
        </div>

        {/* SVG Drawing layout */}
        <svg
          ref={svgRef}
          viewBox="0 0 800 420"
          className="w-full h-full max-h-[380px] relative z-10 select-none touch-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* BACKGROUND BREADBOARD in matching soft tones */}
          <rect
            id="breadboard"
            x="50"
            y="260"
            width="700"
            height="130"
            rx="12"
            fill="#fff3f5"
            stroke="#fbcfe8"
            strokeWidth="3"
          />
          {/* Breadboard grid tie-points (simulated holes) */}
          {Array.from({ length: 48 }).map((_, i) => (
            <g key={i}>
              <circle cx={90 + (i * 13.5)} cy="280" r="1.5" fill="#f43f5e" opacity="0.3" />
              <circle cx={90 + (i * 13.5)} cy="295" r="1.5" fill="#f43f5e" opacity="0.3" />
              <circle cx={90 + (i * 13.5)} cy="325" r="1.5" fill="#f43f5e" opacity="0.3" />
              <circle cx={90 + (i * 13.5)} cy="340" r="1.5" fill="#f43f5e" opacity="0.3" />
              <circle cx={90 + (i * 13.5)} cy="355" r="1.5" fill="#f43f5e" opacity="0.3" />
              <circle cx={90 + (i * 13.5)} cy="370" r="1.5" fill="#f43f5e" opacity="0.3" />
            </g>
          ))}
          {/* Breadboard lines and numbers */}
          <line x1="50" y1="310" x2="750" y2="310" stroke="#ff85a1" strokeWidth="1.5" strokeDasharray="5 3" />
          <line x1="50" y1="380" x2="750" y2="380" stroke="#90e0ef" strokeWidth="1.5" strokeDasharray="5 3" />

          {/* ARDUINO SAKURA BOARD */}
          <g
            id="arduino-board"
            className="cursor-pointer transition-transform hover:scale-[1.01]"
            onMouseEnter={() => setHoveredComponent('arduino')}
            onMouseLeave={() => setHoveredComponent(null)}
          >
            {/* PCB Board Pink Substrate */}
            <rect x="180" y="20" width="300" height="200" rx="16" fill="#f472b6" stroke="#ffb3c1" strokeWidth="4" />
            <rect x="184" y="24" width="292" height="192" rx="14" fill="#f3a6c8" />
            
            {/* Silkscreen Decorative Circuits inside board (Golden Trace networks) */}
            <path d="M 200 60 L 230 60 L 250 80" fill="none" stroke="#fbbf24" strokeWidth="1.2" opacity="0.8" />
            <path d="M 390 150 L 410 150 L 440 180" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.8" />
            <path d="M 300 130 C 320 130 350 160 380 160" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.8" />
            <circle cx="250" cy="80" r="2.5" fill="#fbbf24" />
            <circle cx="380" cy="160" r="2.5" fill="#fbbf24" />

            {/* Silkscreen text logo "GR-SAKURA" in nice elegant font */}
            <text x="330" y="55" fill="#ffffff" fontSize="11" fontFamily="sans-serif" fontWeight="bold" letterSpacing="1" textAnchor="middle">GR-SAKURA</text>
            <text x="330" y="66" fill="#fbcfe8" fontSize="7" fontFamily="monospace" textAnchor="middle">CORTEX-M3 / RUN EDITION</text>
            
            {/* Header Pins block Digital (Pastel Pink-violet) */}
            <rect x="200" y="20" width="260" height="12" fill="#4c0519" rx="2" />
            <text x="210" y="15" fill="#ffccd5" fontSize="7" fontFamily="monospace">DIGITAL INTERFACE</text>
            
            {/* Header Pins block Analog / Power */}
            <rect x="250" y="188" width="210" height="12" fill="#4c0519" rx="2" />
            <text x="260" y="212" fill="#ffccd5" fontSize="7" fontFamily="monospace">ANALOG / POWER</text>
            
            {/* Pin Labels (Pins 13, 8, 2, A0, GND, 5V) in pastel colors */}
            <text x="205" y="29" fill="#ffd3e2" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">13</text>
            <text x="278" y="29" fill="#ffd3e2" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">8</text>
            <text x="355" y="29" fill="#ffd3e2" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">2</text>
            
            <text x="380" y="197" fill="#ffd3e2" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">5V</text>
            <text x="400" y="197" fill="#ffd3e2" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">GND</text>
            <text x="440" y="197" fill="#ffd3e2" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">A0</text>
            
            {/* MCU - ARM SQ TYPE CHIP (GR-SAKURA centered square chip RX63N) */}
            <rect x="300" y="80" width="60" height="60" rx="4" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
            <text x="330" y="110" fill="#e4e4e7" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">RX63N</text>
            <text x="330" y="120" fill="#fbbf24" fontSize="6.5" fontFamily="monospace" textAnchor="middle">ARM-32BIT</text>
            
            {/* Grid pins teeth around square processor */}
            {Array.from({ length: 8 }).map((_, idx) => (
              <g key={idx}>
                <rect x={295} y={84 + (idx * 6.5)} width="5" height="2" fill="#cbd5e1" />
                <rect x={360} y={84 + (idx * 6.5)} width="5" height="2" fill="#cbd5e1" />
                <rect x={304 + (idx * 6.5)} y={75} width="2" height="5" fill="#cbd5e1" />
                <rect x={304 + (idx * 6.5)} y={140} width="2" height="5" fill="#cbd5e1" />
              </g>
            ))}

            {/* Tactile push buttons (Pastel blue and pastel red reset button) */}
            <circle cx="445" cy="60" r="7" fill="#f43f5e" stroke="#ffe4e6" strokeWidth="1.5" /> {/* Blue Switch 1 */}
            <circle cx="445" cy="60" r="3" fill="#cbd5e1" />
            <circle cx="445" cy="140" r="7" fill="#60a5fa" stroke="#eff6ff" strokeWidth="1.5" /> {/* Red Reset */}
            <circle cx="445" cy="140" r="3" fill="#cbd5e1" />
            <text x="445" y="50" fill="#ffffff" fontSize="6.5" fontFamily="sans-serif" textAnchor="middle">BOOT</text>
            <text x="445" y="152" fill="#ffffff" fontSize="6.5" fontFamily="sans-serif" textAnchor="middle">RESET</text>

            {/* Crystal Oscillator (Silver) */}
            <rect x="250" y="140" width="18" height="12" rx="4" fill="#cbd5e1" stroke="#94a3b8" />
            
            {/* Stainless Steel USB connector */}
            <rect x="150" y="40" width="42" height="36" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2.5" />
            <rect x="150" y="46" width="22" height="24" fill="#e2e8f0" />
            
            {/* DC Power jack (Jet black) */}
            <rect x="150" y="130" width="45" height="38" rx="5" fill="#09090b" stroke="#27272a" strokeWidth="1" />
          </g>

          {/* WIRES ROUTING (Pastel pink and blue wire trunks) */}
          {/* Ground Wire (Pastel blue, Arduino GND to Breadboard -) */}
          <path d="M 400 194 L 400 240 L 730 240 L 730 380" fill="none" stroke="#00b4d8" strokeWidth="3" opacity="0.85" />
          <polyline points="730,380 727,374 733,374" fill="#00b4d8" />

          {/* 5V Power Wire (Pastel Cherry, Arduino 5V to Breadboard +) */}
          <path d="M 380 194 L 380 230 L 710 230 L 710 310" fill="none" stroke="#ff758f" strokeWidth="3" opacity="0.85" />

          {/* PIN 13 -> Resistor -> Anode of LED (Orange Wire) */}
          <path d="M 205 26 L 205 245 L 140 245 L 140 325" fill="none" stroke="#f472b6" strokeWidth="2.5" strokeDasharray={sensorData.presence ? '6 3' : 'none'} className={sensorData.presence ? 'animate-[dash_1s_linear_infinite]' : ''} />
          {/* LED Cathode -> GND (Blue tie jumper) */}
          <path d="M 170 340 L 170 380" fill="none" stroke="#00b4d8" strokeWidth="2" />

          {/* PIN 8 -> Buzzer input PIN (Light Purple Wire) */}
          <path d="M 278 26 L 278 210 L 610 210 L 610 280" fill="none" stroke="#c084fc" strokeWidth="2.5" strokeDasharray={isAlarmOn ? '6 3' : 'none'} className={isAlarmOn ? 'animate-[dash_1s_linear_infinite]' : ''} />
          {/* Buzzer GND -> breadboard GND (Blue wire) */}
          <path d="M 640 295 L 640 380" fill="none" stroke="#00b4d8" strokeWidth="2" />

          {/* PIN 2 -> PIR Out PIN (Mint Green Wire) */}
          <path d="M 355 26 L 355 170 L 490 170 L 490 280" fill="none" stroke="#34d399" strokeWidth="2.5" strokeDasharray={sensorData.presence ? '6 3' : 'none'} className={sensorData.presence ? 'animate-[dash_1s_linear_infinite]' : ''} />
          {/* PIR VCC/GND Jumpers */}
          <path d="M 504 295 L 504 310" fill="none" stroke="#ff758f" strokeWidth="1.5" />
          <path d="M 476 295 L 476 380" fill="none" stroke="#00b4d8" strokeWidth="1.5" />

          {/* PIN A0 -> TMP36 Vout PIN (Pastel yellow Wire) */}
          <path d="M 440 194 L 440 250 L 315 250 L 315 325" fill="none" stroke="#fccd29" strokeWidth="2.5" />
          {/* TMP36 VCC/GND Jumpers */}
          <path d="M 300 325 L 300 310" fill="none" stroke="#ff758f" strokeWidth="1.5" />
          <path d="M 330 325 L 330 380" fill="none" stroke="#00b4d8" strokeWidth="1.5" />


          {/* 220-OHM RESISTOR OVER THE BREADBOARD */}
          <g
            id="resistor-component"
            className="cursor-pointer transition-opacity"
            onMouseEnter={() => setHoveredComponent('resistor')}
            onMouseLeave={() => setHoveredComponent(null)}
          >
            {/* Leads */}
            <line x1="140" y1="325" x2="160" y2="325" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Body */}
            <rect x="142" y="321" width="12" height="8" rx="2" fill="#fdf0ed" stroke="#f9a8d4" strokeWidth="1" />
            {/* Colored bands (Red, Red, Brown, Gold) */}
            <rect x="144" y="321" width="1.8" height="8" fill="#f43f5e" />
            <rect x="147" y="321" width="1.8" height="8" fill="#f43f5e" />
            <rect x="150" y="321" width="1.2" height="8" fill="#78350f" />
            <rect x="152" y="321" width="1.2" height="8" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
          </g>


          {/* RED LED ALERT WITH PASTEL PINK GLOW */}
          <g
            id="led-component"
            className="cursor-pointer"
            onClick={onTogglePresence}
            onMouseEnter={() => setHoveredComponent('led')}
            onMouseLeave={() => setHoveredComponent(null)}
          >
            {/* Anode long curved pin */}
            <path d="M 160 325 L 160 310 C 160 300 162 295 162 285" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Cathode short pin */}
            <path d="M 170 340 L 170 285" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
            
            {/* LED Glowing aura ring */}
            {sensorData.presence && (
              <circle cx="166" cy="275" r="30" fill="url(#led-glow)" opacity="0.9" className="animate-pulse" />
            )}
            
            {/* Plastic Dome Case of LED (Aesthetic cherry pink) */}
            <path
              d="M 158 285 L 158 270 A 8 8 0 0 1 174 270 L 174 285 Z"
              fill={sensorData.presence ? '#ff85a1' : '#fb7185'}
              stroke={sensorData.presence ? '#f43f5e' : '#be123c'}
              strokeWidth="1.5"
            />
            {/* Flat rim base */}
            <rect x="156" y="284" width="20" height="2" fill={sensorData.presence ? '#f43f5e' : '#be123c'} />
            {/* Little cathode flat inside marker */}
            <line x1="168" y1="272" x2="168" y2="283" stroke="#ffd1dc" strokeWidth="0.6" opacity="0.8" />
          </g>


          {/* TEMPERATURE SENSOR TMP36 (Pastel blue trim casing) */}
          <g
            id="tmp36-component"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredComponent('tmp36')}
            onMouseLeave={() => setHoveredComponent(null)}
          >
            {/* Pins */}
            <line x1="300" y1="325" x2="300" y2="305" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="315" y1="325" x2="315" y2="305" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="330" y1="325" x2="330" y2="305" stroke="#94a3b8" strokeWidth="1.2" />
            
            {/* Transistor D-shaped package (painted chic pink) */}
            <path d="M 295 305 L 335 305 A 20 20 0 0 0 295 305" fill="#f472b6" stroke="#db2777" strokeWidth="1" />
            <rect x="295" y="300" width="40" height="5" fill="#fbcfe8" />
            <text x="315" y="299" fill="#4c0519" fontSize="6" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">TMP</text>
            
            {/* Thermometer scale on top */}
            <rect x="290" y="235" width="50" height="32" rx="6" fill="#fdf2f8" stroke="#fbcfe8" strokeWidth="2" />
            {/* Color dynamic fluid filling the reader (pastel fluid) */}
            <rect
              x="294"
              y="255"
              width="6"
              height="10"
              rx="2"
              fill={sensorData.temperature > 50 ? '#f43f5e' : sensorData.temperature > threshold ? '#fb7185' : '#60a5fa'}
            />
            <text x="317" y="247" fill="#db2777" fontSize="7" fontFamily="sans-serif" fontWeight="bold">TEMP</text>
            <text x="317" y="259" fill="#db2777" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              {sensorData.temperature.toFixed(0)}°C
            </text>
          </g>


          {/* PIR MOTION DETECTOR SENSOR (Sakura Pink board casing) */}
          <g
            id="pir-component"
            className="cursor-pointer"
            onClick={onTogglePresence}
            onMouseEnter={() => setHoveredComponent('pir')}
            onMouseLeave={() => setHoveredComponent(null)}
          >
            {/* Breakout Pink Plate */}
            <rect x="460" y="280" width="60" height="15" rx="3" fill="#f472b6" stroke="#db2777" strokeWidth="1" />
            
            {/* Header connector jump-points */}
            <circle cx="476" cy="295" r="2" fill="#fbbf24" />
            <circle cx="490" cy="295" r="2" fill="#fbbf24" />
            <circle cx="504" cy="295" r="2" fill="#fbbf24" />
            
            {/* White dome fresnel lens element (Soft pearl globe) */}
            <circle cx="490" cy="265" r="20" fill="#fff5f5" stroke="#fbcfe8" strokeWidth="2" />
            {/* Geometric lens pattern grids */}
            <circle cx="490" cy="265" r="14" fill="none" stroke="#fbcfe8" strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="490" y1="245" x2="490" y2="285" stroke="#fbcfe8" strokeWidth="1.2" />
            <line x1="470" y1="265" x2="510" y2="265" stroke="#fbcfe8" strokeWidth="1.2" />
            
            <text x="490" y="278" fill="#db2777" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">PIR</text>

            {/* Glowing motion microwave visualization cone (Pastel Pink flare) */}
            {sensorData.presence ? (
              <path d="M 490 245 L 440 130 A 110 110 0 0 1 540 130 Z" fill="url(#pir-radial)" opacity="0.45" className="animate-pulse" />
            ) : (
              <path d="M 490 245 L 450 170 A 50 50 0 0 1 530 170 Z" fill="#fbcfe8" opacity="0.12" />
            )}
            {sensorData.presence && (
              <text x="490" y="125" fill="#ec4899" fontSize="10.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" className="animate-pulse">
                ✿ MOVIMENTO!
              </text>
            )}
          </g>


          {/* PIEZO BUZZER ALARM (Pastel Blue visual housing casing) */}
          <g
            id="buzzer-component"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredComponent('buzzer')}
            onMouseLeave={() => setHoveredComponent(null)}
          >
            {/* Active vibrating outline or soundwaves waves */}
            {isAlarmOn && (
              <g className="animate-ping" style={{ transformOrigin: '625px 280px' }}>
                <circle cx="625" cy="280" r="34" fill="none" stroke="#f43f5e" strokeWidth="1" opacity="0.5" />
                <circle cx="625" cy="280" r="42" fill="none" stroke="#f43f5e" strokeWidth="1" opacity="0.3" />
              </g>
            )}

            {/* Cylinder pastel blue casing body */}
            <circle cx="625" cy="280" r="24" fill="#60a5fa" stroke="#2563eb" strokeWidth="2" />
            <circle cx="625" cy="280" r="19" fill="#1e40af" />
            {/* Sound hole */}
            <circle cx="625" cy="280" r="6" fill="#172554" />
            
            {/* Positive marking */}
            <text x="612" y="271" fill="#93c5fd" fontSize="12" fontWeight="bold" fontFamily="monospace">+</text>
            <text x="625" y="295" fill="#93c5fd" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">PIEZO</text>
          </g>

          {/* ESTILO CSS EMBUTIDO PARA ANIMAÇÃO DA ASA DA BORBOLETA */}
          <style>{`
            @keyframes flap-left {
              0% { transform: scaleX(1); }
              100% { transform: scaleX(0.1); }
            }
            @keyframes flap-right {
              0% { transform: scaleX(1); }
              100% { transform: scaleX(0.1); }
            }
            @keyframes gentle-hover {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-10px) rotate(3deg); }
            }
            .left-wing-g {
              transform-origin: 0px 0px;
            }
            .right-wing-g {
              transform-origin: 0px 0px;
            }
          `}</style>

          {/* RETRO COPPER PERFBOARD (Placa de LEDs em formato de coração do usuário) */}
          <g
            id="heart-led-board"
            className="cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
            onMouseEnter={() => setHoveredComponent('heart-board')}
            onMouseLeave={() => setHoveredComponent(null)}
          >
            {/* Placa fenólica base (Marrom retrô) */}
            <rect x="580" y="32" width="135" height="150" rx="12" fill="#854d0e" stroke="#451a03" strokeWidth="3" />
            <rect x="584" y="36" width="127" height="134" rx="10" fill="#a16207" />
            
            {/* Grid de pads metálicos de soldagem de cobre */}
            {Array.from({ length: 8 }).map((_, row) => (
              Array.from({ length: 8 }).map((_, col) => {
                const px = 596 + (col * 15);
                const py = 48 + (row * 15);
                return (
                  <circle key={`hole-${row}-${col}`} cx={px} cy={py} r="2.2" fill="#ca8a04" stroke="#451a03" strokeWidth="0.5" opacity="0.5" />
                );
              })
            ))}

            {/* Inscrição dourada na placa */}
            <rect x="584" y="148" width="127" height="22" rx="4" fill="#451a03" opacity="0.3" />
            <text x="647" y="162" fill="#fef08a" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
              ❤ SAKURA HEART-V1
            </text>

            {/* Cabos elétricos de ligação (Fios brancos simulando a imagem enviada) */}
            {/* Fio de Sinal (Anodo ligado ao pino 13 de sinal eletrônico através da trilha) */}
            <path d="M 210 20 L 210 8 L 560 8 L 560 60 L 590 60" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
            {/* Fio de Terra (GND ligado ao barramento comum do circuito) */}
            <path d="M 405 194 L 405 215 L 570 215 L 570 140 L 590 140" fill="none" stroke="#e2e8f0" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />

            {/* LEDs arranjados em simetria de Coração */}
            {heartOffsets.map((offset, idx) => {
              const ledX = 647 + offset.dx;
              const ledY = 92 + offset.dy;
              const isLit = sensorData.presence;
              
              return (
                <g key={`heart-led-${idx}`}>
                  {/* Halo de luz neon atrás de cada LED ativado */}
                  {isLit && (
                    <circle cx={ledX} cy={ledY} r="15" fill="url(#heart-led-glow)" className="animate-pulse" opacity="0.85" />
                  )}
                  
                  {/* Cápsula plástica do micro-LED */}
                  <circle
                    cx={ledX}
                    cy={ledY}
                    r="4.8"
                    fill={isLit ? '#ff2a5f' : '#881337'}
                    stroke={isLit ? '#ffe4e6' : '#310612'}
                    strokeWidth="1"
                  />
                  {/* Foco de brilho na lente (Lente convexa brilhante) */}
                  <circle
                    cx={ledX - 1.2}
                    cy={ledY - 1.2}
                    r="1.4"
                    fill={isLit ? '#ffffff' : '#f43f5e'}
                    opacity={isLit ? 0.95 : 0.4}
                  />
                </g>
              );
            })}
          </g>

          {/* BORBOLETA VOANDO (Elegantemente animada com React + CSS transitions) */}
          <g
            id="interactive-butterfly"
            className="touch-none select-none"
            onMouseEnter={() => setHoveredComponent('butterfly')}
            onMouseLeave={() => setHoveredComponent(null)}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            style={{
              transform: `translate(${butterflyPos.x}px, ${butterflyPos.y}px) scale(${sensorData.presence ? 0.95 : 0.85})`,
              transition: isDragging ? 'none' : 'transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          >
            {/* Flutuamento flácido físico e suave simulando vento */}
            <g className="animate-[gentle-hover_4s_ease-in-out_infinite]">
              {/* Área invisível grande para facilitar puxar a borboleta (Grab Handle) */}
              <circle cx="0" cy="0" r="45" fill="transparent" style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />

              {/* Antenas delicadas */}
              <path d="M -2 -14 Q -12 -28 -14 -28" fill="none" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 2 -14 Q 12 -28 14 -28" fill="none" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="-14" cy="-28" r="1.5" fill="#ec4899" />
              <circle cx="14" cy="-28" r="1.5" fill="#ec4899" />

              {/* Par de asas esquerdas (Flapping de alta velocidade com pivot local 0 0 infalível) */}
              <g 
                className="left-wing-g" 
                style={{ 
                  animation: 'flap-left 0.14s ease-in-out infinite alternate',
                  transformOrigin: '0px 0px'
                }}
              >
                {/* Asa superior esquerda */}
                <path d="M 0 -6 C -32 -36 -46 -11 -5 -1" fill="#ec4899" stroke="#9d174d" strokeWidth="1.2" />
                <path d="M -10 -13 C -25 -25 -32 -13 -13 -7" fill="#fbcfe8" opacity="0.7" />
                <circle cx="-18" cy="-15" r="2" fill="#fb7185" />
                {/* Asa inferior esquerda */}
                <path d="M 0 2 C -24 16 -28 3 -3 4" fill="#db2777" stroke="#9d174d" strokeWidth="1" />
                <path d="M -6 5 C -16 11 -18 4 -4 4" fill="#fbcfe8" opacity="0.5" />
              </g>

              {/* Par de asas direitas (Flapping de alta velocidade com pivot local 0 0 infalível) */}
              <g 
                className="right-wing-g" 
                style={{ 
                  animation: 'flap-right 0.14s ease-in-out infinite alternate',
                  transformOrigin: '0px 0px'
                }}
              >
                {/* Asa superior direita */}
                <path d="M 0 -6 C 32 -36 46 -11 5 -1" fill="#ec4899" stroke="#9d174d" strokeWidth="1.2" />
                <path d="M 10 -13 C 25 -25 32 -13 13 -7" fill="#fbcfe8" opacity="0.7" />
                <circle cx="18" cy="-15" r="2" fill="#fb7185" />
                {/* Asa inferior direita */}
                <path d="M 0 2 C 24 16 28 3 3 4" fill="#db2777" stroke="#9d174d" strokeWidth="1" />
                <path d="M 6 5 C 16 11 18 4 4 4" fill="#fbcfe8" opacity="0.5" />
              </g>

              {/* Corpo da borboleta (Cefalotórax brilhante + listras) */}
              <ellipse cx="0" cy="0" rx="3.5" ry="12" fill="#2d0619" stroke="#db2777" strokeWidth="1.2" />
              <circle cx="0" cy="-12" r="4.5" fill="#4c0519" stroke="#db2777" strokeWidth="1.2" />
              
              {/* Listras de polonização */}
              <line x1="-2" y1="-4" x2="2" y2="-4" stroke="#fda4af" strokeWidth="1.5" />
              <line x1="-2.5" y1="0" x2="2.5" y2="0" stroke="#fda4af" strokeWidth="1.5" />
              <line x1="-2" y1="4" x2="2" y2="4" stroke="#fda4af" strokeWidth="1.5" />
            </g>
          </g>

          {/* DEFINITIONS FOR GRADIENT EFFECTS */}
          <defs>
            {/* Radial orange glow for LEDs */}
            <radialGradient id="led-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff85a1" stopOpacity="1" />
              <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#be123c" stopOpacity="0" />
            </radialGradient>

            {/* Microwave detection flare gradient */}
            <linearGradient id="pir-radial" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#ff85a1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffe4e6" stopOpacity="0" />
            </linearGradient>

            {/* Brilho neon rosa e vermelho para os LEDs em formato de coração do usuário */}
            <radialGradient id="heart-led-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff0055" stopOpacity="1" />
              <stop offset="35%" stopColor="#f43f5e" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Component Context Description Card panel */}
      <div className="bg-white/90 p-4 rounded-xl border border-pink-100 shadow-sm grow-0 shrink-0 h-[105px] flex flex-col justify-center">
        <span className="text-[10px] text-pink-500 font-mono font-bold tracking-widest uppercase mb-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" /> EXPLORADOR DE ENGENHARIA ELÉTRICA
        </span>
        <p className="text-xs text-pink-800 leading-relaxed font-sans">
          {getComponentExplanation(hoveredComponent || '')}
        </p>
      </div>

      {/* Embedded interactive toggles */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-pink-100 shrink-0">
        {/* Toggle Presence sensor */}
        <div className="bg-white/80 p-3 rounded-xl border border-pink-100 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-pink-800 flex items-center gap-1.5">
              <Radio className={`w-4 h-4 ${sensorData.presence ? 'text-pink-500 animate-pulse' : 'text-blue-400'}`} />
              Sensor Presença (PIR)
            </span>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
              sensorData.presence ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {sensorData.presence ? 'DENTRO' : 'SEM MOVIMENTO'}
            </span>
          </div>
          <button
            onClick={onTogglePresence}
            className={`w-full mt-2 py-1.5 rounded-lg text-xs font-semibold select-none flex items-center justify-center gap-1.5 transition-all outline-none ${
              sensorData.presence
                ? 'bg-pink-500 text-white hover:bg-pink-400 shadow-sm shadow-pink-200'
                : 'bg-blue-500 text-white hover:bg-blue-400 shadow-sm shadow-blue-100'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            {sensorData.presence ? 'Parar Movimento' : 'Simular Movimento'}
          </button>
        </div>

        {/* Change temperature level */}
        <div className="bg-white/80 p-3 rounded-xl border border-pink-100 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-pink-800 flex items-center gap-1.5">
              <Thermometer className={`w-4 h-4 ${isAlarmOn ? 'text-pink-500 animate-bounce' : 'text-blue-400'}`} />
              Temperatura (TMP36)
            </span>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
              isAlarmOn ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {sensorData.temperature.toFixed(1)} °C
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-pink-400 font-mono">10C</span>
            <input
              type="range"
              min="10"
              max="70"
              value={sensorData.temperature}
              onChange={(e) => onUpdateTemperature(parseFloat(e.target.value))}
              className="w-full h-1 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
            />
            <span className="text-[10px] text-pink-400 font-mono">70C</span>
          </div>
        </div>
      </div>
    </div>
  );
}
