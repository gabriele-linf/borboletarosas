import { Cpu, FileText, Settings, Play, Radio, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentTab: 'simulator' | 'arm';
  onChangeTab: (tab: 'simulator' | 'arm') => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function Navbar({ currentTab, onChangeTab, isMuted, onToggleMute }: NavbarProps) {
  return (
    <header className="bg-white/95 border-b-2 border-pink-200/60 text-slate-800 py-4 px-6 sticky top-0 z-50 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Titles */}
        <div className="flex items-center gap-3">
          <div className="bg-pink-100 p-2.5 rounded-2xl shadow-inner border border-pink-200">
            <Cpu className="w-6 h-6 text-pink-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] bg-blue-50 text-blue-600 font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-blue-200 uppercase block w-max">
              ❀ Domótica & Hardware SAKURA Core
            </span>
            <h1 className="text-lg font-bold tracking-tight text-pink-950 mt-0.5">
              Simulador Multidisciplinar Residencial
            </h1>
          </div>
        </div>

        {/* Tab Actions */}
        <nav className="flex items-center gap-2 bg-pink-50/60 p-1.5 rounded-xl border border-pink-200 shrink-0">
          <button
            onClick={() => onChangeTab('simulator')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              currentTab === 'simulator'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'text-pink-700 hover:bg-pink-150 hover:text-pink-900'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Simulador de Circuito
          </button>
          <button
            onClick={() => onChangeTab('arm')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              currentTab === 'arm'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'text-pink-700 hover:bg-pink-150 hover:text-pink-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Análise ARM / CPU
          </button>
        </nav>

        {/* Mute and Academic reference */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mute toggle button */}
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isMuted
                ? 'bg-blue-50 text-blue-500 border-blue-200 hover:bg-blue-100'
                : 'bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200'
            }`}
            title={isMuted ? 'Ativar Áudio do Alarme' : 'Mutar Alarme Buzzer'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="text-[11px] font-mono font-bold hidden sm:inline">
              {isMuted ? 'SOM: DESATIVADO' : 'SOM: HABILITADO'}
            </span>
          </button>

          {/* User label */}
          <div className="text-right hidden xl:block font-sans text-xs">
            <span className="text-pink-500 block text-[10px] font-bold">MONITORAMENTO</span>
            <span className="text-pink-950 font-semibold">Semestre Acadêmico 2026/1</span>
          </div>
        </div>
      </div>
    </header>
  );
}
