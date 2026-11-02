import React, { useState } from 'react';
import { Download, Monitor, Smartphone, Share, CheckCircle2, X, PlusSquare, Info } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { hasNativePrompt, isInstalled, isIOS, isMobile, promptInstall } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleClick = async () => {
    if (hasNativePrompt) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      setShowModal(true);
    }
  };

  if (isInstalled) {
    return (
      <div
        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
        title="La aplicación está instalada y funcionando en modo nativo"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>App Instalada</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] border border-cyan-400/30"
        title={isMobile ? "Instalar aplicación en tu móvil" : "Instalar aplicación en tu PC"}
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span className="hidden sm:inline">
          {isMobile ? 'Instalar en Móvil' : 'Instalar en PC / Móvil'}
        </span>
        <span className="sm:hidden">Instalar</span>
        <span className="hidden lg:flex items-center gap-1 bg-black/25 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">
          {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
          <span>PWA</span>
        </span>
      </button>

      {/* Guided Install Modal for iOS, Chrome, Edge or Manual Installation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalar OEE Industrial</h3>
                <p className="text-xs text-slate-400">
                  Acceso directo nativo con soporte offline y pantalla completa
                </p>
              </div>
            </div>

            <div className="space-y-4 my-5 text-xs text-slate-300">
              {/* iOS Guide */}
              {isIOS ? (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-cyan-400">
                    <Smartphone className="w-4 h-4" />
                    <span>Instalación en iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-slate-200">1.</span>
                      <span>
                        Toca el botón <strong className="text-white">Compartir</strong>{' '}
                        <Share className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> en la barra inferior de Safari.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-slate-200">2.</span>
                      <span>
                        Desplázate hacia abajo y selecciona{' '}
                        <strong className="text-white">"Añadir a pantalla de inicio"</strong>{' '}
                        <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-cyan-400" />.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-slate-200">3.</span>
                      <span>
                        Toca <strong className="text-white">"Añadir"</strong> en la esquina superior derecha.
                      </span>
                    </li>
                  </ol>
                </div>
              ) : (
                <>
                  {/* PC / Desktop Instructions */}
                  <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-cyan-400">
                      <Monitor className="w-4 h-4" />
                      <span>Instalación en PC (Windows, Mac, Linux):</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                      <li>
                        En <strong className="text-white">Google Chrome</strong> o <strong className="text-white">Microsoft Edge</strong>, haz clic en el icono de instalación{' '}
                        <span className="bg-slate-700 px-1.5 py-0.5 rounded text-[11px] text-cyan-300 font-mono">⊕ Instalar</span> ubicado a la derecha de la barra de direcciones.
                      </li>
                      <li>
                        O abre el menú del navegador <strong className="text-white">(⋮)</strong> → <strong className="text-white">"Instalar OEE Planta..."</strong>.
                      </li>
                    </ul>
                  </div>

                  {/* Android Instructions */}
                  <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-cyan-400">
                      <Smartphone className="w-4 h-4" />
                      <span>Instalación en Móvil (Android):</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                      <li>
                        Toca el menú del navegador <strong className="text-white">(⋮)</strong> en la esquina superior derecha.
                      </li>
                      <li>
                        Selecciona <strong className="text-white">"Instalar aplicación"</strong> o <strong className="text-white">"Añadir a pantalla de inicio"</strong>.
                      </li>
                    </ul>
                  </div>
                </>
              )}

              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 flex items-start gap-2.5 text-cyan-200 text-[11px]">
                <Info className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                <span>
                  La versión instalada arranca al instante como una aplicación de escritorio o móvil independiente sin barras del navegador y almacena los datos de planta localmente para operar sin internet.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Toast */}
      {installSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-xs font-semibold">¡Aplicación instalada exitosamente!</span>
        </div>
      )}
    </>
  );
};
