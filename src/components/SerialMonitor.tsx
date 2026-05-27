import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, ArrowDown, Send, Settings, Sparkles } from 'lucide-react';
import { LogEntry } from '../types';

interface SerialMonitorProps {
  logs: LogEntry[];
  onClear: () => void;
  onSendCommand: (command: string) => void;
}

export default function SerialMonitor({ logs, onClear, onSendCommand }: SerialMonitorProps) {
  const [inputValue, setInputValue] = useState('');
  const [baudRate, setBaudRate] = useState('9600');
  const [autoscroll, setAutoscroll] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoscroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoscroll]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendCommand(inputValue);
    setInputValue('');
  };

  return (
    <div className="bg-[#1f101b] rounded-2xl border-2 border-pink-200/60 flex flex-col h-[280px] overflow-hidden text-pink-100 shadow-md">
      {/* Top Header */}
      <div className="bg-pink-50/80 px-4 py-2.5 flex items-center justify-between border-b border-pink-100 text-xs text-pink-900 font-mono">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-pink-500" />
          <span className="font-mono font-bold tracking-wider text-pink-900">MONITOR SERIAL (COM3)</span>
          <span className="bg-pink-100 text-pink-600 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border border-pink-200">CONECTADO</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-pink-800 font-mono text-[10px]">
             <span>Baud:</span>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(e.target.value)}
              className="bg-white border-2 border-pink-100 text-pink-700 font-bold rounded-lg text-[10px] px-2 py-0.5 focus:outline-none"
            >
              <option value="4800">4800 bps</option>
              <option value="9600">9600 bps</option>
              <option value="115200">115200 bps</option>
            </select>
          </div>
          <button
            onClick={onClear}
            className="text-pink-600 hover:text-pink-800 p-1 rounded-lg hover:bg-pink-100/50 transition-colors cursor-pointer"
            title="Limpar Monitor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Console Pane */}
      <div 
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-pink-900 bg-[#160a12]"
      >
        {logs.length === 0 ? (
          <div className="text-pink-300/40 italic text-center pt-8 font-sans">
            Nenhuma informação no monitor serial. Ligue a simulação ou interaja com o circuito.
          </div>
        ) : (
          logs.map((entry) => {
            let colorClass = 'text-slate-300';
            if (entry.type === 'alert') colorClass = 'text-pink-400 font-bold';
            if (entry.type === 'success') colorClass = 'text-blue-300';
            if (entry.type === 'error') colorClass = 'text-amber-400 font-bold';

            return (
              <div key={entry.id} className="flex gap-2 items-start py-0.5 hover:bg-white/5 px-2 rounded-lg transition-colors">
                <span className="text-pink-400/50 select-none">[{entry.timestamp}]</span>
                <span className={colorClass}>{entry.message}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Command prompt form */}
      <form onSubmit={handleSubmit} className="bg-[#1f101b] border-t border-pink-900/30 px-4 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex-1 flex items-center gap-2 bg-[#160a12] border border-pink-900/40 rounded-xl px-3 py-1.5 focus-within:border-pink-500 transition-colors">
          <span className="text-pink-400 select-none font-bold">&gt;</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite comandos (ex: /ajuda, /temp 40, /movimento)"
            className="bg-transparent text-pink-50 font-mono focus:outline-none w-full placeholder:text-pink-300/20"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1.5 text-pink-200 cursor-pointer select-none font-sans text-[11px]">
            <input
              type="checkbox"
              checked={autoscroll}
              onChange={(e) => setAutoscroll(e.target.checked)}
              className="rounded-lg bg-pink-900/50 border-pink-800 text-pink-600 focus:ring-0 cursor-pointer"
            />
            <span>Autoscroll</span>
          </label>
          <button
            type="submit"
            className="bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-xl px-4 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="text-[11px] font-sans">Enviar</span>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>

      {/* Bottom Command Suggestions */}
      <div className="bg-[#160a12] border-t border-pink-950 px-4 py-1.5 text-[10px] text-pink-350 font-mono flex items-center gap-2 select-none shrink-0 overflow-x-auto whitespace-nowrap">
        <span className="text-pink-400 flex items-center gap-0.5 font-sans font-bold"><Sparkles className="w-3 h-3 text-pink-400 shrink-0" /> Comandos rápidos:</span>
        <button type="button" onClick={() => onSendCommand('/ajuda')} className="text-pink-300/80 hover:text-white underline bg-transparent border-0 cursor-pointer">/ajuda</button>
        <span>•</span>
        <button type="button" onClick={() => onSendCommand('/movimento')} className="text-pink-300/80 hover:text-white underline bg-transparent border-0 cursor-pointer">/movimento</button>
        <span>•</span>
        <button type="button" onClick={() => onSendCommand('/temp 42')} className="text-pink-300/80 hover:text-white underline bg-transparent border-0 cursor-pointer">/temp 42 (42°C)</button>
        <span>•</span>
        <button type="button" onClick={() => onSendCommand('/temp 25')} className="text-pink-300/80 hover:text-white underline bg-transparent border-0 cursor-pointer">/temp 25 (25°C)</button>
      </div>
    </div>
  );
}
