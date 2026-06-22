import PptxGenJS from 'pptxgenjs'
import JSZip from 'jszip'

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
    console.error('Error al cargar imagen para el PPT:', error)
    return null
  }
}

const FONT = 'Avenir Next Condensed'

// Calcula el rectángulo de imagen que mantiene ratio 16:9 dentro del espacio disponible
const calcImageRect = (maxW, maxH) => {
  const ratio = 16 / 9
  const idealH = maxW / ratio
  if (idealH <= maxH) {
    return { w: maxW, h: idealH }
  }
  const h = maxH
  const w = h * ratio
  return { w, h }
}

const addImageToSlide = (slide, imgData, x, y, w, h) => {
  if (!imgData) return
  slide.addImage({
    data: imgData,
    x, y, w, h,
    sizing: { type: 'contain', w, h }
  })
}

// ─── Post-procesador: añade borde blanco de 4pt solo a imágenes del PPTX ───
const addBordersToPPTX = async (arrayBuffer) => {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const slideFiles = Object.keys(zip.files).filter(
    name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
  )

  const borderXml =
    '<a:ln w="25400"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln>'

  for (const slidePath of slideFiles) {
    let xmlStr = await zip.file(slidePath).async('string')

    // Buscar bloques <p:pic>...</p:pic> y dentro de ellos modificar el <p:spPr>
    xmlStr = xmlStr.replace(
      /<p:pic>([\s\S]*?)<\/p:pic>/g,
      (picMatch) => {
        // Dentro del <p:pic>, buscar el <p:spPr> y si ya tiene <a:ln>, no tocarlo
        if (picMatch.includes('<a:ln ')) return picMatch

        return picMatch.replace(
          /(<p:spPr>)([\s\S]*?)(<\/p:spPr>)/,
          (_, open, content, close) => {
            // Insertar borderXml después de </a:prstGeom> si existe
            if (content.includes('<a:prstGeom')) {
              return `${open}${content.replace(/(<\/a:prstGeom>)/, `$1${borderXml}`)}${close}`
            }
            // Fallback: al inicio del contenido
            return `${open}${borderXml}${content}${close}`
          }
        )
      }
    )

    zip.file(slidePath, xmlStr)
  }

  return await zip.generateAsync({ type: 'arraybuffer' })
}

