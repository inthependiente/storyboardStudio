import React, { useRef } from 'react'
import Papa from 'papaparse'
import { FileSpreadsheet } from 'lucide-react'

export default function CSVImporter({ onImport }) {
  const fileInputRef = useRef(null)

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      complete: (results) => {
        const rows = results.data
        if (!rows || rows.length === 0) return

        const importedData = []
        
        // Determinar mapeo básico
        // Ignorar encabezados comunes si existen
        let startIdx = 0
        const firstRow = rows[0]
        const isHeader = firstRow.some(cell => 
          typeof cell === 'string' && 
          (cell.toLowerCase().includes('descripcion') || 
           cell.toLowerCase().includes('descripción') || 
           cell.toLowerCase().includes('locucion') || 
           cell.toLowerCase().includes('locución') || 
           cell.toLowerCase().includes('viñeta') || 
           cell.toLowerCase().includes('audio') ||
           cell.toLowerCase().includes('id') ||
           cell.toLowerCase().includes('nombre'))
        )
        
        if (isHeader) {
          startIdx = 1
        }

        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i]
          if (row.length === 0 || (row.length === 1 && !row[0])) continue

          let filename = ''
          let description = ''
          let locution = ''

          if (row.length >= 3) {
            // Caso: Número/Nombre, Descripción, Locución
            filename = String(row[0]).trim()
            description = String(row[1]).trim()
            locution = String(row[2]).trim()
          } else if (row.length === 2) {
            // Caso: Descripción, Locución (se asocian por posición)
            description = String(row[0]).trim()
            locution = String(row[1]).trim()
          } else if (row.length === 1) {
            // Caso: Sólo descripción o sólo locución
            description = String(row[0]).trim()
          }

          // Solo guardamos si hay contenido relevante
          if (filename || description || locution) {
            importedData.push({ filename, description, locution })
          }
        }

        if (importedData.length > 0) {
          onImport(importedData)
          alert(`Se importaron con éxito ${importedData.length} filas del archivo CSV.`)
        } else {
          alert('No se encontraron datos válidos en el archivo CSV.')
        }

        // Limpiar el input para permitir cargar el mismo archivo de nuevo si fuera necesario
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
      header: false,
      skipEmptyLines: true
    })
  }

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow transition duration-200 cursor-pointer"
      >
        <FileSpreadsheet size={16} />
        Importar Texto (CSV)
      </button>
    </div>
  )
}
