import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import StoryboardTable from './components/StoryboardTable'
import CSVImporter from './components/CSVImporter'
import PresenterMode from './components/PresenterMode'
import { generateStoryboardPDF } from './utils/pdfGenerator'
import {
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Eye,
  Download,
  Upload,
  ArrowLeft,
  Save,
  Loader2,
  Database,
  AlertCircle,
  FileText,
  RefreshCw,
  PlusCircle,
  Image as ImageIcon
} from 'lucide-react'

// Comparador alfanumérico natural ("1", "1A", "2", "10") Aumento un comment solo para el push a github
const naturalCompare = (a, b) => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export default function App() {
  // Estados de navegación y carga
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [storyboards, setStoryboards] = useState([])
  const [activeStoryboard, setActiveStoryboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Datos del storyboard activo
  const [panels, setPanels] = useState([])
  const [locutions, setLocutions] = useState([])
  const [storyboardName, setStoryboardName] = useState('')

  // Estados de autenticación
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // UI States
  const [showPresenter, setShowPresenter] = useState(false)
  const [showNewStoryboardModal, setShowNewStoryboardModal] = useState(false)
  const [newStoryboardName, setNewStoryboardName] = useState('')
  const [customProjectId, setCustomProjectId] = useState('')
  const [pdfLayout, setPdfLayout] = useState(6) // 1, 4, 6, 20
  const [projectInfo, setProjectInfo] = useState(null) // { campana, color_cliente, color_campana }

  // Estado para vista pública sin autenticación (link compartido)
  const [publicView, setPublicView] = useState(null) // { storyboardName, panels, locutions, storyboards, ... }

  // Al montar: determinar si es vista pública o flujo normal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const projectIdParam = params.get('project_id')
    const modeParam = params.get('mode')

    if (projectIdParam && modeParam === 'presenter') {
      // Modo vista pública — no requiere autenticación
      loadPublicView(parseInt(projectIdParam, 10))
      return
    }

    // Flujo normal: verificar sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Cargar datos iniciales (solo si hay sesión)
  useEffect(() => {
    if (!session) return
    fetchProjects()
  }, [session])

  const loadPublicView = async (projectId) => {
    try {
      setAuthLoading(true)
      const [projRes, sbRes] = await Promise.all([
        supabase.from('proyectos').select('campana, color_cliente, color_campana').eq('id', projectId).single(),
        supabase.from('storyboards').select('*').eq('proyecto_id', projectId).order('created_at', { ascending: false })
      ])

      if (sbRes.error) throw sbRes.error
      if (!sbRes.data || sbRes.data.length === 0) {
        alert('No hay storyboards disponibles para este proyecto.')
        return
      }

      const projectData = projRes.data || {}
      const firstSb = sbRes.data[0]

      setPublicView({
        storyboardName: firstSb.name,
        panels: firstSb.panels || [],
        locutions: firstSb.locutions || [],
        storyboards: sbRes.data,
        activeStoryboardId: firstSb.id,
        projectColors: {
          color_cliente: projectData.color_cliente || '#a78bfa',
          color_campana: projectData.color_campana || '#34d399'
        }
      })
    } catch (e) {
      console.error('Error cargando vista pública:', e.message)
      alert(`Error al cargar la vista del proyecto: ${e.message}`)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!loginEmail.trim() || !loginPassword.trim()) return
    try {
      setAuthLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      })
      if (error) throw error
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setLoginError(`Error de conexión con el servidor de Supabase.
Revisa la consola del navegador (F12 → Console) para verificar la URL cargada.
Si ves "NO DEFINIDA", el archivo .env no se creó correctamente en el build de GitHub Pages.`)
      } else {
        setLoginError(err.message)
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProjects([])
    setSelectedProjectId(null)
    setStoryboards([])
    setActiveStoryboard(null)
    setPanels([])
    setLocutions([])
    setProjectInfo(null)
  }

  // Cargar storyboards cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (selectedProjectId) {
      fetchStoryboards(selectedProjectId)
      fetchProjectInfo(selectedProjectId)
    } else {
      setStoryboards([])
      setActiveStoryboard(null)
      setProjectInfo(null)
    }
  }, [selectedProjectId])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('proyectos')
        .select('id, campana, color_cliente, color_campana')
      if (error) throw error
      setProjects(data || [])
    } catch (e) {
      console.error('Error cargando proyectos:', e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStoryboards = async (projectId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .eq('proyecto_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setStoryboards(data || [])
    } catch (e) {
      console.error('Error cargando storyboards:', e.message)
      alert(`Error al cargar storyboards: ${e.message}\n\nPosible causa: RLS en Supabase. Ve a Authentication → Policies y agrega una política SELECT para la tabla "storyboards".`)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectInfo = async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('campana, color_cliente, color_campana')
        .eq('id', projectId)
        .single()
      if (error) throw error
      setProjectInfo(data)
    } catch (e) {
      console.error('Error cargando info del proyecto:', e.message)
      setProjectInfo(null)
    }
  }

  const loadProjectById = async (projectId, startInPresenter = false) => {
    try {
      setLoading(true)
      setSelectedProjectId(projectId)
      await fetchProjectInfo(projectId)
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .eq('proyecto_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setStoryboards(data || [])

      const firstSb = data?.[0]
      if (firstSb) {
        setActiveStoryboard(firstSb)
        setStoryboardName(firstSb.name)
        setPanels(firstSb.panels || [])
        setLocutions(firstSb.locutions || [])
      }

      if (startInPresenter && firstSb) {
        setShowPresenter(true)
      }
    } catch (e) {
      console.error('Error cargando proyecto directo:', e.message)
      alert('No se pudo cargar el proyecto desde el enlace.')
    } finally {
      setLoading(false)
    }
  }

  // Insertar un proyecto temporal para pruebas si la BD está vacía
  const createMockProject = async () => {
    try {
      setLoading(true)
      const mockId = Math.floor(Math.random() * 90000) + 10000
      const { error } = await supabase
        .from('proyectos')
        .insert([{ id: mockId }])
      if (error) throw error
      await fetchProjects()
      setSelectedProjectId(mockId)
    } catch (e) {
      alert(`Error insertando proyecto de prueba: ${e.message}\nVerifica que la tabla "proyectos" exista en tu Supabase.`)
    } finally {
      setLoading(false)
    }
  }

  // Ingresar proyecto personalizado manual
  const handleCustomProjectSubmit = async (e) => {
    e.preventDefault()
    const idNum = parseInt(customProjectId, 10)
    if (isNaN(idNum)) {
      alert('Ingresa un número ID válido.')
      return
    }

    // Intentar verificar si existe, si no, dar opción de crearlo
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('proyectos')
        .select('id')
        .eq('id', idNum)

      if (error) throw error

      if (data.length === 0) {
        const confirmCreate = window.confirm(`El proyecto con ID ${idNum} no existe en la tabla "proyectos". ¿Deseas crearlo ahora para poder asociar storyboards?`)
        if (confirmCreate) {
          const { error: insertErr } = await supabase
            .from('proyectos')
            .insert([{ id: idNum }])
          if (insertErr) throw insertErr
        } else {
          return
        }
      }

      await fetchProjects()
      setSelectedProjectId(idNum)
      setCustomProjectId('')
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Crear Storyboard nuevo
  const handleCreateStoryboard = async () => {
    if (!newStoryboardName.trim()) return
    try {
      setSaving(true)
      const { data, error } = await supabase
        .from('storyboards')
        .insert([
          {
            proyecto_id: selectedProjectId,
            name: newStoryboardName.trim(),
            panels: [],
            locutions: []
          }
        ])
        .select()
        .single()

      if (error) throw error

      setNewStoryboardName('')
      setShowNewStoryboardModal(false)
      fetchStoryboards(selectedProjectId)

      // Activar el editor inmediatamente
      setActiveStoryboard(data)
      setStoryboardName(data.name)
      setPanels([])
      setLocutions([])
    } catch (e) {
      alert(`Error creando storyboard: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Guardar estado actual del storyboard en base de datos
  const saveStoryboard = async (updatedPanels = panels, updatedLocs = locutions) => {
    if (!activeStoryboard) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from('storyboards')
        .update({
          name: storyboardName,
          panels: updatedPanels,
          locutions: updatedLocs
        })
        .eq('id', activeStoryboard.id)

      if (error) throw error
    } catch (e) {
      console.error('Error guardando cambios:', e.message)
      alert(`Error al guardar: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Cargar carpeta inicial de imágenes a Supabase Storage
  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0 || !activeStoryboard) return

    // Filtrar solo imágenes
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('No se encontraron imágenes válidas.')
      return
    }

    setLoading(true)
    const uploadPromises = imageFiles.map(async (file) => {
      // Subir archivo al bucket de supabase con ruta storyboard_id/nombre_archivo
      const filePath = `${activeStoryboard.id}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage
        .from('storyboards')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('storyboards')
        .getPublicUrl(filePath)

      return {
        id: Math.random().toString(36).substring(2, 9),
        filename: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        image_path: filePath,
        image_url: urlData.publicUrl,
        description: '',
        version: Date.now()
      }
    })

    try {
      const uploadedPanels = await Promise.all(uploadPromises)

      // Ordenar alfanuméricamente por el nombre de la viñeta
      const sortedPanels = [...panels, ...uploadedPanels].sort((a, b) =>
        naturalCompare(a.filename, b.filename)
      )

      // Rellenar array de locución de acuerdo al nuevo tamaño de paneles
      const newLocutions = [...locutions]
      while (newLocutions.length < sortedPanels.length) {
        newLocutions.push('')
      }

      setPanels(sortedPanels)
      setLocutions(newLocutions)

      // Guardar inmediatamente
      await saveStoryboard(sortedPanels, newLocutions)
    } catch (e) {
      alert(`Error al subir dibujos: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Reemplazar la imagen de un solo panel específico
  const handleSingleImageReplace = async (index, file) => {
    if (!activeStoryboard || !panels[index]) return
    try {
      setLoading(true)
      const currentPanel = panels[index]

      // Usar la misma ruta o generar una nueva
      const filePath = currentPanel.image_path || `${activeStoryboard.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from('storyboards')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('storyboards')
        .getPublicUrl(filePath)

      const updatedPanels = [...panels]
      updatedPanels[index] = {
        ...currentPanel,
        image_path: filePath,
        image_url: urlData.publicUrl,
        version: Date.now() // Fuerza el refresco visual esquivando la caché
      }

      setPanels(updatedPanels)
      await saveStoryboard(updatedPanels, locutions)
    } catch (e) {
      alert(`Error reemplazando dibujo: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Cargar múltiples dibujos actualizados (Zona de Revisión Rápida)
  const handleBatchRevisionUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0 || !activeStoryboard) return

    setLoading(true)
    let updateCount = 0
    const updatedPanels = [...panels]

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue

        const uploadName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name

        // Buscar coincidencia exacta de nombre de viñeta en los paneles existentes
        const matchIdx = panels.findIndex(p => p.filename.toLowerCase() === uploadName.toLowerCase())

        if (matchIdx !== -1) {
          const currentPanel = panels[matchIdx]
          const filePath = currentPanel.image_path || `${activeStoryboard.id}/${Date.now()}_${file.name}`

          await supabase.storage
            .from('storyboards')
            .upload(filePath, file, { cacheControl: '3600', upsert: true })

          const { data: urlData } = supabase.storage
            .from('storyboards')
            .getPublicUrl(filePath)

          updatedPanels[matchIdx] = {
            ...currentPanel,
            image_path: filePath,
            image_url: urlData.publicUrl,
            version: Date.now() // Invalidación de caché
          }
          updateCount++
        }
      }

      if (updateCount > 0) {
        setPanels(updatedPanels)
        await saveStoryboard(updatedPanels, locutions)
        alert(`Se actualizaron exitosamente ${updateCount} dibujos coincidentes.`);
      } else {
        alert('No se encontraron dibujos existentes cuyos nombres coincidan con los archivos subidos.')
      }
    } catch (e) {
      alert(`Error en actualización rápida: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Importar textos desde CSV
  const handleCSVImport = (csvRows) => {
    // csvRows tiene [{ filename, description, locution }] o descriptivo
    const updatedPanels = [...panels]
    const updatedLocs = [...locutions]

    csvRows.forEach((row, i) => {
      // Si la fila del CSV tiene un filename explícito, intentamos emparejar
      if (row.filename) {
        const matchIdx = panels.findIndex(p => p.filename.toLowerCase() === row.filename.toLowerCase())
        if (matchIdx !== -1) {
          if (row.description) updatedPanels[matchIdx].description = row.description
          if (row.locution) updatedLocs[matchIdx] = row.locution
        }
      } else {
        // Si no tiene filename, se mapea secuencialmente por índice
        if (i < updatedPanels.length) {
          if (row.description) updatedPanels[i].description = row.description
          if (row.locution) updatedLocs[i] = row.locution
        } else {
          // Si hay más filas en el CSV que paneles existentes, agregamos locución en ese índice
          updatedLocs[i] = row.locution || ''
        }
      }
    })

    setPanels(updatedPanels)
    setLocutions(updatedLocs)
    saveStoryboard(updatedPanels, updatedLocs)
  }

  // Callback de actualización de una sola fila en la tabla
  const handleUpdatePanel = (index, updatedPanel) => {
    const updated = [...panels]
    updated[index] = updatedPanel
    setPanels(updated)
    saveStoryboard(updated, locutions)
  }

  const handleUpdateLocution = (index, value) => {
    const updated = [...locutions]
    updated[index] = value
    setLocutions(updated)
    saveStoryboard(panels, updated)
  }

  // Inserción de viñeta en posición específica
  const handleAddPanel = (insertIndex) => {
    const newPanel = {
      id: Math.random().toString(36).substring(2, 9),
      filename: `Nueva_${panels.length + 1}`,
      image_path: '',
      image_url: '',
      description: '',
      version: Date.now()
    }

    const updatedPanels = [...panels]
    updatedPanels.splice(insertIndex, 0, newPanel)

    // Nota: Las locuciones NO se desplazan.
    // Insertamos una celda vacía o mantenemos los audios en su posición.
    // Como la locución está atada estrictamente al índice, la nueva viñeta en la posición `insertIndex`
    // adoptará automáticamente la locución que ya existía en esa posición.
    // Solo debemos asegurar que el tamaño del array de locuciones se adapte si es necesario.
    const updatedLocs = [...locutions]
    if (updatedLocs.length < updatedPanels.length) {
      updatedLocs.push('')
    }

    setPanels(updatedPanels)
    setLocutions(updatedLocs)
    saveStoryboard(updatedPanels, updatedLocs)
  }

  // Eliminación de viñeta (panel + descripción)
  const handleDeletePanel = async (index) => {
    const panelToDelete = panels[index]

    // Si tiene archivo en storage, lo eliminamos
    if (panelToDelete.image_path) {
      try {
        await supabase.storage
          .from('storyboards')
          .remove([panelToDelete.image_path])
      } catch (e) {
        console.warn('No se pudo borrar el archivo físico del storage:', e.message)
      }
    }

    const updatedPanels = panels.filter((_, i) => i !== index)

    // Las locuciones se quedan en sus índices originales.
    // Sin embargo, como ahora hay un panel menos, quitamos el último elemento sobrante 
    // del final de la locución para mantener la coherencia.
    const updatedLocs = [...locutions]
    if (updatedLocs.length > updatedPanels.length) {
      updatedLocs.pop()
    }

    setPanels(updatedPanels)
    setLocutions(updatedLocs)
    saveStoryboard(updatedPanels, updatedLocs)
  }

  // Reordenación de viñeta
  const handleMovePanel = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= panels.length) return

    const updatedPanels = [...panels]
    const [movedPanel] = updatedPanels.splice(fromIndex, 1)
    updatedPanels.splice(toIndex, 0, movedPanel)

    // Las locuciones permanecen exactamente iguales en sus índices (no se mueven)
    setPanels(updatedPanels)
    saveStoryboard(updatedPanels, locutions)
  }

  // Eliminación completa y definitiva del storyboard (Efímero)
  const handleDeleteEntireStoryboard = async () => {
    if (!activeStoryboard) return
    const confirmDelete = window.confirm(
      '¿Estás seguro de que deseas eliminar permanentemente este storyboard y TODOS sus dibujos asociados?\nEsta acción no se puede deshacer.'
    )
    if (!confirmDelete) return

    try {
      setLoading(true)

      // 1. Borrar todas las imágenes de Storage
      const { data: files, error: listError } = await supabase.storage
        .from('storyboards')
        .list(String(activeStoryboard.id))

      if (!listError && files && files.length > 0) {
        const pathsToDelete = files.map(file => `${activeStoryboard.id}/${file.name}`)
        const { error: removeErr } = await supabase.storage
          .from('storyboards')
          .remove(pathsToDelete)
        if (removeErr) console.warn('Error borrando archivos de Storage:', removeErr.message)
      }

      // 2. Eliminar fila en base de datos
      const { error: dbErr } = await supabase
        .from('storyboards')
        .delete()
        .eq('id', activeStoryboard.id)

      if (dbErr) throw dbErr

      alert('Storyboard eliminado con éxito.')
      setActiveStoryboard(null)
      fetchStoryboards(selectedProjectId)
    } catch (e) {
      alert(`Error al eliminar: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Generar PDF usando jsPDF
  const handleExportPDF = async () => {
    if (!activeStoryboard) return
    try {
      setSaving(true)
      await generateStoryboardPDF(storyboardName, panels, locutions, pdfLayout)
    } catch (e) {
      alert(`Error generando PDF: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Copiar enlace de presentación al portapapeles
  const handleShareLink = () => {
    if (!selectedProjectId) return
    const shareUrl = `${window.location.origin}${window.location.pathname}?project_id=${selectedProjectId}&mode=presenter`
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert('¡Enlace de presentación copiado al portapapeles! Envíalo al cliente o director.'))
      .catch(() => alert('No se pudo copiar el enlace automáticamente.'))
  }

  // Si está activo el modo presentación (pantalla completa de solo lectura)
  if (showPresenter && activeStoryboard) {
    return (
      <PresenterMode
        storyboardName={storyboardName}
        panels={panels}
        locutions={locutions}
        storyboards={storyboards}
        activeStoryboardId={activeStoryboard?.id}
        projectColors={{
          color_cliente: projectInfo?.color_cliente || '#a78bfa',
          color_campana: projectInfo?.color_campana || '#34d399'
        }}
        isAuthenticated={!!session}
        onSwitchStoryboard={(sb) => {
          setActiveStoryboard(sb)
          setStoryboardName(sb.name)
          setPanels(sb.panels || [])
          setLocutions(sb.locutions || [])
        }}
        onClose={() => setShowPresenter(false)}
      />
    )
  }

  // Vista pública (link compartido) — sin autenticación
  if (publicView) {
    return (
      <PresenterMode
        storyboardName={publicView.storyboardName}
        panels={publicView.panels}
        locutions={publicView.locutions}
        storyboards={publicView.storyboards}
        activeStoryboardId={publicView.activeStoryboardId}
        projectColors={publicView.projectColors}
        isAuthenticated={false}
        onSwitchStoryboard={(sb) => {
          setPublicView({
            ...publicView,
            storyboardName: sb.name,
            panels: sb.panels || [],
            locutions: sb.locutions || [],
            activeStoryboardId: sb.id
          })
        }}
        onClose={() => {}}
      />
    )
  }

  // Pantalla de carga de autenticación
  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 className="animate-spin text-purple-500" size={24} />
        <span>Verificando sesión...</span>
      </div>
    )
  }

  // Pantalla de inicio de sesión
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-purple-900/40 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-800/50">
            <ImageIcon size={32} />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Storyboard Studio</h2>
          <p className="text-slate-400 text-sm mb-6">
            Inicia sesión con tu correo autorizado.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-purple-500"
              autoFocus
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-purple-500"
              required
            />
            {loginError && (
              <p className="text-xs text-rose-400 text-left">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading || !loginEmail.trim() || !loginPassword.trim()}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-semibold shadow transition cursor-pointer"
            >
              {authLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full text-slate-100">

      {/* HEADER PRINCIPAL */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 m-0 tracking-tight flex items-center gap-2">
            <ImageIcon className="text-purple-400" />
            Storyboard Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1">Organización y sincronización inteligente de guiones gráficos efímeros.</p>
        </div>

        {/* Info de Sesión y Estado de Conexión */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-800">
            <Database size={14} className="text-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">Supabase Conectado</span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-800">
            <span className="text-slate-400">{session.user.email}</span>
            <button
              onClick={handleLogout}
              className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* SECCIÓN 1: SELECCIÓN DE PROYECTO */}
      {!selectedProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <div className="bg-slate-850 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-purple-900/40 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-800/50">
              <Folder size={32} />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Selecciona un Proyecto</h2>
            <p className="text-slate-400 text-sm mb-6">Elige el proyecto existente para el cual deseas crear o gestionar los storyboards.</p>

            {projects.length > 0 ? (
              <div className="flex flex-col gap-3">
                <select
                  onChange={(e) => setSelectedProjectId(parseInt(e.target.value, 10))}
                  defaultValue=""
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="" disabled>-- Selecciona un ID de Proyecto --</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.campana || `Proyecto #${proj.id}`}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-slate-500 font-medium py-1">O ingresa un ID personalizado abajo</div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-2.5 text-left text-xs text-amber-300">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  No se encontraron proyectos en la base de datos. Puedes insertar uno de prueba usando el botón inferior o escribir un ID numérico.
                </div>
              </div>
            )}

            {/* Input Manual de ID de Proyecto */}
            <form onSubmit={handleCustomProjectSubmit} className="mt-4 flex gap-2">
              <input
                type="number"
                placeholder="ID de Proyecto (int8)"
                value={customProjectId}
                onChange={(e) => setCustomProjectId(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 active:bg-slate-900 text-slate-200 border border-slate-700 rounded-lg text-sm font-semibold transition cursor-pointer"
              >
                Cargar
              </button>
            </form>

            <button
              onClick={createMockProject}
              className="w-full mt-6 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow transition cursor-pointer"
            >
              Crear Proyecto Demo Rápido
            </button>
          </div>
        </div>
      ) : (
        /* VISTA DENTRO DE UN PROYECTO */
        <div className="flex-1 flex flex-col">

          {/* BOTÓN VOLVER Y SELECTOR DE STORYBOARDS */}
          {!activeStoryboard ? (
            <div className="flex-1 flex flex-col">
              <div className="mb-6 flex items-center justify-between">
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm font-semibold transition cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  Cambiar de Proyecto
                </button>

                <button
                  onClick={() => setShowNewStoryboardModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-sm font-semibold rounded-lg shadow-md transition cursor-pointer"
                >
                  <Plus size={16} />
                  Nuevo Storyboard
                </button>
              </div>

              {/* LISTADO DE STORYBOARDS */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <FolderOpen className="text-purple-400" size={20} />
                  <h2 className="text-lg font-bold text-white">Storyboards en el Proyecto #{selectedProjectId}</h2>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                    <Loader2 className="animate-spin text-purple-500" />
                    Cargando storyboards...
                  </div>
                ) : storyboards.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-400 text-sm">Este proyecto no tiene storyboards aún.</p>
                    <button
                      onClick={() => setShowNewStoryboardModal(true)}
                      className="mt-3 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
                    >
                      Crea el primero aquí
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {storyboards.map((sb) => (
                      <div
                        key={sb.id}
                        onClick={() => {
                          setActiveStoryboard(sb)
                          setStoryboardName(sb.name)
                          setPanels(sb.panels || [])
                          setLocutions(sb.locutions || [])
                        }}
                        className="p-5 bg-slate-850 hover:bg-slate-800 border border-slate-775 hover:border-purple-500/50 rounded-xl cursor-pointer transition shadow-md group flex flex-col justify-between h-32"
                      >
                        <div>
                          <h3 className="font-bold text-white group-hover:text-purple-300 transition truncate">{sb.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono mt-1 block">ID: #{sb.id}</span>
                        </div>
                        <div className="text-xs text-slate-400 flex justify-between items-center">
                          <span>{sb.panels?.length || 0} viñetas</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(sb.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EDITOR ACTIVO DEL STORYBOARD SELECCIONADO */
            <div className="flex-1 flex flex-col">

              {/* ACCIONES Y MENÚ DE NAVEGACIÓN EDITOR */}
              <div className="mb-6 flex flex-wrap justify-between items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setActiveStoryboard(null)
                      fetchStoryboards(selectedProjectId)
                    }}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    title="Volver a la lista de storyboards"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <input
                      type="text"
                      value={storyboardName}
                      onChange={(e) => setStoryboardName(e.target.value)}
                      onBlur={() => saveStoryboard()}
                      placeholder="Nombre del Storyboard"
                      className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-purple-500 text-lg font-bold text-white px-1 outline-none transition w-64 md:w-80"
                    />
                    <div className="text-[10px] font-mono text-slate-500 px-1 mt-0.5">Asociado a Proyecto #{selectedProjectId}</div>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2.5">
                  {/* Guardar cambios manualmente */}
                  <button
                    onClick={() => saveStoryboard()}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:bg-slate-900 border border-slate-700 text-xs font-semibold rounded-lg text-slate-200 cursor-pointer transition"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>

                  {/* Vista de rodaje */}
                  <button
                    onClick={() => setShowPresenter(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-550 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
                  >
                    <Eye size={12} />
                    Vista Rodaje
                  </button>

                  <button
                    onClick={handleShareLink}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                  >
                    Compartir Link
                  </button>

                  {/* Exportación PDF */}
                  <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                    <select
                      value={pdfLayout}
                      onChange={(e) => setPdfLayout(parseInt(e.target.value, 10))}
                      className="bg-transparent text-slate-300 text-xs px-2.5 py-1 outline-none cursor-pointer"
                    >
                      <option value="1">1 x pág</option>
                      <option value="4">4 x pág</option>
                      <option value="6">6 x pág</option>
                      <option value="20">20 x pág</option>
                    </select>
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow transition cursor-pointer"
                    >
                      <Download size={12} />
                      Exportar PDF
                    </button>
                  </div>

                  {/* Limpieza Epímera */}
                  <button
                    onClick={handleDeleteEntireStoryboard}
                    className="flex items-center gap-1 px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-300 text-xs font-semibold rounded-lg border border-rose-900/30 transition cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Borrar Storyboard
                  </button>
                </div>
              </div>

              {/* SECCIÓN CARGAR IMÁGENES / CARPETA (Si está vacío) */}
              {panels.length === 0 && (
                <div className="mb-6 grid md:grid-cols-2 gap-6">
                  {/* Carga Inicial de Carpeta de Dibujos */}
                  <div className="bg-slate-900 border-2 border-dashed border-slate-750 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition">
                    <div className="w-12 h-12 rounded-full bg-purple-900/30 text-purple-400 flex items-center justify-center mb-3">
                      <Upload size={24} />
                    </div>
                    <h3 className="font-bold text-white mb-1">Cargar Carpeta de Dibujos</h3>
                    <p className="text-xs text-slate-400 max-w-xs mb-4">
                      Sube las imágenes numeradas cronológicamente (1.jpg, 2.jpg, 1A.jpg). El sistema las ordenará alfanuméricamente de manera automática.
                    </p>
                    <label className="px-4 py-2 bg-purple-600 hover:bg-purple-550 active:bg-purple-700 text-white text-xs font-semibold rounded shadow transition cursor-pointer">
                      Seleccionar Imágenes
                      <input
                        type="file"
                        multiple
                        webkitdirectory="true"
                        directory="true"
                        onChange={handleFolderUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Importar CSV de Textos */}
                  <div className="bg-slate-900 border-2 border-dashed border-slate-750 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-emerald-500/50 transition">
                    <div className="w-12 h-12 rounded-full bg-emerald-900/30 text-emerald-400 flex items-center justify-center mb-3">
                      <FileText size={24} />
                    </div>
                    <h3 className="font-bold text-white mb-1">Cargar Guión (CSV)</h3>
                    <p className="text-xs text-slate-400 max-w-xs mb-4">
                      Importa un archivo CSV con las columnas de descripción y audio/locución para rellenar la tabla rápidamente.
                    </p>
                    <CSVImporter onImport={handleCSVImport} />
                  </div>
                </div>
              )}

              {/* SECCIÓN MÓDULOS DE EDICIÓN ACTIVA */}
              {panels.length > 0 && (
                <div className="flex flex-col gap-6">

                  {/* BARRA DE HERRAMIENTAS ADICIONAL */}
                  <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 text-sm">
                    <div className="flex flex-wrap gap-4 items-center">
                      {/* Zona de Drop para Revisión de Dibujos Modificados */}
                      <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                        <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                          <RefreshCw size={12} className="text-purple-400" />
                          <span>Actualizar Dibujos (Revisión):</span>
                        </div>
                        <label className="text-[10px] px-2.5 py-1 bg-purple-900/40 hover:bg-purple-900 border border-purple-800 text-purple-300 font-bold rounded cursor-pointer transition">
                          Subir Cambiados
                          <input
                            type="file"
                            multiple
                            onChange={handleBatchRevisionUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Insertar viñeta en posición específica (Header) */}
                      <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                        <select
                          id="header-insert-position"
                          defaultValue={panels.length}
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
                            const select = document.getElementById('header-insert-position')
                            const insertIdx = parseInt(select?.value || panels.length.toString(), 10)
                            handleAddPanel(insertIdx)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-semibold rounded shadow transition cursor-pointer"
                        >
                          <PlusCircle size={14} />
                          Añadir aquí
                        </button>
                      </div>
                      <CSVImporter onImport={handleCSVImport} />
                    </div>
                  </div>

                  {/* TABLA PRINCIPAL DE EDICIÓN */}
                  {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                      <Loader2 className="animate-spin text-purple-500" />
                      Cargando contenidos...
                    </div>
                  ) : (
                    <StoryboardTable
                      panels={panels}
                      locutions={locutions}
                      onUpdatePanel={handleUpdatePanel}
                      onUpdateLocution={handleUpdateLocution}
                      onDeletePanel={handleDeletePanel}
                      onMovePanel={handleMovePanel}
                      onAddPanel={handleAddPanel}
                      onSingleImageReplace={handleSingleImageReplace}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CREACIÓN DE STORYBOARD */}
      {showNewStoryboardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Crear Nuevo Storyboard</h3>
            <p className="text-xs text-slate-400 mb-4">Ingresa el nombre de la pieza audiovisual (ej. "Spot Principal 30s").</p>

            <input
              type="text"
              placeholder="Nombre del Storyboard"
              value={newStoryboardName}
              onChange={(e) => setNewStoryboardName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm outline-none focus:border-purple-500 mb-4"
              autoFocus
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewStoryboardModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateStoryboard}
                disabled={saving || !newStoryboardName.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-550 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