// ─── Generación principal ───
export const generateStoryboardPPT = async (storyboardName, panels, locutions, panelsPerSlide, colorCliente = 'E8580C') => {
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'CUSTOM_16_9', width: 13.333, height: 7.5 })
  pptx.layout = 'CUSTOM_16_9'

  const SW = 13.333
  const SH = 7.5
  const M = 0.3
  const BG = '0F172B'
  const TXT_COLOR = 'FFFFFF'
  const CLIENTE_COLOR = colorCliente.replace('#', '')

  const base64Images = await Promise.all(
    panels.map(p => p.image_url ? getBase64ImageFromUrl(p.image_url) : Promise.resolve(null))
  )

  const perPage = panelsPerSlide
  const totalSlides = Math.ceil(panels.length / perPage)

  for (let s = 1; s <= totalSlides; s++) {
    const slide = pptx.addSlide()
    slide.background = { color: BG }

    if (panelsPerSlide === 1) {
      for (let c = 0; c < 1; c++) {
        const idx = (s - 1) * 1 + c
        if (idx >= panels.length) break
        const p = panels[idx]
        const loc = locutions[idx] || ''
        const img = base64Images[idx]

        const imgY = M + 0.55
        const imgBoxW = SW - M * 2
        const imgBoxH = SH - imgY - 0.7
        const { w: imgW, h: imgH } = calcImageRect(imgBoxW, imgBoxH)
        const offsetX = (imgBoxW - imgW) / 2
        const offsetY = (imgBoxH - imgH) / 2
        const imgLeft = M + offsetX

        slide.addText(p.filename || `Panel ${idx + 1}`, {
          x: imgLeft, y: M, w: SW - imgLeft - M, h: 0.45,
          fontSize: 20, fontFace: FONT, color: TXT_COLOR, bold: true
        })
        addImageToSlide(slide, img, imgLeft, imgY + offsetY, imgW, imgH)
        slide.addText([
          { text: 'Locución: ', options: { bold: true, fontFace: FONT, fontSize: 15, color: TXT_COLOR } },
          { text: loc, options: { italic: true, fontFace: FONT, fontSize: 15, color: TXT_COLOR } }
        ], { x: imgLeft, y: SH - M - 0.4, w: SW - imgLeft - M, h: 0.5 })
      }
    } else if (panelsPerSlide === 4) {
      const cols = 2, rows = 2, gapX = 0.35, gapY = 0.3
      const cardW = (SW - M * 2 - gapX * (cols - 1)) / cols
      const cardH = (SH - M * 2 - gapY * (rows - 1)) / rows
      const titleH = 0.35, locH = 0.35
      const imgBoxW = cardW
      const imgBoxH = cardH - titleH - locH

      for (let cell = 0; cell < perPage; cell++) {
        const idx = (s - 1) * perPage + cell
        if (idx >= panels.length) break
        const col = cell % cols, row = Math.floor(cell / cols)
        const x = M + col * (cardW + gapX)
        const y = M + row * (cardH + gapY)
        const p = panels[idx], loc = locutions[idx] || '', img = base64Images[idx]

        const { w: imgW, h: imgH } = calcImageRect(imgBoxW, imgBoxH)
        const offsetX = (imgBoxW - imgW) / 2
        const imgLeft = x + offsetX
        const imgY = y + titleH + 0.03

        slide.addText(p.filename || 'Plano', {
          x: imgLeft, y, w: cardW - offsetX, h: titleH,
          fontSize: 13, fontFace: FONT, color: TXT_COLOR, bold: true
        })
        addImageToSlide(slide, img, imgLeft, imgY, imgW, imgH)

        const textY = imgY + imgH + 0.06
        slide.addText([
          { text: 'Locución: ', options: { bold: true, fontFace: FONT, fontSize: 11, color: TXT_COLOR } },
          { text: loc, options: { italic: true, fontFace: FONT, fontSize: 11, color: TXT_COLOR } }
        ], { x: imgLeft, y: textY, w: cardW - offsetX, h: cardH - (textY - y), valign: 'top' })
      }
    } else if (panelsPerSlide === 6) {
      const cols = 3, rows = 2, gapX = 0.25, gapY = 0.3
      const cardW = (SW - M * 2 - gapX * (cols - 1)) / cols
      const cardH = (SH - M * 2 - gapY * (rows - 1)) / rows
      const titleH = 0.28, locH = 0.3
      const imgBoxW = cardW
      const imgBoxH = cardH - titleH - locH

      for (let cell = 0; cell < perPage; cell++) {
        const idx = (s - 1) * perPage + cell
        if (idx >= panels.length) break
        const col = cell % cols, row = Math.floor(cell / cols)
        const x = M + col * (cardW + gapX)
        const y = M + row * (cardH + gapY)
        const p = panels[idx], loc = locutions[idx] || '', img = base64Images[idx]

        const { w: imgW, h: imgH } = calcImageRect(imgBoxW, imgBoxH)
        const offsetX = (imgBoxW - imgW) / 2
        const imgLeft = x + offsetX
        const imgY = y + titleH + 0.04

        slide.addText(p.filename || 'Plano', {
          x: imgLeft, y, w: cardW - offsetX, h: titleH,
          fontSize: 13, fontFace: FONT, color: TXT_COLOR, bold: true
        })
        addImageToSlide(slide, img, imgLeft, imgY, imgW, imgH)

        const textY = imgY + imgH + 0.05
        slide.addText([
          { text: 'Locución: ', options: { bold: true, fontFace: FONT, fontSize: 11, color: TXT_COLOR } },
          { text: loc, options: { italic: true, fontFace: FONT, fontSize: 11, color: TXT_COLOR } }
        ], { x: imgLeft, y: textY, w: cardW - offsetX, h: cardH - (textY - y), valign: 'top' })
      }
    } else if (panelsPerSlide === 20) {
      const cols = 5, rows = 4, gapX = 0.03, gapY = 0.03
      const cardW = (SW - M * 2 - gapX * (cols - 1)) / cols
      const cardH = (SH - M * 2 - gapY * (rows - 1)) / rows
      const titleH = 0.18, locH = 0.2
      const imgBoxW = cardW
      const imgBoxH = cardH - titleH - locH

      for (let cell = 0; cell < perPage; cell++) {
        const idx = (s - 1) * perPage + cell
        if (idx >= panels.length) break
        const col = cell % cols, row = Math.floor(cell / cols)
        const x = M + col * (cardW + gapX)
        const y = M + row * (cardH + gapY)
        const p = panels[idx], loc = locutions[idx] || '', img = base64Images[idx]

        const { w: imgW, h: imgH } = calcImageRect(imgBoxW, imgBoxH)
        const offsetX = (imgBoxW - imgW) / 2
        const imgLeft = x + offsetX
        const imgY = y + titleH + 0.04

        slide.addText(p.filename || 'Plano', {
          x: imgLeft, y, w: cardW - offsetX, h: titleH,
          fontSize: 10, fontFace: FONT, color: TXT_COLOR, bold: true
        })
        addImageToSlide(slide, img, imgLeft, imgY, imgW, imgH)

        const textY = imgY + imgH + 0.03
        // slide.addText([
        //   { text: 'A: ', options: { bold: true, fontFace: FONT, fontSize: 6, color: TXT_COLOR } },
        //   { text: loc || '-', options: { italic: true, fontFace: FONT, fontSize: 6, color: TXT_COLOR } }
        // ], { x: imgLeft, y: textY, w: cardW - offsetX, h: cardH - (textY - y), valign: 'top' })
      }
    }
  }

  // ── Generar el PPTX como ArrayBuffer y post-procesarlo ──
  const buffer = await pptx.write({ outputType: 'arraybuffer' })
  const borderedBuffer = await addBordersToPPTX(buffer)

  // Descargar
  const blob = new Blob([borderedBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${storyboardName.toLowerCase().replace(/\s+/g, '_')}_storyboard.pptx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
