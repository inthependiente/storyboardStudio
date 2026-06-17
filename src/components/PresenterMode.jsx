import React, { useState } from 'react'
import { LayoutGrid, Grid3X3, Film, MonitorPlay, ChevronLeft, ChevronRight, EyeOff, X } from 'lucide-react'

export default function PresenterMode({
  storyboardName,
  panels,
  locutions,
  storyboards = [],
  activeStoryboardId,
  projectColors = { color_cliente: '#a78bfa', color_campana: '#34d399' },
  isAuthenticated = false,
  onSwitchStoryboard,
  onClose
}) {
  const [layoutMode, setLayoutMode] = useState(6) // default is 6 panels per page grid
  const [activeSlideIndex, setActiveSlideIndex] = useState(0) // for layout 1 (slide show)
  const [activeLightboxPanel, setActiveLightboxPanel] = useState(null)

  const handlePrevSlide = () => {
    setActiveSlideIndex(prev => Math.max(0, prev - 1))
  }

  const handleNextSlide = () => {
    setActiveSlideIndex(prev => Math.min(panels.length - 1, prev + 1))
  }

  const handleStoryboardChange = (e) => {
    const sbId = parseInt(e.target.value, 10)
    const sb = storyboards.find(s => s.id === sbId)
    if (sb && onSwitchStoryboard) {
      onSwitchStoryboard(sb)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 z-50 overflow-y-auto flex flex-col">
      {/* Header de Presentación */}
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-white m-0">
            {storyboardName}
          </h1>
          {storyboards.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="hidden md:inline text-[10px] text-slate-500 font-medium">Elige un storyboard:</span>
              <select
                value={activeStoryboardId || ''}
                onChange={handleStoryboardChange}
                className="bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs px-2.5 py-1.5 outline-none cursor-pointer focus:border-purple-500"
              >
                {storyboards.map((sb) => (
                  <option key={sb.id} value={sb.id}>
                    {sb.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Controles de Vista */}
        <div className="flex items-center gap-4">
          {/* Mobile: solo Galería y Deslizable */}
          <div className="flex md:hidden bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => { setLayoutMode(1); setActiveSlideIndex(0); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${layoutMode === 1 ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <MonitorPlay size={14} />
              Galería
            </button>
            <button
              onClick={() => setLayoutMode(4)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${layoutMode === 4 ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <LayoutGrid size={14} />
              Deslizable
            </button>
          </div>

          {/* Desktop: 4 opciones completas */}
          <div className="hidden md:flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => { setLayoutMode(1); setActiveSlideIndex(0); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${layoutMode === 1 ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <MonitorPlay size={14} />
              1 x Página
            </button>
            <button
              onClick={() => setLayoutMode(4)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${layoutMode === 4 ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <LayoutGrid size={14} />
              4 x Página
            </button>
            <button
              onClick={() => setLayoutMode(6)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${layoutMode === 6 ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Grid3X3 size={14} />
              6 x Página
            </button>
            <button
              onClick={() => setLayoutMode(20)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${layoutMode === 20 ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Film size={14} />
              20 x Página
            </button>
          </div>

          {isAuthenticated && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-750 text-xs font-semibold rounded-lg text-slate-300 cursor-pointer transition"
            >
              <EyeOff size={14} />
              Salir del Modo Vista
            </button>
          )}
        </div>
      </header>

      {/* Contenido Principal según el layout seleccionado */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col justify-center">
        {panels.length === 0 ? (
          <div className="text-center text-slate-400 py-20">
            No hay viñetas disponibles para mostrar.
          </div>
        ) : (
          <>
            {/* VISTA 1 POR PÁGINA (SLIDE SHOW) */}
            {layoutMode === 1 && (
              <div className="flex flex-col items-center max-w-4xl mx-auto w-full">
                <div className="relative w-full aspect-video bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                  {panels[activeSlideIndex].image_url ? (
                    <img
                      src={`${panels[activeSlideIndex].image_url}?v=${panels[activeSlideIndex].version || Date.now()}`}
                      alt={panels[activeSlideIndex].filename}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-500 italic text-sm">Sin dibujo disponible</span>
                  )}

                  {/* Badge de Viñeta */}
                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur border border-orange-500/25 px-3.5 py-1.5 rounded-lg text-sm font-bold text-orange-400 shadow-md">
                    {panels[activeSlideIndex].filename || 'Plano'}
                  </div>
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur border border-white/10 px-3 py-1 rounded-md text-xs text-slate-300">
                    {activeSlideIndex + 1} de {panels.length}
                  </div>
                </div>

                {/* Controles de Navegación de Diapositivas */}
                <div className="flex items-center justify-between w-full mt-6 gap-4">
                  <button
                    onClick={handlePrevSlide}
                    disabled={activeSlideIndex === 0}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </button>

                  <div className="flex gap-1.5 max-w-[200px] overflow-x-auto py-1 px-2 scrollbar-none">
                    {panels.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 cursor-pointer ${idx === activeSlideIndex ? 'bg-purple-500' : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNextSlide}
                    disabled={activeSlideIndex === panels.length - 1}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition cursor-pointer"
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Textos debajo de Diapositiva */}
                <div className="w-full grid md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl shadow-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: projectColors.color_cliente }}>Descripción del Plano</h3>
                    <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {panels[activeSlideIndex].description || <span className="italic text-slate-500">-</span>}
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl shadow-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: projectColors.color_campana }}>Locución / Audio</h3>
                    <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {locutions[activeSlideIndex] || <span className="italic text-slate-500">-</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA EN GRILLA: 4, 6 o 20 POR PÁGINA */}
            {layoutMode !== 1 && (
              <div className={`grid gap-6 ${layoutMode === 4
                ? 'grid-cols-1 md:grid-cols-2'
                : layoutMode === 6
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                }`}>
                {panels.map((panel, idx) => {
                  const loc = locutions[idx] || ''
                  return (
                    <div
                      key={panel.id || idx}
                      className={`bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg flex flex-col transition hover:border-slate-700/80 ${layoutMode === 20 ? 'p-2 gap-2' : 'p-4 gap-4'
                        }`}
                    >
                      {/* Cabecera Viñeta */}
                      <div className="flex justify-between items-center">
                        <span className={`font-bold text-orange-400 ${layoutMode === 20 ? 'text-xs' : 'text-sm'
                          }`}>
                          {panel.filename || 'Plano'}
                        </span>
                      </div>

                      {/* Imagen (Relación de aspecto 16:9 con zoom al hacer clic) */}
                      <div
                        onClick={() => panel.image_url && setActiveLightboxPanel(panel)}
                        className="relative w-full aspect-video bg-slate-950 rounded border border-slate-800/60 overflow-hidden flex items-center justify-center cursor-zoom-in group/img"
                      >
                        {panel.image_url ? (
                          <>
                            <img
                              src={`${panel.image_url}?v=${panel.version || Date.now()}`}
                              alt={panel.filename}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-150">
                              <span className="text-[9px] uppercase tracking-wider text-white font-bold bg-slate-900/90 px-2.5 py-1 rounded border border-slate-700 shadow-md">
                                Ampliar
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">Sin dibujo</span>
                        )}
                      </div>

                      {/* Textos */}
                      {layoutMode !== 20 ? (
                        <div className="flex-1 flex flex-col gap-3.5 text-xs">
                          <div className="flex-1 bg-slate-950/40 p-2.5 rounded border border-slate-850">
                            <strong className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: projectColors.color_cliente }}>Descripción:</strong>
                            <p className="text-slate-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                              {panel.description || <span className="italic text-slate-600"></span>}
                            </p>
                          </div>

                          <div className="flex-1 bg-slate-950/40 p-2.5 rounded border border-slate-850">
                            <strong className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: projectColors.color_campana }}>Locución / Audio:</strong>
                            <p className="text-slate-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                              {loc || <span className="italic text-slate-600"></span>}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Vista ultra resumida para 20 por página */
                        <div className="text-[10px] flex flex-col gap-1.5 bg-slate-950/40 p-1.5 rounded">
                          <div>
                            <span className="font-bold mr-1" style={{ color: projectColors.color_cliente }}>D:</span>
                            <span className="text-slate-300 line-clamp-1">{panel.description || '-'}</span>
                          </div>
                          <div>
                            <span className="font-bold mr-1" style={{ color: projectColors.color_campana }}>A:</span>
                            <span className="text-slate-300 line-clamp-1">{loc || '-'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox / Modal de Pantalla Completa */}
      {activeLightboxPanel && (
        <div
          onClick={() => setActiveLightboxPanel(null)}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-4 md:p-8 cursor-zoom-out"
        >
          {/* Botón de Cerrar */}
          <button
            onClick={() => setActiveLightboxPanel(null)}
            className="absolute top-4 right-4 bg-slate-900/90 hover:bg-slate-800 text-slate-300 p-2.5 rounded-full border border-slate-700 cursor-pointer shadow-lg transition duration-150"
          >
            <X size={20} />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center gap-4 cursor-default"
          >
            <img
              src={`${activeLightboxPanel.image_url}?v=${activeLightboxPanel.version || Date.now()}`}
              alt={activeLightboxPanel.filename}
              className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl border border-slate-800/80 bg-slate-950"
            />

            <div className="bg-slate-900/90 border border-slate-800 px-5 py-3 rounded-xl text-center shadow-2xl max-w-lg">
              <span className="text-orange-400 font-extrabold text-sm block tracking-wide">
                {activeLightboxPanel.filename}
              </span>
              {activeLightboxPanel.description && (
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap">
                  {activeLightboxPanel.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
