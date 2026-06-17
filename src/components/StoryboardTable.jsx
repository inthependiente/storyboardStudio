import React from 'react'
import { ArrowUp, ArrowDown, Trash2, ArrowUpDown, PlusCircle, RefreshCw } from 'lucide-react'

export default function StoryboardTable({
  panels,
  locutions,
  onUpdatePanel,
  onUpdateLocution,
  onDeletePanel,
  onMovePanel,
  onAddPanel,
  onSingleImageReplace
}) {

  const handleDescriptionChange = (index, value) => {
    onUpdatePanel(index, { ...panels[index], description: value })
  }

  const handleFilenameChange = (index, value) => {
    onUpdatePanel(index, { ...panels[index], filename: value })
  }

  const handleLocutionChange = (index, value) => {
    onUpdateLocution(index, value)
  }

  const handleMoveChange = (fromIndex, toIndexStr) => {
    const toIndex = parseInt(toIndexStr, 10)
    if (isNaN(toIndex) || toIndex < 0 || toIndex >= panels.length) return
    onMovePanel(fromIndex, toIndex)
  }

  const triggerSingleFileSelect = (index) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (file) {
        onSingleImageReplace(index, file)
      }
    }
    input.click()
  }

  return (
    <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-700/50 text-slate-300 font-semibold text-sm border-b border-slate-700">
              <th className="py-4 px-6 w-16 text-center">#</th>
              <th className="py-4 px-6 w-48">Viñeta</th>
              <th className="py-4 px-6">Descripción (Sigue al cuadro)</th>
              <th className="py-4 px-6">Locución / Audio (Estática por Índice)</th>
              <th className="py-4 px-6 w-48 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {panels.map((panel, index) => {
              const locutionValue = locutions[index] || ''
              
              return (
                <tr key={panel.id || index} className="hover:bg-slate-700/20 transition duration-150">
                  {/* Número de Índice */}
                  <td className="py-4 px-6 text-center align-middle font-mono text-slate-400">
                    {index + 1}
                  </td>

                  {/* Imagen y Nombre de Viñeta */}
                  <td className="py-4 px-6 align-top">
                    <div className="flex flex-col gap-2">
                      <div className="relative group w-36 h-24 bg-slate-900 border border-slate-600 rounded-lg overflow-hidden flex items-center justify-center shadow-md">
                        {panel.image_url ? (
                          <img
                            src={`${panel.image_url}?v=${panel.version || Date.now()}`}
                            alt={panel.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-slate-500 italic">Sin dibujo</span>
                        )}
                        <button
                          onClick={() => triggerSingleFileSelect(index)}
                          className="absolute inset-0 bg-slate-950/70 text-white flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          Reemplazar
                        </button>
                      </div>
                      <input
                        type="text"
                        value={panel.filename || ''}
                        onChange={(e) => handleFilenameChange(index, e.target.value)}
                        placeholder="Nombre plano"
                        className="w-36 text-xs text-center font-bold px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </td>

                  {/* Campo de Descripción */}
                  <td className="py-4 px-6 align-top">
                    <textarea
                      value={panel.description || ''}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      placeholder="Escribe la descripción de la acción, cámara o plano..."
                      className="w-full h-24 p-3 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 resize-y focus:outline-none focus:border-purple-500 transition focus:ring-1 focus:ring-purple-500"
                    />
                  </td>

                  {/* Campo de Locución / Audio */}
                  <td className="py-4 px-6 align-top">
                    <textarea
                      value={locutionValue}
                      onChange={(e) => handleLocutionChange(index, e.target.value)}
                      placeholder="Escribe el diálogo, locución o efectos de sonido..."
                      className="w-full h-24 p-3 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 resize-y focus:outline-none focus:border-emerald-500 transition focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>

                  {/* Acciones de Reordenación y Eliminación */}
                  <td className="py-4 px-6 align-middle text-center">
                    <div className="flex flex-col gap-2 items-center justify-center">
                      <div className="flex items-center gap-1">
                        <button
                          disabled={index === 0}
                          onClick={() => onMovePanel(index, index - 1)}
                          title="Subir panel"
                          className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg text-slate-200 cursor-pointer transition"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          disabled={index === panels.length - 1}
                          onClick={() => onMovePanel(index, index + 1)}
                          title="Bajar panel"
                          className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg text-slate-200 cursor-pointer transition"
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>

                      {/* Dropdown Mover a Posición */}
                      <div className="flex items-center gap-1 w-full max-w-[120px] bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-300">
                        <ArrowUpDown size={12} className="text-slate-500" />
                        <select
                          value={index}
                          onChange={(e) => handleMoveChange(index, e.target.value)}
                          className="bg-transparent border-none text-slate-300 outline-none w-full cursor-pointer focus:ring-0"
                        >
                          {panels.map((_, pIdx) => (
                            <option key={pIdx} value={pIdx} className="bg-slate-850 text-slate-100">
                              Posición {pIdx + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Botón de Borrar */}
                      <button
                        onClick={() => onDeletePanel(index)}
                        title="Eliminar viñeta"
                        className="flex items-center gap-1.5 px-3 py-1.5 mt-2 bg-rose-900/40 hover:bg-rose-900 text-rose-300 text-xs font-semibold rounded border border-rose-800/40 cursor-pointer transition"
                      >
                        <Trash2 size={12} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            
            {panels.length === 0 && (
              <tr>
                <td colSpan="5" className="py-12 text-center text-slate-400">
                  <p className="text-lg">No hay viñetas en este storyboard.</p>
                  <p className="text-sm mt-1">Sube imágenes o importa un CSV para comenzar.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Botón rápido para insertar viñeta en posición específica */}
      {panels.length > 0 && (
        <div className="bg-slate-700/20 p-4 border-t border-slate-700 flex flex-wrap justify-between items-center gap-4">
          <div className="text-sm text-slate-400">
            Total de viñetas: <span className="font-bold text-slate-200">{panels.length}</span>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg border border-slate-750">
            <span className="text-xs text-slate-300 font-medium">Insertar nueva viñeta en posición:</span>
            <select
              id="insert-position-select"
              defaultValue="0"
              className="bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs px-2 py-1 outline-none"
            >
              {Array.from({ length: panels.length + 1 }, (_, i) => (
                <option key={i} value={i}>
                  Posición {i + 1}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const select = document.getElementById('insert-position-select')
                const insertIdx = parseInt(select?.value || '0', 10)
                onAddPanel(insertIdx)
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-semibold rounded shadow transition cursor-pointer"
            >
              <PlusCircle size={14} />
              Añadir Aquí
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
