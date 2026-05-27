import { useState } from 'react';
import { Cpu, Play, CheckCircle2, RotateCcw, AlertTriangle, HelpCircle, Code } from 'lucide-react';

interface CodeViewerProps {
  presence: boolean;
  temperature: number;
  threshold: number;
  onUpdateThreshold: (newVal: number) => void;
}

export default function CodeViewer({ presence, temperature, threshold, onUpdateThreshold }: CodeViewerProps) {
  const [editorValue, setEditorValue] = useState(threshold.toString());
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'success' | 'edited'>('idle');

  // Core explanation for clicking lines or hover explaining
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  const codeLines = [
    { num: 1, text: '// Definição dos pinos físicos no microcontrolador', type: 'comment' },
    { num: 2, text: 'const int pinoPIR = 2;       // Sensor de Presença (Digital)', type: 'normal' },
    { num: 3, text: 'const int pinoTemp = A0;     // Sensor de Temperatura (Analógico)', type: 'normal' },
    { num: 4, text: 'const int pinoLED = 13;      // LED de Alerta visual (Presença)', type: 'normal' },
    { num: 5, text: 'const int pinoBuzzer = 8;    // Buzzer para Alarme sonoro (Temperatura)', type: 'normal' },
    { num: 6, text: '', type: 'empty' },
    { num: 7, text: '// Variável de calibração dinâmica', type: 'comment' },
    { num: 8, text: `float limiteTemperatura = ${threshold.toFixed(1)}; // Limite de disparo do alarme em °C`, type: 'editable' },
    { num: 9, text: '', type: 'empty' },
    { num: 10, text: 'void setup() {', type: 'structure' },
    { num: 11, text: '  pinMode(pinoPIR, INPUT);    // Define entrada do PIR', type: 'normal' },
    { num: 12, text: '  pinMode(pinoLED, OUTPUT);   // Define saída para o LED', type: 'normal' },
    { num: 13, text: '  pinMode(pinoBuzzer, OUTPUT); // Define saída para o Buzzer', type: 'normal' },
    { num: 14, text: '  ', type: 'empty' },
    { num: 15, text: '  Serial.begin(9600);         // Inicializa conexão COM em 9600 bps', type: 'setup-serial' },
    { num: 16, text: '  Serial.println("--- Sistema de Monitoramento Residencial Iniciado ---");', type: 'setup-serial' },
    { num: 17, text: '}', type: 'structure' },
    { num: 18, text: '', type: 'empty' },
    { num: 19, text: 'void loop() {', type: 'structure' },
    { num: 20, text: '  // 1. Executa a leitura do Sensor de Presença', type: 'comment' },
    { num: 21, text: '  int presenca = digitalRead(pinoPIR);', type: 'pir-read', active: presence },
    { num: 22, text: '  ', type: 'empty' },
    { num: 23, text: '  if (presenca == HIGH) {', type: 'pir-check', active: presence },
    { num: 24, text: '    digitalWrite(pinoLED, HIGH); // Ativa LED de aviso visual', type: 'led-on', active: presence },
    { num: 25, text: '    Serial.println("ALERTA: Movimento detectado!");', type: 'serial-log-pir', active: presence },
    { num: 26, text: '  } else {', type: 'pir-check' },
    { num: 27, text: '    digitalWrite(pinoLED, LOW);  // Mantém LED desligado', type: 'led-off', active: !presence },
    { num: 28, text: '  }', type: 'structure' },
    { num: 29, text: '  ', type: 'empty' },
    { num: 30, text: '  // 2. Executa a leitura analógica (0 a 1023) do sensor TMP36', type: 'comment' },
    { num: 31, text: '  int leituraAnalogica = analogRead(pinoTemp);', type: 'temp-read' },
    { num: 32, text: '  // Conversão matemática de ADC para tensão e escala Celsius', type: 'temp-math' },
    { num: 33, text: '  float voltagem = leituraAnalogica * (5.0 / 1023.0);', type: 'temp-math' },
    { num: 34, text: '  float temperaturaC = (voltagem - 0.5) * 100;', type: 'temp-math' },
    { num: 35, text: '  ', type: 'empty' },
    { num: 36, text: '  Serial.print("Temperatura Atual: ");', type: 'temp-serial' },
    { num: 37, text: '  Serial.print(temperaturaC);', type: 'temp-serial' },
    { num: 38, text: '  Serial.println(" C");', type: 'temp-serial' },
    { num: 39, text: '  ', type: 'empty' },
    { num: 40, text: '  // 3. Tomada de Decisão baseada em Limites (IA de Regra)', type: 'decision-comment' },
    { num: 41, text: '  if (temperaturaC > limiteTemperatura) {', type: 'temp-check', active: temperature > threshold },
    { num: 42, text: '    tone(pinoBuzzer, 1000);   // Emite frequência dolorosa de 1kHz', type: 'buzz-on', active: temperature > threshold },
    { num: 43, text: '    Serial.println("PERIGO: Temperatura elevada detectada!");', type: 'serial-log-temp', active: temperature > threshold },
    { num: 44, text: '  } else {', type: 'temp-check' },
    { num: 45, text: '    noTone(pinoBuzzer);       // Silencia o buzzer sonoramente', type: 'buzz-off', active: temperature <= threshold },
    { num: 46, text: '  }', type: 'structure' },
    { num: 47, text: '  ', type: 'empty' },
    { num: 48, text: '  delay(1000); // Coleta a cada 1 segundo', type: 'delay' },
    { num: 49, text: '}', type: 'structure' }
  ];

  const handleCompile = () => {
    setIsCompiling(true);
    setTimeout(() => {
      const val = parseFloat(editorValue);
      if (!isNaN(val)) {
        onUpdateThreshold(val);
        setCompileStatus('success');
      }
      setIsCompiling(false);
    }, 1500);
  };

  const explainLine = (num: number) => {
    switch (num) {
      case 2: return "Pino 2 configurado com resistor pull-down para leitura digital estável do sensor infravermelho de presença.";
      case 3: return "Pino Analógico A0 alimentando o Conversor ADC de 10 bits do microcontrolador.";
      case 4: return "Pino 13 clássico associado ao LED interno da placa Uno.";
      case 5: return "Pino 8 de saída analógica modula a emissão sonora pela função tone().";
      case 8: return "A variável que determina em que temperatura de perigo o alarme dispara. Você pode alterá-la livremente no menu ao lado!";
      case 15: return "Inicia barramento Serial (UART TX/RX) para enviar telemetria à taxa padrão de 9600 bps.";
      case 21: return "Função 'digitalRead' lê nível alto (5V) ou baixo (0V) gerado pelo sensor PIR.";
      case 24: return "Saída HIGH eleva a tensão no pino do LED para acender o alerta de segurança.";
      case 31: return "analogRead() lê de 0-1023 correspondendo linearmente aos níveis de tensão captados (0-5V).";
      case 33: return "Divide 5.0v por 1023 de resolução para converter o valor inteiro em voltagem física real.";
      case 34: return "Fórmula característica do termômetro TMP36: subtrai 500mV de offset e multiplica por 100.";
      case 41: return "Algoritmo de controle microcontrolado baseado em limite para acionamento automatizado do piezo.";
      case 42: return "Emite uma vibração na frequência de 1000Hz (1kHz) para gerar bip imediato.";
      case 45: return "Interrompe ciclo de geração na porta correspondente do alarme elétrico.";
      default: return null;
    }
  };

  return (
    <div className="bg-[#1c0f18] rounded-2xl border-2 border-pink-200/60 shadow-md overflow-hidden flex flex-col h-[620px] text-pink-100">
      {/* IDE Header */}
      <div className="bg-pink-50/80 px-4 py-2.5 flex items-center justify-between border-b border-pink-100 text-xs">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-pink-500" />
          <span className="font-mono font-bold text-pink-900">sketch_monitor.ino</span>
          {compileStatus === 'edited' && (
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" title="Edição pendente de Upload" />
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Config Limit dynamic slider */}
          <div className="flex items-center gap-1.5 bg-white border-2 border-pink-100 px-2 py-0.5 rounded-lg">
            <span className="text-[9px] text-pink-500 font-bold font-mono">LIMITE (°C):</span>
            <input
              type="number"
              value={editorValue}
              onChange={(e) => {
                setEditorValue(e.target.value);
                setCompileStatus('edited');
              }}
              className="w-10 bg-transparent text-center text-xs text-pink-800 font-mono font-bold focus:outline-none"
              title="Digite a temperatura limite para upload"
            />
          </div>

          <button
            onClick={handleCompile}
            disabled={isCompiling}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all text-white cursor-pointer ${
              isCompiling
                ? 'bg-pink-300 cursor-not-allowed'
                : 'bg-pink-500 hover:bg-pink-400 shadow-sm shadow-pink-200'
            }`}
          >
            <Cpu className={`w-3.5 h-3.5 ${isCompiling ? 'animate-spin' : ''}`} />
            {isCompiling ? 'Gravando...' : 'Gravar Código'}
          </button>
        </div>
      </div>

      {/* Editor Space layout split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Core Code display pane */}
        <div className="flex-1 overflow-y-auto p-2.5 font-mono text-xs border-r border-pink-950/20 bg-[#140810] select-text">
          {codeLines.map((line) => {
            let textColor = 'text-pink-100/90';
            let lineBg = 'hover:bg-white/5';

            if (line.type === 'comment') textColor = 'text-emerald-400';
            else if (line.type === 'editable') textColor = 'text-blue-300 font-bold bg-blue-950/25 px-1 rounded';
            else if (line.type === 'structure') textColor = 'text-pink-400';
            else if (line.type === 'setup-serial' || line.type === 'temp-serial' || line.type === 'serial-log-pir' || line.type === 'serial-log-temp') textColor = 'text-blue-200';

            // Active running line highlights
            if (line.active) {
              lineBg = 'bg-pink-950/35 border-l-2 border-pink-500';
            }

            return (
              <div
                key={line.num}
                onMouseEnter={() => setHoveredLine(line.num)}
                className={`flex gap-3 px-1 py-0.5 rounded transition-colors group cursor-help ${lineBg}`}
              >
                <span className="w-5 text-pink-400/40 text-right select-none pr-1 border-r border-[#2a1322] group-hover:text-pink-300">{line.num}</span>
                <span className={`whitespace-pre ${textColor}`}>{line.text}</span>
              </div>
            );
          })}
        </div>

        {/* Explain helper pane */}
        <div className="w-[180px] bg-[#1a0f16] p-4 text-xs font-sans flex flex-col justify-between select-none">
          <div>
            <h4 className="font-semibold text-pink-300 mb-2.5 font-sans tracking-wide flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-pink-400" /> Detalhes da Linha
            </h4>
            {hoveredLine && explainLine(hoveredLine) ? (
              <div className="text-pink-100 leading-relaxed bg-[#251520] p-3 rounded-lg border border-pink-950">
                <span className="text-[10px] text-pink-400 font-bold block mb-1">LINHA {hoveredLine}</span>
                {explainLine(hoveredLine)}
              </div>
            ) : (
              <p className="text-pink-300/40 italic text-center text-[11px] pt-8 bg-[#251520]/20 p-3 border-2 border-dashed border-pink-950 rounded-xl">
                Acerque o cursor das linhas do código-fonte para analisar suas ações e efeitos elétricos nos pinos de hardware.
              </p>
            )}
          </div>

          <div className="border-t border-pink-950 pt-3 text-[10px] space-y-2 mt-4">
            <span className="text-pink-400 font-bold flex items-center gap-1 font-sans uppercase"><RotateCcw className="w-3 h-3 text-pink-400" /> Console de Flash</span>
            {compileStatus === 'success' ? (
              <p className="text-blue-300 bg-blue-950/20 p-2 border border-blue-900/30 rounded-xl leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0 inline mr-1" />
                <span>Upload completo com sucesso na EEPROM! Sistema rodando.</span>
              </p>
            ) : compileStatus === 'edited' ? (
              <p className="text-amber-400 bg-amber-950/20 p-2 border border-amber-900/30 rounded-xl leading-snug">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 inline mr-1" />
                <span>Clique em 'Gravar Código' para transferir o novo limite para a placa.</span>
              </p>
            ) : (
              <p className="text-pink-300/50 bg-[#160a12] p-2 border border-pink-950/60 rounded-xl max-h-[70px] overflow-hidden leading-normal">
                Sketch compilado sem erros.<br />
                Flash: 3412 bytes (10%).<br />
                SRAM: 182 bytes (8%).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
