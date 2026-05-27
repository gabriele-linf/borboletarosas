import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import CircuitDiagram from './components/CircuitDiagram';
import CodeViewer from './components/CodeViewer';
import SerialMonitor from './components/SerialMonitor';
import ArmSimulator from './components/ArmSimulator';
import { SensorData, LogEntry } from './types';
import { buzzerSound } from './utils/audio';
import { Play, Sparkles, BookOpen, Settings, Info, Cpu, Code } from 'lucide-react';

export default function App() {
  // 1. Structural Tabs Navigation
  const [currentTab, setCurrentTab] = useState<'simulator' | 'arm'>('simulator');
  const [isMuted, setIsMuted] = useState(false); // Default to unmuted to allow immediate sound interaction

  // 2. Hardware state representing Arduino physical conditions
  const [sensorData, setSensorData] = useState<SensorData>({
    presence: false,
    temperature: 24.5,
    voltage: 0.74,
    rawValue: 152,
  });

  const [threshold, setThreshold] = useState<number>(35.0);

  // 3. Serial log entries
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'boot1',
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      message: '--- Inicializando Bootloader do Arduino ATMega328 ---',
      type: 'info',
    },
    {
      id: 'boot2',
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      message: 'Carregando Sketch na memória flash do processador...',
      type: 'info',
    },
    {
      id: 'boot3',
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      message: '--- Sistema de Monitoramento Residencial Iniciado ---',
      type: 'success',
    },
    {
      id: 'boot4',
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      message: 'Aguardando sinais analógicos e infravermelhos de monitoramento de borda...',
      type: 'success',
    },
  ]);

  // Keep references to access inside the simulated Arduino void loop() setInterval without stale closure or re-render loops
  const stateRef = useRef({ sensorData, threshold });
  useEffect(() => {
    stateRef.current = { sensorData, threshold };
  }, [sensorData, threshold]);

  // Handle Piezo buzzer audio frequency activation
  useEffect(() => {
    const isAlarmActive = sensorData.temperature > threshold;
    buzzerSound.setMute(isMuted);

    if (isAlarmActive && !isMuted) {
      buzzerSound.start(1000); // 1000Hz frequency
    } else {
      buzzerSound.stop();
    }

    return () => {
      buzzerSound.stop();
    };
  }, [sensorData.temperature, threshold, isMuted]);

  // 4. Simulated interactive Void Loop () ticks executing every 1.8 seconds (like typical program loops)
  useEffect(() => {
    const timer = setInterval(() => {
      const current = stateRef.current;
      const stamp = new Date().toLocaleTimeString('pt-BR');
      
      // Append a general telemetry update
      const newLogs: LogEntry[] = [
        {
          id: Math.random().toString(),
          timestamp: stamp,
          message: `Temperatura Atual: ${current.sensorData.temperature.toFixed(1)} °C`,
          type: 'info',
        }
      ];

      // If presence is high, insert warning immediately
      if (current.sensorData.presence) {
        newLogs.push({
          id: Math.random().toString(),
          timestamp: stamp,
          message: 'DETECTOR PIR: Voo da borboleta no feixe [Pino 2 HIGH] -> Painel Coração ligado!',
          type: 'alert',
        });
      }

      // If temperature is elevated, alarm the serial console
      if (current.sensorData.temperature > current.threshold) {
        newLogs.push({
          id: Math.random().toString(),
          timestamp: stamp,
          message: `PERIGO: Temperatura elevada de ${current.sensorData.temperature.toFixed(1)}°C superou o limite de ${current.threshold.toFixed(1)}°C!`,
          type: 'error',
        });
      }

      // Append up to 80 items to keep memory clean
      setLogs((prev) => [...prev, ...newLogs].slice(-80));
    }, 1800);

    return () => clearInterval(timer);
  }, []);

  // Update specific sensors
  const handleTogglePresence = () => {
    setSensorData((prev) => {
      const updatedPresence = !prev.presence;
      
      // Play flutter sound representing the butterfly's movement state
      buzzerSound.playFlutter(updatedPresence);

      // Push an immediate log on trigger
      const stamp = new Date().toLocaleTimeString('pt-BR');
      setLogs((logsPrev) => [
        ...logsPrev,
        {
          id: Math.random().toString(),
          timestamp: stamp,
          message: updatedPresence 
            ? 'ALERTA: Borboleta detectada no campo do sensor PIR! Ativando painel de LEDs Coração.' 
            : 'Fim do Voo: Borboleta pousou. Painel de LEDs Coração desativado.',
          type: updatedPresence ? 'alert' : 'success',
        }
      ]);

      return {
        ...prev,
        presence: updatedPresence,
      };
    });
  };

  const handleUpdateTemperature = (temp: number) => {
    // Elegant interactive acoustic tone based on temperature
    buzzerSound.playTone(400 + temp * 6, 0.04, 'sine', 0.04);

    setSensorData((prev) => {
      const voltageCalc = (temp * 0.01) + 0.5;
      const rawValueCalc = Math.round((voltageCalc / 5.0) * 1023);

      // Push a log if it crosses the limit
      const wasElevated = prev.temperature > threshold;
      const isElevatedNow = temp > threshold;
      if (wasElevated !== isElevatedNow) {
        const stamp = new Date().toLocaleTimeString('pt-BR');
        setLogs((logsPrev) => [
          ...logsPrev,
          {
            id: Math.random().toString(),
            timestamp: stamp,
            message: isElevatedNow 
              ? `AVISO DE LIMIAR: Temperatura ultrapassou limite seguro de ${threshold}°C!` 
              : `NOTIFICAÇÃO: Temperatura retornou à faixa segura (< ${threshold}°C).`,
            type: isElevatedNow ? 'error' : 'success',
          }
        ]);
      }

      return {
        ...prev,
        temperature: temp,
        voltage: voltageCalc,
        rawValue: rawValueCalc,
      };
    });
  };

  const handleUpdateThreshold = (newVal: number) => {
    // Interactive acoustic pitch representing setpoint calibration
    buzzerSound.playTone(300 + newVal * 8, 0.04, 'sine', 0.04);

    setThreshold(newVal);
    const stamp = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: stamp,
        message: 'SUCESSO: Nova calibração de limite gravada nas registradoras EEPROM: ' + newVal.toFixed(1) + ' °C',
        type: 'success',
      }
    ]);
  };

  // Execute typed commands in Serial Monitor
  const handleSendCommand = (command: string) => {
    const trimmed = command.toLowerCase().trim();
    const stamp = new Date().toLocaleTimeString('pt-BR');

    // Echo command in logs
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: stamp,
        message: `Echo: > ${command}`,
        type: 'info',
      }
    ]);

    if (trimmed === '/ajuda' || trimmed === 'help') {
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          timestamp: stamp,
          message: '--- COMANDOS DE SIMULAÇÃO ACEITOS ---',
          type: 'success',
        },
        {
          id: Math.random().toString(),
          timestamp: stamp,
          message: '  /movimento     -> Dispara ou para evento de presença física.',
          type: 'info',
        },
        {
          id: Math.random().toString(),
          timestamp: stamp,
          message: '  /temp <numero> -> Simula temperatura exata no termômetro (ex: /temp 42).',
          type: 'info',
        },
        {
          id: Math.random().toString(),
          timestamp: stamp,
          message: '  /limite <num> -> Configura o limite de disparo imediatamente do buzzer.',
          type: 'info',
        },
        {
          id: Math.random().toString(),
          timestamp: stamp,
          message: '  /limpar        -> Apaga todas as mensagens do console.',
          type: 'info',
        }
      ]);
    } else if (trimmed === '/movimento') {
      handleTogglePresence();
    } else if (trimmed === '/limpar') {
      setLogs([]);
    } else if (trimmed.startsWith('/temp ')) {
      const value = parseFloat(trimmed.replace('/temp ', ''));
      if (!isNaN(value)) {
        handleUpdateTemperature(value);
      } else {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: stamp,
            message: 'Erro de sintaxe: use /temp <temperatura_em_graus>',
            type: 'error',
          }
        ]);
      }
    } else if (trimmed.startsWith('/limite ')) {
      const value = parseFloat(trimmed.replace('/limite ', ''));
      if (!isNaN(value)) {
        handleUpdateThreshold(value);
      } else {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: stamp,
            message: 'Erro de sintaxe: use /limite <valor_temperatura>',
            type: 'error',
          }
        ]);
      }
    } else {
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          timestamp: stamp,
          message: `Comando desconhecido: "${command}". Digite /ajuda para exibir opções válidas.`,
          type: 'error',
        }
      ]);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    
    // Force direct audio initialization and play validation chime when unmuting
    if (!nextMuted) {
      setTimeout(() => {
        buzzerSound.setMute(false);
        buzzerSound.playChime();
      }, 30);
    }
    
    const stamp = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: stamp,
        message: nextMuted 
          ? 'Notificação: Áudio do alarme desativado pelo navegador.' 
          : 'Aviso: Áudio do alarme em frequência real habilitado a 1000Hz!',
        type: 'info',
      }
    ]);
  };

  const handleChangeTab = (tab: 'simulator' | 'arm') => {
    setCurrentTab(tab);
    buzzerSound.playTone(700, 0.08, 'sine', 0.04);
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-[#fff1f5] via-[#fbfdff] to-[#edf5ff] font-sans text-slate-800 flex flex-col justify-between overflow-hidden select-none">
      {/* Dynamic Header & Toolbar Navigation */}
      <Navbar
        currentTab={currentTab}
        onChangeTab={handleChangeTab}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main body canvas content */}
      <main className="max-w-7xl w-full mx-auto p-3 sm:p-5 flex-1 overflow-y-auto overscroll-none scrollbar-thin">
        {currentTab === 'simulator' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Col: The visually glowing vector circuit layout */}
            <div className="xl:col-span-7 space-y-6">
              <CircuitDiagram
                sensorData={sensorData}
                threshold={threshold}
                onTogglePresence={handleTogglePresence}
                onUpdateTemperature={handleUpdateTemperature}
              />
              <SerialMonitor
                logs={logs}
                onClear={handleClearLogs}
                onSendCommand={handleSendCommand}
              />
            </div>

            {/* Right Col: Arduino C++ IDE Code editor */}
            <div className="xl:col-span-5 space-y-6">
              <CodeViewer
                presence={sensorData.presence}
                temperature={sensorData.temperature}
                threshold={threshold}
                onUpdateThreshold={handleUpdateThreshold}
              />
            </div>
          </div>
        )}

        {currentTab === 'arm' && (
          <div className="animate-fade-in">
            <ArmSimulator
              presence={sensorData.presence}
              temperature={sensorData.temperature}
              threshold={threshold}
            />
          </div>
        )}

        {/* Floating Quick Stats Guide */}
        <section className="mt-8 bg-white/90 border-2 border-pink-100 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-pink-500 shrink-0" />
            <span className="text-pink-700 font-bold">Placa:</span>
            <span className="text-slate-800 font-semibold text-xs">GR-SAKURA (M3-Core)</span>
          </div>
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-pink-400 shrink-0" />
            <span className="text-pink-700 font-bold">Limiar Alarme:</span>
            <span className="text-pink-600 font-extrabold">{threshold.toFixed(1)}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${sensorData.presence ? 'bg-pink-500 animate-ping' : 'bg-slate-400'}`} />
            <span className="text-pink-700 font-bold">PIR Pin 2:</span>
            <span className={sensorData.presence ? 'text-pink-600 font-extrabold' : 'text-slate-600'}>
              {sensorData.presence ? 'HIGH (1)' : 'LOW (0)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-blue-700 font-bold">TMP36 A0:</span>
            <span className="text-blue-600 font-extrabold">{sensorData.temperature.toFixed(2)}°C</span>
            <span className="text-slate-500">({sensorData.voltage.toFixed(2)}V / {sensorData.rawValue} ADC)</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-pink-150 py-6 text-center text-xs text-pink-900/60 font-sans tracking-wide">
        <p className="font-semibold text-pink-950/80">Desenvolvido para fins didáticos e acadêmicos — Engenharia, Domótica e Automação Residencial SAKURA</p>
        <p className="mt-1 text-slate-500 font-mono text-[10px]">Arquitetura ARM simulated core | Arduino software framework V4.5-SAKURA</p>
      </footer>
    </div>
  );
}
