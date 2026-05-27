import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCcw, Layers, HelpCircle, GitCommit, Check } from 'lucide-react';
import { ArmRegister, PipelineStage } from '../types';

interface ArmSimulatorProps {
  presence: boolean;
  temperature: number;
  threshold: number;
}

export default function ArmSimulator({ presence, temperature, threshold }: ArmSimulatorProps) {
  const [pipelineIndex, setPipelineIndex] = useState(0);

  // Translate analog input temp to ARM representation
  const rawAnalogInput = Math.round((temperature + 50) * (1023 / 175)); // Approx conversion matching A0
  const hexRawInput = '0x' + rawAnalogInput.toString(16).toUpperCase().padStart(8, '0');
  const hexPresence = presence ? '0x00000001' : '0x00000000';
  const calculatedTempHex = '0x' + Math.round(temperature).toString(16).toUpperCase().padStart(8, '0');
  const thresholdHex = '0x' + Math.round(threshold).toString(16).toUpperCase().padStart(8, '0');

  // CPU registers file
  const registers: ArmRegister[] = [
    { name: 'R0', value: hexPresence, description: 'Estado do PIR (Presença 0 ou 1)' },
    { name: 'R1', value: hexRawInput, description: 'Leitura bruta do ADC (Sensor Térmico)' },
    { name: 'R2', value: calculatedTempHex, description: 'Valor calculado da Temperatura (°C)' },
    { name: 'R3', value: thresholdHex, description: 'Limite de Disparo do Alarme' },
    { name: 'R4', value: temperature > threshold ? '0x00000001' : '0x00000000', description: 'Flag de Decisão do Alarme' },
    { name: 'R13 (SP)', value: '0x20003FE4', description: 'Stack Pointer (Ponteiro de Pilha)' },
    { name: 'R14 (LR)', value: '0x080012D8', description: 'Link Register (Retorno de Sub-rotina)' },
    { name: 'R15 (PC)', value: '0x080004' + (40 + pipelineIndex * 4).toString(16).toUpperCase(), description: 'Program Counter (Instrução Corrente)' },
  ];

  // FLAGS (APSR: Application Program Status Register)
  const zFlag = presence || (temperature === threshold) ? '1' : '0';
  const nFlag = temperature < 0 ? '1' : '0';
  const cFlag = temperature > threshold ? '1' : '0';

  const armInstructions = [
    { label: 'pir_check', asm: 'LDR R0, [R11, #PIR_OFFSET]', desc: 'Carrega registrador R0 com estado do pino do PIR' },
    { label: '', asm: 'CMP R0, #1', desc: 'Compara estado do sensor PIR (R0) com 1' },
    { label: '', asm: 'BNE temp_check', desc: 'Desvia o fluxo do programa para temp_check se igual a zero (sem movimento)' },
    { label: '', asm: 'MOV R0, #1', desc: 'Ativa projeto de iluminação de alerta e acende LED' },
    { label: 'temp_check', asm: 'LDR R1, [R11, #ADC_VALUE]', desc: 'Lê canal ADC A0 correspondente ao Sensor TMP36' },
    { label: '', asm: 'LDR R3, [R11, #THRESHOLD]', desc: 'Busca o limite pré-gravado para comparação' },
    { label: '', asm: 'CMP R1, R3', desc: 'Compara a leitura com o limite de disparo' },
    { label: '', asm: 'BLE loop_delay', desc: 'Desvia se a leitura for menor ou igual ao limite' },
    { label: '', asm: 'BL activate_alarm', desc: 'Executa a chamada da sub-rotina do Buzzer Sonoro' },
  ];

  // Cycle pipeline automatically for engagement
  useEffect(() => {
    const timer = setInterval(() => {
      setPipelineIndex((prev) => (prev + 1) % armInstructions.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [armInstructions.length]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white rounded-2xl border-2 border-pink-200/60 p-6 shadow-md h-[620px] overflow-y-auto">
      {/* Left Pane: Registers and Status Flags */}
      <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 border-b border-pink-100 pb-3 mb-4">
            <Cpu className="w-5 h-5 text-pink-500" />
            <h3 className="font-bold text-pink-900 text-xs tracking-wider uppercase font-sans">REGISTRADORES ARM</h3>
          </div>
          <div className="space-y-2">
            {registers.map((reg) => (
              <div key={reg.name} className="flex items-center justify-between bg-pink-50/20 p-2.5 rounded-xl border border-pink-100 hover:border-pink-300 transition-colors">
                <span className="font-mono text-pink-700 text-xs font-bold">{reg.name}</span>
                <span className="font-mono text-pink-950 text-xs select-all font-semibold">{reg.value}</span>
                <span className="text-[9px] text-pink-500 max-w-[120px] truncate" title={reg.description}>
                  {reg.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FLAG APSR visualizer */}
        <div className="bg-pink-50/50 p-3 rounded-xl border border-pink-100">
          <span className="text-[9px] font-bold font-sans text-pink-500 block mb-2 uppercase tracking-wider">APSR Flags (Application Program Status)</span>
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className={`p-1.5 rounded-lg ${nFlag === '1' ? 'bg-pink-200 text-pink-800 border border-pink-300 font-bold' : 'bg-white text-pink-300 border border-pink-100'}`}>
              <div className="font-bold">N</div>
              <div className="text-[9px]">Neg (1)</div>
            </div>
            <div className={`p-1.5 rounded-lg ${zFlag === '1' ? 'bg-blue-100 text-blue-800 border border-blue-200 font-bold' : 'bg-white text-pink-200 border border-pink-50'}`}>
              <div className="font-bold">Z</div>
              <div className="text-[9px]">Zero (1)</div>
            </div>
            <div className={`p-1.5 rounded-lg ${cFlag === '1' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold' : 'bg-white text-pink-200 border border-pink-50'}`}>
              <div className="font-bold">C</div>
              <div className="text-[9px]">Carry (1)</div>
            </div>
            <div className="p-1.5 rounded-lg bg-white text-pink-200 border border-pink-50">
              <div className="font-bold">V</div>
              <div className="text-[9px]">Ovf (0)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Pane: Pipeline Execution */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center gap-2 border-b border-pink-100 pb-3 mb-4">
          <Layers className="w-5 h-5 text-blue-400 animate-pulse" />
          <h3 className="font-bold text-pink-900 text-xs tracking-wider uppercase font-sans">PIPELINE DE 3 ESTÁGIOS</h3>
        </div>

        {/* Dynamic Pipeline stages */}
        <div className="space-y-3">
          {/* Stage 1: Fetch */}
          <div className="bg-blue-50/40 p-3 rounded-xl border-l-4 border-dashed border-blue-400 border-t border-r border-b border-blue-100">
            <span className="text-[9px] text-blue-600 font-bold tracking-wider font-sans">ESTÁGIO 1: FETCH (Busca de Instrução)</span>
            <div className="font-sans text-[11px] text-blue-800 mt-1">
              Instrução lida da Flash:
            </div>
            <div className="mt-1 bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5 justify-between">
              <span className="text-blue-950 font-mono font-bold text-[11px]">
                {armInstructions[(pipelineIndex + 1) % armInstructions.length].asm}
              </span>
              <span className="text-[9px] bg-blue-100 text-blue-600 font-mono px-1.5 py-0.5 rounded-full font-bold">PC + 4</span>
            </div>
          </div>

          {/* Stage 2: Decode */}
          <div className="bg-pink-50/40 p-3 rounded-xl border-l-4 border-dashed border-pink-400 border-t border-r border-b border-pink-100">
            <span className="text-[9px] text-pink-600 font-bold tracking-wider font-sans">ESTÁGIO 2: DECODE (Decodificação)</span>
            <div className="font-sans text-[11px] text-pink-800 mt-1">
              Identificando operandos da memória:
            </div>
            <div className="mt-1 bg-white px-2.5 py-1.5 rounded-lg border border-pink-100 flex items-center gap-1.5 justify-between">
              <span className="text-pink-950 font-mono font-bold text-[11px]">
                {armInstructions[pipelineIndex].asm}
              </span>
              <span className="text-[9px] bg-pink-100 text-pink-600 font-mono px-1.5 py-0.5 rounded-full font-bold">DECODE</span>
            </div>
          </div>

          {/* Stage 3: Execute */}
          <div className="bg-emerald-50/40 p-3 rounded-xl border-l-4 border-emerald-400 border-t border-r border-b border-emerald-100">
            <span className="text-[9px] text-emerald-600 font-bold tracking-wider font-sans">ESTÁGIO 3: EXECUTE (Unidade Lógica ALU)</span>
            <div className="font-sans text-[11px] text-emerald-800 mt-1">
              Ação sendo efetuada no clock atual:
            </div>
            <div className="mt-1 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-emerald-700 font-bold font-mono text-[11px]">
                  {armInstructions[pipelineIndex === 0 ? armInstructions.length - 1 : pipelineIndex - 1].asm}
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-600 font-mono px-1.5 py-0.5 rounded-full font-bold">ALU</span>
              </div>
              <p className="text-[10px] text-emerald-950 font-sans mt-0.5 leading-relaxed">
                {armInstructions[pipelineIndex === 0 ? armInstructions.length - 1 : pipelineIndex - 1].desc}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-900 space-y-1.5 text-xs text-justify">
          <HelpCircle className="w-4 h-4 text-blue-500 float-left mr-1.5 shrink-0" />
          <p className="leading-relaxed">
            <strong>Como funciona em ARM?</strong> Em vez de executar uma instrução por vez de forma isolada, as CPUs ARM dividem a instrução em estágios paralelos. Enquanto o estágio 3 executa uma conta, o estágio 2 já traduz a próxima instrução, e o estágio 1 busca uma terceira da memória. Isto é a alma do alto desempenho com baixo consumo RISC.
          </p>
        </div>
      </div>

      {/* Right Pane: Assembly Equivalent code blocks list */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center gap-2 border-b border-pink-100 pb-3 mb-4">
          <GitCommit className="w-5 h-5 text-pink-500" />
          <h3 className="font-bold text-pink-900 text-xs tracking-wider uppercase font-sans">Assembly Final ARM</h3>
        </div>

        <div className="bg-pink-50/10 rounded-xl border border-pink-100 p-4 font-mono text-xs space-y-2 h-[480px] overflow-y-auto">
          {armInstructions.map((inst, idx) => {
            const isFetching = (pipelineIndex + 1) % armInstructions.length === idx;
            const isDecoding = pipelineIndex === idx;
            const isExecuting = (pipelineIndex === 0 ? armInstructions.length - 1 : pipelineIndex - 1) === idx;

            let indicator: React.ReactNode = null;
            let bgClass = 'bg-white border-pink-100/50';
            let textColor = 'text-pink-800';

            if (isExecuting) {
              indicator = <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-bold px-1.5 py-0.5 rounded-lg shrink-0">EXEC</span>;
              bgClass = 'bg-emerald-50/30 border-emerald-200';
              textColor = 'text-emerald-900 font-bold';
            } else if (isDecoding) {
              indicator = <span className="bg-pink-100 text-pink-700 border border-pink-200 text-[8px] font-bold px-1.5 py-0.5 rounded-lg shrink-0">DEC</span>;
              bgClass = 'bg-pink-50/50 border-pink-200';
              textColor = 'text-pink-900 font-bold';
            } else if (isFetching) {
              indicator = <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[8px] font-bold px-1.5 py-0.5 rounded-lg shrink-0">FET</span>;
              bgClass = 'bg-blue-50/20 border-blue-200';
              textColor = 'text-blue-900 font-bold';
            }

            return (
              <div key={idx} className={`p-2.5 rounded-xl border transition-all flex flex-col gap-1 ${bgClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2 items-center">
                    {inst.label && <span className="text-pink-500 font-bold text-[9px] shrink-0">{inst.label}:</span>}
                    <span className={`font-semibold ${textColor}`}>{inst.asm}</span>
                  </div>
                  {indicator}
                </div>
                <div className="text-[10px] text-pink-600/70 leading-snug">
                  {inst.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
