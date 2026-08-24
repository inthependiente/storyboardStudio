import { jsPDF } from 'jspdf'
import { barlowRegular } from "/public/BarlowCondensed-Regular.js"
import { barlowBold } from "/public/BarlowCondensed-Bold.js"
import { barlowItalic } from "/public/BarlowCondensed-Italic.js"

// Convertir URL de imagen a Base64 de manera segura
const getBase64ImageFromUrl = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl, { mode: 'cors' })
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error al cargar imagen para el PDF:', error)
    return null
  }
}

export const generateStoryboardPDF = async (storyboardName, panels, locutions, panelsPerPage) => {
  // 1. Todos los PDF se exportan en formato horizontal (landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter'
  })

  doc.addFileToVFS("BarlowCondensed-Regular.ttf", barlowRegular);
  doc.addFont("BarlowCondensed-Regular.ttf", "BarlowCondensed", "normal");
  doc.addFileToVFS("BarlowCondensed-Bold.ttf", barlowBold);
  doc.addFont("BarlowCondensed-Bold.ttf", "BarlowCondensed", "bold");
  doc.addFileToVFS("BarlowCondensed-Italic.ttf", barlowItalic);
  doc.addFont("BarlowCondensed-Italic.ttf", "BarlowCondensed", "italic");

  const pageWidth = doc.internal.pageSize.getWidth() // 279mm
  const pageHeight = doc.internal.pageSize.getHeight() // 216mm
  const margin = 5
  const usableWidth = pageWidth - (margin * 2) // 269mm

  const base64Images = await Promise.all(
    panels.map(p => p.image_url ? getBase64ImageFromUrl(p.image_url) : Promise.resolve(null))
  )

  const drawHeader = (pageNum, totalPages) => {
    doc.setFont('BarlowCondensed', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)
    doc.text(storyboardName.toUpperCase(), margin, 8)

    doc.setFont('BarlowCondensed', 'normal')
    doc.setFontSize(8)
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin - 20, 8)

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margin, 10, pageWidth - margin, 10)
  }

  // CONFIGURACIÓN DE CORNERS REDONDEADOS
  const cornerRadius = 3

  if (panelsPerPage === 1) {
    const totalPages = panels.length
    for (let i = 0; i < panels.length; i++) {
      if (i > 0) doc.addPage()
      drawHeader(i + 1, totalPages)

      const panel = panels[i]
      const locution = locutions[i] || ''
      const imgData = base64Images[i]

      // Tarjeta principal (Bordes redondeados)
      const cardX = margin
      const cardY = 20
      const cardW = usableWidth
      const cardH = 187

      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.roundedRect(cardX, cardY, cardW, cardH, cornerRadius, cornerRadius, 'S')

      // Imagen ocupa el ancho completo de la tarjeta (en modo 1xPágina usamos una grilla de 2 columnas interna para no estirar la imagen)
      // Columna Izquierda: Imagen (16:9)
      const imgW = cardW - 10
      const imgH = (cardW - 10) * 9 / 16 // 90mm
      const imgX = cardX + 5
      const imgY = cardY + 5

      if (imgData) {
        doc.addImage(imgData, 'JPEG', imgX, imgY, imgW, imgH, undefined, 'FAST')
      } else {
        doc.setFont('Helvetica', 'italic')
        doc.setFontSize(11)
        doc.setTextColor(120, 120, 120)
        doc.text('Imagen no disponible', imgX + 55, imgY + 45)
      }

      // Columna Derecha: Datos
      const textX = 14
      let textY = cardY + 12

      // Nombre de Plano (En la parte superior)
      doc.setFont('BarlowCondensed', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(234, 88, 12) // Tono Naranja
      doc.text(`PLANO: ${panel.filename || `Panel ${i + 1}`}`, textX - 3, 17)

      doc.setTextColor(50, 50, 50)
      textY += 14

      // Descripción
      doc.setFont('BarlowCondensed', 'bold')
      doc.setFontSize(12)
      doc.text('DESCRIPCIÓN:', textX, textY + 130)
      doc.setFont('BarlowCondensed', 'normal')
      doc.setFontSize(11)
      const descLines = doc.splitTextToSize(panel.description, 250, 20)
      doc.text(descLines, textX, textY + 135)

      textY += 15 + (descLines.length * 4.5)

      // Locución
      doc.setFont('BarlowCondensed', 'bold')
      doc.setFontSize(12)
      doc.text('LOCUCIÓN / LETRA:', textX, textY + 122)
      doc.setFont('BarlowCondensed', 'italic')
      doc.setFontSize(11)
      const locLines = doc.splitTextToSize(locution, 250, 20)
      doc.text(locLines, textX, textY + 127)
    }

  } else if (panelsPerPage === 4) {
    const panelsPerPg = 4
    const totalPages = Math.ceil(panels.length / panelsPerPg)

    // Grid 2x2 en horizontal
    const colWidth = 110
    const colHeight = 100
    const colGap = 15
    const rowGap = 2

    const startX = margin + (usableWidth - (colWidth * 2 + colGap)) / 2

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) doc.addPage()
      drawHeader(pageNum, totalPages)

      for (let cell = 0; cell < panelsPerPg; cell++) {
        const idx = (pageNum - 1) * panelsPerPg + cell
        if (idx >= panels.length) break

        const colIdx = cell % 2
        const rowIdx = Math.floor(cell / 2)

        const x = startX + colIdx * (colWidth + colGap)
        const y = 12 + rowIdx * (colHeight + rowGap)

        const panel = panels[idx]
        const locution = locutions[idx] || ''
        const imgData = base64Images[idx]

        // 2. Tarjeta con bordes redondeados
        doc.setDrawColor(210, 210, 210)
        doc.roundedRect(x, y, colWidth, colHeight, cornerRadius, cornerRadius, 'S')

        // Nombre del Plano (Vuelve a la parte superior de la tarjeta)
        doc.setFont('BarlowCondensed', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(234, 88, 12)
        doc.text(panel.filename || 'Plano', x + 4, y + 4.5)

        // 3. Imagen ocupa todo el ancho de la tarjeta (Relación de aspecto 16:9)
        const imgW = colWidth
        const imgH = colWidth * 9 / 16 // 61.8mm
        const imgY = y + 6

        if (imgData) {
          doc.addImage(imgData, 'JPEG', x, imgY, imgW, imgH, undefined, 'FAST')
        } else {
          doc.setFillColor(245, 245, 245)
          doc.setFont('BarlowCondensed', 'italic')
          doc.setFontSize(8)
          doc.setTextColor(140, 140, 140)
          doc.text('Sin imagen', x + (imgW / 2) - 10, imgY + (imgH / 2))
        }

        // Redibujar borde redondeado para marcar el límite de la tarjeta
        doc.setDrawColor(210, 210, 210)
        doc.roundedRect(x, y, colWidth, colHeight, cornerRadius, cornerRadius, 'S')

        // Textos abajo de la imagen
        let textY = imgY + imgH + 4
        doc.setFontSize(10)
        doc.setTextColor(60, 60, 60)

        // Descripción
        doc.setFont('BarlowCondensed', 'bold')
        doc.text('Descripción:', x + 3, textY)
        doc.roundedRect(x + 2, textY + 1, 106, 10, 2, 2, 'S')
        doc.setFont('BarlowCondensed', 'normal')
        const descLines = doc.splitTextToSize(panel.description || '', colWidth - 4)
        const descToDraw = descLines.slice(0, 2) // max 2 líneas por espacio
        doc.text(descToDraw, x + 4, textY + 5)

        //tamaño del texto de descripción
        const descY = doc.getTextDimensions(descLines).h;

        // Locución (Audio)
        textY += 4.5
        doc.setFont('BarlowCondensed', 'bold')
        doc.text('Locución / Letra:', x + 3, textY + 10)
        doc.roundedRect(x + 2, textY + 11, 106, 10, 2, 2, 'S')
        doc.setFont('BarlowCondensed', 'italic')
        const locLines = doc.splitTextToSize(locution || '', colWidth - 4)
        const locToDraw = locLines.slice(0, 2) // max 2 líneas
        doc.text(locToDraw, x + 4, textY + 15)
      }
    }

  } else if (panelsPerPage === 6) {
    const panelsPerPg = 6
    const totalPages = Math.ceil(panels.length / panelsPerPg)

    // Grid 3x2 en horizontal
    const colWidth = 82
    const colHeight = 89
    const colGap = 10
    const rowGap = 7

    const startX = margin + (usableWidth - (colWidth * 3 + colGap * 2)) / 2

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) doc.addPage()
      drawHeader(pageNum, totalPages)

      for (let cell = 0; cell < panelsPerPg; cell++) {
        const idx = (pageNum - 1) * panelsPerPg + cell
        if (idx >= panels.length) break

        const colIdx = cell % 3
        const rowIdx = Math.floor(cell / 3)

        const x = startX + colIdx * (colWidth + colGap)
        const y = 22 + rowIdx * (colHeight + rowGap)

        const panel = panels[idx]
        const locution = locutions[idx] || ''
        const imgData = base64Images[idx]

        // 2. Tarjeta con bordes redondeados
        doc.setDrawColor(210, 210, 210)
        doc.roundedRect(x, y, colWidth, colHeight, cornerRadius, cornerRadius, 'S')

        // Nombre del Plano (En la parte superior de la tarjeta)
        doc.setFont('BarlowCondensed', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(234, 88, 12)
        doc.text(panel.filename || 'Plano', x + 3, y + 5)

        // 3. Imagen ocupa todo el ancho de la tarjeta (Relación de aspecto 16:9)
        const imgW = colWidth
        const imgH = colWidth * 9 / 16 // 46.1mm
        const imgY = y + 6.5

        if (imgData) {
          doc.addImage(imgData, 'JPEG', x, imgY, imgW, imgH, undefined, 'FAST')
        } else {
          doc.setFillColor(245, 245, 245)
          doc.roundedRect(x, imgY, imgW, imgH, cornerRadius, cornerRadius, 'F')
          doc.setFont('BarlowCondensed', 'italic')
          doc.setFontSize(7.5)
          doc.setTextColor(140, 140, 140)
          doc.text('Sin imagen', x + (imgW / 2) - 10, imgY + (imgH / 2))
        }

        // Redibujar borde redondeado
        doc.setDrawColor(210, 210, 210)
        doc.roundedRect(x, y, colWidth, colHeight, cornerRadius, cornerRadius, 'S')

        // Textos
        let textY = imgY + imgH + 4
        doc.setFontSize(10)
        doc.setTextColor(60, 60, 60)

        // Descripción
        doc.setFont('BarlowCondensed', 'bold')
        doc.text('Descripción:', x + 4, textY + 1)
        doc.roundedRect(x + 2, textY + 2, 78, 10, 2, 2, 'S')
        doc.setFont('BarlowCondensed', 'normal')
        const descLines = doc.splitTextToSize(panel.description || '', colWidth - 10)
        const descToDraw = descLines.slice(0, 2)
        doc.text(descToDraw, x + 5, textY + 6)

        // Locución
        textY += 10
        doc.setFont('BarlowCondensed', 'bold')
        doc.text('Locución / Letra:', x + 4, textY + 7)
        doc.roundedRect(x + 2, textY + 9, 78, 10, 2, 2, 'S')
        doc.setFont('BarlowCondensed', 'italic')
        const locLines = doc.splitTextToSize(locution || '', colWidth - 10)
        const locToDraw = locLines.slice(0, 2)
        doc.text(locToDraw, x + 5, textY + 13)
      }
    }

  } else if (panelsPerPage === 20) {
    const panelsPerPg = 20
    const totalPages = Math.ceil(panels.length / panelsPerPg)

    // Grid 5x4 en horizontal
    const colWidth = 48
    const colHeight = 47
    const colGap = 6
    const rowGap = 3

    const startX = margin + (usableWidth - (colWidth * 5 + colGap * 4)) / 2

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) doc.addPage()
      drawHeader(pageNum, totalPages)

      for (let cell = 0; cell < panelsPerPg; cell++) {
        const idx = (pageNum - 1) * panelsPerPg + cell
        if (idx >= panels.length) break

        const colIdx = cell % 5
        const rowIdx = Math.floor(cell / 5)

        const x = startX + colIdx * (colWidth + colGap)
        const y = 14 + rowIdx * (colHeight + rowGap)

        const panel = panels[idx]
        const locution = locutions[idx] || ''
        const imgData = base64Images[idx]

        // 2. Tarjeta con bordes redondeados
        doc.setDrawColor(220, 220, 220)
        doc.roundedRect(x, y, colWidth, colHeight, 2, 2, 'S')

        // Nombre del Plano (En la parte superior de la tarjeta)
        doc.setFont('BarlowCondensed', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(234, 88, 12)
        doc.text(panel.filename || 'Plano', x + 2.5, y + 4)

        // 3. Imagen ocupa todo el ancho (Relación de aspecto 16:9)
        const imgW = colWidth
        const imgH = colWidth * 9 / 16 // 27mm
        const imgY = y + 5.5

        if (imgData) {
          doc.addImage(imgData, 'JPEG', x, imgY, imgW, imgH, undefined, 'FAST')
        } else {
          doc.setFillColor(245, 245, 245)
          doc.roundedRect(x, imgY, imgW, imgH, 2, 2, 'F')
          doc.setFont('BarlowCondensed', 'italic')
          doc.setFontSize(5.5)
          doc.setTextColor(140, 140, 140)
          doc.text('Sin imagen', x + (imgW / 2) - 8, imgY + (imgH / 2))
        }

        // Redibujar borde redondeado
        doc.setDrawColor(220, 220, 220)
        doc.roundedRect(x, y, colWidth, colHeight, 2, 2, 'S')

        // 4. SOLO SE EXPORTA: nombre del cuadro (filename), imagen y el audio (locution). SE OMITE LA DESCRIPCIÓN.
        const textY = imgY + imgH + 3
        doc.setFontSize(6)
        doc.setTextColor(60, 60, 60)

        // Locución (Audio) - Ocupa el espacio inferior sin descripción
        doc.setFont('BarlowCondensed', 'bold')
        doc.text('Locución / Letra:', x + 2.5, textY)
        doc.setFont('BarlowCondensed', 'italic')

        const locLines = doc.splitTextToSize(locution || '', colWidth - 5)
        const locToDraw = locLines.slice(0, 3) // max 3 líneas
        doc.text(locToDraw, x + 2.5, textY + 3)
      }
    }
  }

  doc.save(`${storyboardName.toLowerCase().replace(/\s+/g, '_')}_storyboard.pdf`)
}
