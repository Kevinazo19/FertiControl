import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View,
} from "react-native";

const HTTP_URL = Constants.expoConfig.extra.HTTP_URL;
const AUTH_TOKEN = Constants.expoConfig.extra.AUTH_TOKEN;

async function ejecutarPipeline(solicitudes) {
  const carga = { baton: null, requests: solicitudes }
  console.log("📤 Payload Turso:", JSON.stringify(carga, null, 2))
  const respuesta = await fetch(`${HTTP_URL}/v2/pipeline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify(carga),
  })
  const texto = await respuesta.text()
  if (!respuesta.ok) {
    console.error("🔴 Error HTTP Turso:", texto)
    throw new Error(texto || `HTTP ${respuesta.status}`)
  }
  try {
    const json = JSON.parse(texto)
    console.log("📥 Respuesta Turso:", JSON.stringify(json, null, 2))
    return json
  } catch (e) {
    console.error("🔴 No se pudo parsear JSON Turso:", texto)
    throw e
  }
}

// Crear tabla de respuestas si no existe
async function crearTablaRespuestas() {
  try {
    const solicitudes = [
      {
        type: "execute",
        stmt: {
          sql: `CREATE TABLE IF NOT EXISTS respuestas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contenido TEXT NOT NULL,
            fecha_creacion TEXT NOT NULL,
            id_usuario INTEGER NOT NULL,
            id_comentario INTEGER NOT NULL,
            FOREIGN KEY (id_usuario) REFERENCES Registros(id),
            FOREIGN KEY (id_comentario) REFERENCES comentarios(id) ON DELETE CASCADE
          )`,
        },
      },
      { type: "close" },
    ]
    await ejecutarPipeline(solicitudes)
    console.log("✅ Tabla de respuestas creada o verificada")
  } catch (error) {
    console.error("Error al crear tabla de respuestas:", error)
  }
}

const PantallaComunidad = ({ navigation, route, navegarAMain, navegarACalendario, navegarAPerfil }) => {
  const [activeTab, setActiveTab] = useState("community")
  const [publicaciones, setPublicaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevaPublicacion, setNuevaPublicacion] = useState({
    titulo: "",
    descripcion: "",
  })
  const [comentarioActivo, setComentarioActivo] = useState(null)
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [enviandoPublicacion, setEnviandoPublicacion] = useState(false)
  const [enviandoComentario, setEnviandoComentario] = useState(false)
  const [enviandoReaccion, setEnviandoReaccion] = useState(false)

  // Estados para menús de opciones
  const [menuPublicacionVisible, setMenuPublicacionVisible] = useState(false)
  const [publicacionSeleccionada, setPublicacionSeleccionada] = useState(null)
  const [menuComentarioVisible, setMenuComentarioVisible] = useState(false)
  const [comentarioSeleccionado, setComentarioSeleccionado] = useState(null)

  // Estados para edición
  const [modoEdicion, setModoEdicion] = useState(false)
  const [publicacionEditando, setPublicacionEditando] = useState(null)
  const [comentarioEditando, setComentarioEditando] = useState(null)
  const [textoEditando, setTextoEditando] = useState("")

  // Estados para respuestas
  const [respuestaActiva, setRespuestaActiva] = useState(null)
  const [nuevaRespuesta, setNuevaRespuesta] = useState("")
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false)
  const [respuestaEditando, setRespuestaEditando] = useState(null)
  const [textoRespuestaEditando, setTextoRespuestaEditando] = useState("")
  const [menuRespuestaVisible, setMenuRespuestaVisible] = useState(false)
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null)

  // Obtener el usuario actual desde route.params o AsyncStorage
  const [usuarioActual, setUsuarioActual] = useState(null)

  // Cargar el usuario actual
  useEffect(() => {
    const obtenerUsuarioActual = async () => {
      try {
        // Primero intentamos obtener el usuario de route.params
        if (route?.params?.usuario) {
          console.log("Usuario obtenido de route.params:", route.params.usuario)
          setUsuarioActual(route.params.usuario)
          return
        }

        // Si no está en route.params, intentamos obtenerlo de AsyncStorage
        const AsyncStorage = require("@react-native-async-storage/async-storage").default
        const usuarioGuardado = await AsyncStorage.getItem("usuario")

        if (usuarioGuardado) {
          const usuario = JSON.parse(usuarioGuardado)
          console.log("Usuario obtenido de AsyncStorage:", usuario)
          setUsuarioActual(usuario)
        } else {
          // Si no hay usuario, usamos uno por defecto
          console.warn("No se encontró usuario, usando valores por defecto")
          setUsuarioActual({
            id: 1,
            nombre: "Usuario",
            apellido: "Anónimo",
          })
        }
      } catch (error) {
        console.error("Error al obtener usuario:", error)
        setUsuarioActual({
          id: 1,
          nombre: "Usuario",
          apellido: "Anónimo",
        })
      }
    }

    obtenerUsuarioActual()
  }, [route?.params?.usuario])

  // Crear tabla de respuestas al montar el componente
  useEffect(() => {
    crearTablaRespuestas()
  }, [])

  // Cargar publicaciones al montar el componente o cuando cambia el usuario
  useEffect(() => {
    if (usuarioActual) {
      cargarPublicaciones()
    }
  }, [usuarioActual])

  // Función para cargar todas las publicaciones
  const cargarPublicaciones = async () => {
    if (!usuarioActual) return

    try {
      setCargando(true)
      console.log("Cargando publicaciones para usuario:", usuarioActual.id)

      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT p.id, p.titulo, p.descripcion, p.fecha_creacion, 
                p.id_usuario, r.Nombre, r.Apellido,
                (SELECT COUNT(*) FROM reacciones WHERE id_publicacion = p.id) as total_likes,
                (SELECT COUNT(*) FROM comentarios WHERE id_publicacion = p.id) as total_comentarios
                FROM comunidad p
                LEFT JOIN Registros r ON p.id_usuario = r.id
                ORDER BY p.fecha_creacion DESC`,
          },
        },
        { type: "close" },
      ]

      const respuesta = await ejecutarPipeline(solicitudes)

      // Extraer las filas correctamente de la estructura anidada
      const filas = respuesta.results[0].response.result.rows || []

      console.log("Publicaciones recibidas:", filas.length)

      // Si no hay filas, simplemente establecemos un array vacío y terminamos
      if (filas.length === 0) {
        setPublicaciones([])
        setCargando(false)
        setRefrescando(false)
        return
      }

      // Procesar las filas que están en formato de array de arrays
      const publicacionesProcesadas = filas.map((fila) => {
        return {
          id: fila[0].value,
          titulo: fila[1].value,
          descripcion: fila[2].value,
          fecha_creacion: fila[3].value,
          id_usuario: fila[4].value,
          Nombre: fila[5]?.value || "Usuario",
          Apellido: fila[6]?.value || "Desconocido",
          total_likes: Number.parseInt(fila[7]?.value || "0"),
          total_comentarios: Number.parseInt(fila[8]?.value || "0"),
        }
      })

      console.log("Publicaciones procesadas:", publicacionesProcesadas.length)

      const publicacionesConComentarios = await Promise.all(
        publicacionesProcesadas.map(async (publicacion) => {
          const comentarios = await cargarComentariosPublicacion(publicacion.id)
          const reaccionUsuario = await verificarReaccionUsuario(publicacion.id, usuarioActual.id)
          return {
            ...publicacion,
            comentarios,
            usuario_ha_reaccionado: reaccionUsuario,
            es_propietario: String(publicacion.id_usuario) === String(usuarioActual.id), // Verificar si el usuario actual es el propietario
          }
        }),
      )

      setPublicaciones(publicacionesConComentarios)
    } catch (error) {
      console.error("Error al cargar publicaciones:", error)
      Alert.alert("Error", "No se pudieron cargar las publicaciones. Intenta nuevamente.")
    } finally {
      setCargando(false)
      setRefrescando(false)
    }
  }

  // Función para cargar comentarios de una publicación
  const cargarComentariosPublicacion = async (idPublicacion) => {
    try {
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT c.id, c.contenido, c.fecha_creacion, 
                c.id_usuario, r.Nombre, r.Apellido
                FROM comentarios c
                LEFT JOIN Registros r ON c.id_usuario = r.id
                WHERE c.id_publicacion = ?
                ORDER BY c.fecha_creacion ASC`,
            args: [{ type: "text", value: String(idPublicacion) }],
          },
        },
        { type: "close" },
      ]

      const respuesta = await ejecutarPipeline(solicitudes)
      const filas = respuesta.results[0].response.result.rows || []

      // Procesar las filas que están en formato de array de arrays
      const comentarios = await Promise.all(
        filas.map(async (fila) => {
          const comentario = {
            id: fila[0].value,
            contenido: fila[1].value,
            fecha_creacion: fila[2].value,
            id_usuario: fila[3].value,
            Nombre: fila[4]?.value || "Usuario",
            Apellido: fila[5]?.value || "Desconocido",
            es_propietario: String(fila[3].value) === String(usuarioActual.id), // Verificar si el usuario actual es el propietario
          }

          // Cargar respuestas para este comentario
          comentario.respuestas = await cargarRespuestasComentario(comentario.id)
          return comentario
        }),
      )

      return comentarios
    } catch (error) {
      console.error(`Error al cargar comentarios para publicación ${idPublicacion}:`, error)
      return []
    }
  }

  // Función para cargar respuestas de un comentario
  const cargarRespuestasComentario = async (idComentario) => {
    try {
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT r.id, r.contenido, r.fecha_creacion, 
                r.id_usuario, u.Nombre, u.Apellido
                FROM respuestas r
                LEFT JOIN Registros u ON r.id_usuario = u.id
                WHERE r.id_comentario = ?
                ORDER BY r.fecha_creacion ASC`,
            args: [{ type: "text", value: String(idComentario) }],
          },
        },
        { type: "close" },
      ]

      const respuesta = await ejecutarPipeline(solicitudes)
      const filas = respuesta.results[0].response.result.rows || []

      // Procesar las filas que están en formato de array de arrays
      return filas.map((fila) => ({
        id: fila[0].value,
        contenido: fila[1].value,
        fecha_creacion: fila[2].value,
        id_usuario: fila[3].value,
        Nombre: fila[4]?.value || "Usuario",
        Apellido: fila[5]?.value || "Desconocido",
        es_propietario: String(fila[3].value) === String(usuarioActual.id), // Verificar si el usuario actual es el propietario
      }))
    } catch (error) {
      console.error(`Error al cargar respuestas para comentario ${idComentario}:`, error)
      return []
    }
  }

  // Verificar si el usuario actual ha reaccionado a una publicación
  const verificarReaccionUsuario = async (idPublicacion, idUsuario) => {
    try {
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT id FROM reacciones 
                WHERE id_publicacion = ? AND id_usuario = ?
                LIMIT 1`,
            args: [
              { type: "text", value: String(idPublicacion) },
              { type: "text", value: String(idUsuario) },
            ],
          },
        },
        { type: "close" },
      ]

      const respuesta = await ejecutarPipeline(solicitudes)
      const filas = respuesta.results[0].response.result.rows || []
      return filas.length > 0
    } catch (error) {
      console.error(`Error al verificar reacción para publicación ${idPublicacion}:`, error)
      return false
    }
  }

  // Función para crear una nueva publicación
  const crearPublicacion = async () => {
    if (!nuevaPublicacion.titulo.trim() || !nuevaPublicacion.descripcion.trim()) {
      Alert.alert("Campos incompletos", "Por favor completa todos los campos para publicar.")
      return
    }

    try {
      setEnviandoPublicacion(true)
      const fechaActual = new Date().toISOString()

      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `INSERT INTO comunidad (titulo, descripcion, fecha_creacion, id_usuario) 
                VALUES (?, ?, ?, ?)`,
            args: [
              { type: "text", value: nuevaPublicacion.titulo.trim() },
              { type: "text", value: nuevaPublicacion.descripcion.trim() },
              { type: "text", value: fechaActual },
              { type: "text", value: String(usuarioActual.id) },
            ],
          },
        },
        { type: "close" },
      ]

      await ejecutarPipeline(solicitudes)

      // Limpiar formulario y recargar publicaciones
      setNuevaPublicacion({ titulo: "", descripcion: "" })
      setMostrarFormulario(false)
      await cargarPublicaciones()

      Alert.alert("¡Publicación exitosa!", "Tu publicación ha sido compartida con la comunidad.")
    } catch (error) {
      console.error("Error al crear publicación:", error)
      Alert.alert("Error", "No se pudo crear la publicación. Intenta nuevamente.")
    } finally {
      setEnviandoPublicacion(false)
    }
  }

  // Función para editar una publicación existente
  const editarPublicacion = async () => {
    if (!publicacionEditando) return

    if (!nuevaPublicacion.titulo.trim() || !nuevaPublicacion.descripcion.trim()) {
      Alert.alert("Campos incompletos", "Por favor completa todos los campos para actualizar.")
      return
    }

    try {
      setEnviandoPublicacion(true)

      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `UPDATE comunidad 
                SET titulo = ?, descripcion = ? 
                WHERE id = ? AND id_usuario = ?`,
            args: [
              { type: "text", value: nuevaPublicacion.titulo.trim() },
              { type: "text", value: nuevaPublicacion.descripcion.trim() },
              { type: "text", value: String(publicacionEditando.id) },
              { type: "text", value: String(usuarioActual.id) },
            ],
          },
        },
        { type: "close" },
      ]

      await ejecutarPipeline(solicitudes)

      // Limpiar formulario y recargar publicaciones
      setNuevaPublicacion({ titulo: "", descripcion: "" })
      setMostrarFormulario(false)
      setModoEdicion(false)
      setPublicacionEditando(null)
      await cargarPublicaciones()

      Alert.alert("¡Actualización exitosa!", "Tu publicación ha sido actualizada.")
    } catch (error) {
      console.error("Error al editar publicación:", error)
      Alert.alert("Error", "No se pudo actualizar la publicación. Intenta nuevamente.")
    } finally {
      setEnviandoPublicacion(false)
    }
  }

  // Función para eliminar una publicación
  const eliminarPublicacion = async (idPublicacion) => {
    try {
      // Primero eliminar todas las reacciones asociadas
      const solicitudesReacciones = [
        {
          type: "execute",
          stmt: {
            sql: `DELETE FROM reacciones WHERE id_publicacion = ?`,
            args: [{ type: "text", value: String(idPublicacion) }],
          },
        },
        { type: "close" },
      ]
      await ejecutarPipeline(solicitudesReacciones)

      // Eliminar todas las respuestas asociadas a los comentarios de esta publicación
      const solicitudesRespuestas = [
        {
          type: "execute",
          stmt: {
            sql: `DELETE FROM respuestas 
                  WHERE id_comentario IN (
                    SELECT id FROM comentarios WHERE id_publicacion = ?
                  )`,
            args: [{ type: "text", value: String(idPublicacion) }],
          },
        },
        { type: "close" },
      ]
      await ejecutarPipeline(solicitudesRespuestas)

      // Luego eliminar todos los comentarios asociados
      const solicitudesComentarios = [
        {
          type: "execute",
          stmt: {
            sql: `DELETE FROM comentarios WHERE id_publicacion = ?`,
            args: [{ type: "text", value: String(idPublicacion) }],
          },
        },
        { type: "close" },
      ]
      await ejecutarPipeline(solicitudesComentarios)

      // Finalmente eliminar la publicación
      const solicitudesPublicacion = [
        {
          type: "execute",
          stmt: {
            sql: `DELETE FROM comunidad WHERE id = ? AND id_usuario = ?`,
            args: [
              { type: "text", value: String(idPublicacion) },
              { type: "text", value: String(usuarioActual.id) },
            ],
          },
        },
        { type: "close" },
      ]
      await ejecutarPipeline(solicitudesPublicacion)

      // Recargar publicaciones
      await cargarPublicaciones()
      Alert.alert("Publicación eliminada", "La publicación ha sido eliminada correctamente.")
    } catch (error) {
      console.error("Error al eliminar publicación:", error)
      Alert.alert("Error", "No se pudo eliminar la publicación. Intenta nuevamente.")
    }
  }

  // Función para reaccionar a una publicación
  const toggleReaccion = async (idPublicacion, yaHaReaccionado) => {
    try {
      setEnviandoReaccion(true)

      if (yaHaReaccionado) {
        // Eliminar reacción existente
        const solicitudes = [
          {
            type: "execute",
            stmt: {
              sql: `DELETE FROM reacciones 
                  WHERE id_publicacion = ? AND id_usuario = ?`,
              args: [
                { type: "text", value: String(idPublicacion) },
                { type: "text", value: String(usuarioActual.id) },
              ],
            },
          },
          { type: "close" },
        ]

        await ejecutarPipeline(solicitudes)
      } else {
        // Crear nueva reacción
        const fechaActual = new Date().toISOString()

        const solicitudes = [
          {
            type: "execute",
            stmt: {
              sql: `INSERT INTO reacciones (id_publicacion, id_usuario, fecha_creacion) 
                  VALUES (?, ?, ?)`,
              args: [
                { type: "text", value: String(idPublicacion) },
                { type: "text", value: String(usuarioActual.id) },
                { type: "text", value: fechaActual },
              ],
            },
          },
          { type: "close" },
        ]

        await ejecutarPipeline(solicitudes)
      }

      // Actualizar publicaciones
      await cargarPublicaciones()
    } catch (error) {
      console.error("Error al procesar reacción:", error)
      Alert.alert("Error", "No se pudo procesar tu reacción. Intenta nuevamente.")
    } finally {
      setEnviandoReaccion(false)
    }
  }

  // Función para añadir un comentario
  const agregarComentario = async (idPublicacion) => {
    if (!nuevoComentario.trim()) {
      Alert.alert("Campo vacío", "Por favor escribe un comentario antes de enviarlo.")
      return
    }

    try {
      setEnviandoComentario(true)
      const fechaActual = new Date().toISOString()

      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `INSERT INTO comentarios (contenido, fecha_creacion, id_usuario, id_publicacion) 
                VALUES (?, ?, ?, ?)`,
            args: [
              { type: "text", value: nuevoComentario.trim() },
              { type: "text", value: fechaActual },
              { type: "text", value: String(usuarioActual.id) },
              { type: "text", value: String(idPublicacion) },
            ],
          },
        },
        { type: "close" },
      ]

      await ejecutarPipeline(solicitudes)

      // Limpiar comentario y recargar publicaciones
      setNuevoComentario("")
      setComentarioActivo(null)
      await cargarPublicaciones()
    } catch (error) {
      console.error("Error al agregar comentario:", error)
      Alert.alert("Error", "No se pudo agregar el comentario. Intenta nuevamente.")
    } finally {
      setEnviandoComentario(false)
    }
  }

  // Función para añadir una respuesta a un comentario
  const agregarRespuesta = async (idComentario) => {
    if (!nuevaRespuesta.trim()) {
      Alert.alert("Campo vacío", "Por favor escribe una respuesta antes de enviarla.")
      return
    }

    try {
      setEnviandoRespuesta(true)
      const fechaActual = new Date().toISOString()

      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `INSERT INTO respuestas (contenido, fecha_creacion, id_usuario, id_comentario) 
                VALUES (?, ?, ?, ?)`,
            args: [
              { type: "text", value: nuevaRespuesta.trim() },
              { type: "text", value: fechaActual },
              { type: "text", value: String(usuarioActual.id) },
              { type: "text", value: String(idComentario) },
            ],
          },
        },
        { type: "close" },
      ]

      await ejecutarPipeline(solicitudes)

      // Limpiar respuesta y recargar publicaciones
      setNuevaRespuesta("")
      setRespuestaActiva(null)
      await cargarPublicaciones()
    } catch (error) {
      console.error("Error al agregar respuesta:", error)
      Alert.alert("Error", "No se pudo agregar la respuesta. Intenta nuevamente.")
    } finally {
      setEnviandoRespuesta(false)
    }
  }

  // Función para editar un comentario
  const editarComentario = async () => {
    if (!comentarioEditando || !textoEditando.trim()) {
      Alert.alert("Campo vacío", "Por favor escribe un comentario antes de actualizarlo.")
      return
    }

    try {
      setEnviandoComentario(true)

      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `UPDATE comentarios 
                SET contenido = ? 
                WHERE id = ? AND id_usuario = ?`,
            args: [
              { type: "text", value: textoEditando.trim() },
              { type: "text", value: String(comentarioEditando.id) },
              { type: "text", value: String(usuarioActual.id) },
            ],
          },
        },
        { type: "close" },
      ]

      await ejecutarPipeline(solicitudes)

      // Limpiar y recargar
      setTextoEditando("")
      setComentarioEditando(null)
      setMenuComentarioVisible(false)
      await cargarPublicaciones()
    } catch (error) {
      console.error("Error al editar comentario:", error)
      Alert.alert("Error", "No se pudo actualizar el comentario. Intenta nuevamente.")
    } finally {
      setEnviandoComentario(false)
    }
  }

  // Función para editar una respuesta
  const editarRespuesta = async () => {
    if (!respuestaEditando || !textoRespuestaEditando.trim()) {
      Alert.alert("Campo vacío", "Por favor escribe una respuesta antes de actualizarla.")
      return
    }

    try {
      setEnviandoRespuesta(true)

      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `UPDATE respuestas 
                SET contenido = ? 
                WHERE id = ? AND id_usuario = ?`,
            args: [
              { type: "text", value: textoRespuestaEditando.trim() },
              { type: "text", value: String(respuestaEditando.id) },
              { type: "text", value: String(usuarioActual.id) },
            ],
          },
        },
        { type: "close" },
      ]

      await ejecutarPipeline(solicitudes)

      // Limpiar y recargar
      setTextoRespuestaEditando("")
      setRespuestaEditando(null)
      setMenuRespuestaVisible(false)
      await cargarPublicaciones()
    } catch (error) {
      console.error("Error al editar respuesta:", error)
      Alert.alert("Error", "No se pudo actualizar la respuesta. Intenta nuevamente.")
    } finally {
      setEnviandoRespuesta(false)
    }
  }

  // Función para eliminar un comentario
  const eliminarComentario = async (idComentario) => {
    try {
      // Primero eliminar todas las respuestas asociadas
      const solicitudesRespuestas = [
        {
          type: "execute",
          stmt: {
            sql: `DELETE FROM respuestas WHERE id_comentario = ?`,
            args: [{ type: "text", value: String(idComentario) }],
          },
        },
        { type: "close" },
      ]
      await ejecutarPipeline(solicitudesRespuestas)

      // Luego eliminar el comentario
      const solicitudesComentario = [
        {
          type: "execute",
          stmt: {
            sql: `DELETE FROM comentarios WHERE id = ? AND id_usuario = ?`,
            args: [
              { type: "text", value: String(idComentario) },
              { type: "text", value: String(usuarioActual.id) },
            ],
          },
        },
        { type: "close" },
      ]
      await ejecutarPipeline(solicitudesComentario)

      // Recargar publicaciones
      await cargarPublicaciones()
      Alert.alert("Comentario eliminado", "El comentario ha sido eliminado correctamente.")
    } catch (error) {
      console.error("Error al eliminar comentario:", error)
      Alert.alert("Error", "No se pudo eliminar el comentario. Intenta nuevamente.")
    }
  }

  // Función para eliminar una respuesta
  const eliminarRespuesta = async (idRespuesta) => {
    try {
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `DELETE FROM respuestas WHERE id = ? AND id_usuario = ?`,
            args: [
              { type: "text", value: String(idRespuesta) },
              { type: "text", value: String(usuarioActual.id) },
            ],
          },
        },
        { type: "close" },
      ]
      await ejecutarPipeline(solicitudes)

      // Recargar publicaciones
      await cargarPublicaciones()
      Alert.alert("Respuesta eliminada", "La respuesta ha sido eliminada correctamente.")
    } catch (error) {
      console.error("Error al eliminar respuesta:", error)
      Alert.alert("Error", "No se pudo eliminar la respuesta. Intenta nuevamente.")
    }
  }

  // Función para formatear fecha
  const formatearFecha = (fechaISO) => {
    try {
      const fecha = new Date(fechaISO)
      const ahora = new Date()
      const diferenciaMilisegundos = ahora - fecha

      // Menos de un minuto
      if (diferenciaMilisegundos < 60000) {
        return "Hace un momento"
      }

      // Menos de una hora
      if (diferenciaMilisegundos < 3600000) {
        const minutos = Math.floor(diferenciaMilisegundos / 60000)
        return `Hace ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`
      }

      // Menos de un día
      if (diferenciaMilisegundos < 86400000) {
        const horas = Math.floor(diferenciaMilisegundos / 3600000)
        return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`
      }

      // Menos de una semana
      if (diferenciaMilisegundos < 604800000) {
        const dias = Math.floor(diferenciaMilisegundos / 86400000)
        return `Hace ${dias} ${dias === 1 ? "día" : "días"}`
      }

      // Formato de fecha normal
      return fecha.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch (error) {
      console.error("Error al formatear fecha:", error)
      return "Fecha desconocida"
    }
  }

  // Función para refrescar la lista de publicaciones
  const onRefresh = () => {
    setRefrescando(true)
    cargarPublicaciones()
  }

  // Funciones de navegación
  const handleNavegacionInicio = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate("Main")
    } else if (navegarAMain) {
      navegarAMain()
    } else {
      console.warn("No se puede navegar a Inicio: navegación no disponible")
    }
  }

  const handleNavegacionCalendario = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate("Calendario")
    } else if (navegarACalendario) {
      navegarACalendario()
    } else {
      console.warn("No se puede navegar a Calendario: navegación no disponible")
    }
  }

  // Modifica la función handleNavegacionPerfil para que sea más simple:

  const handleNavegacionPerfil = () => {
    console.log("Intentando navegar a Perfil...");
    if (navegarAPerfil) {
      console.log("Usando navegarAPerfil");
      navegarAPerfil();
    } else if (navigation && navigation.navigate) {
      console.log("Usando navigation.navigate");
      navigation.navigate("perfil");
    } else {
      console.warn("No se puede navegar a Perfil: navegación no disponible");
    }
  };

  // Función para mostrar el menú de opciones de una publicación
  const mostrarMenuPublicacion = (publicacion) => {
    setPublicacionSeleccionada(publicacion)
    setMenuPublicacionVisible(true)
  }

  // Función para mostrar el menú de opciones de un comentario
  const mostrarMenuComentario = (comentario) => {
    setComentarioSeleccionado(comentario)
    setMenuComentarioVisible(true)
  }

  // Función para mostrar el menú de opciones de una respuesta
  const mostrarMenuRespuesta = (respuesta) => {
    setRespuestaSeleccionada(respuesta)
    setMenuRespuestaVisible(true)
  }

  // Función para iniciar la edición de una publicación
  const iniciarEdicionPublicacion = (publicacion) => {
    setPublicacionEditando(publicacion)
    setNuevaPublicacion({
      titulo: publicacion.titulo,
      descripcion: publicacion.descripcion,
    })
    setModoEdicion(true)
    setMostrarFormulario(true)
    setMenuPublicacionVisible(false)
  }

  // Función para iniciar la edición de un comentario
  const iniciarEdicionComentario = (comentario) => {
    setComentarioEditando(comentario)
    setTextoEditando(comentario.contenido)
    setMenuComentarioVisible(false)
  }

  // Función para iniciar la edición de una respuesta
  const iniciarEdicionRespuesta = (respuesta) => {
    setRespuestaEditando(respuesta)
    setTextoRespuestaEditando(respuesta.contenido)
    setMenuRespuestaVisible(false)
  }

  // Función para confirmar eliminación de publicación
  const confirmarEliminarPublicacion = (publicacion) => {
    Alert.alert(
      "Eliminar publicación",
      "¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => eliminarPublicacion(publicacion.id) },
      ],
    )
    setMenuPublicacionVisible(false)
  }

  // Función para confirmar eliminación de comentario
  const confirmarEliminarComentario = (comentario) => {
    Alert.alert(
      "Eliminar comentario",
      "¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => eliminarComentario(comentario.id) },
      ],
    )
    setMenuComentarioVisible(false)
  }

  // Función para confirmar eliminación de respuesta
  const confirmarEliminarRespuesta = (respuesta) => {
    Alert.alert(
      "Eliminar respuesta",
      "¿Estás seguro de que deseas eliminar esta respuesta? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => eliminarRespuesta(respuesta.id) },
      ],
    )
    setMenuRespuestaVisible(false)
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />

      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <View>
          <Text style={estilos.tituloApp}>FertiControl</Text>
          <Text style={estilos.subtituloApp}>Comunidad</Text>
        </View>
        <TouchableOpacity style={estilos.botonPerfil} onPress={handleNavegacionPerfil}>
          <Feather name="user" size={20} color="#F06292" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={estilos.contenedorPrincipal}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={estilos.contenido}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={["#F06292"]} />}
        >
          {/* Botón para crear nueva publicación */}
          <TouchableOpacity
            style={estilos.botonCrearPublicacion}
            onPress={() => {
              if (!modoEdicion) {
                setNuevaPublicacion({ titulo: "", descripcion: "" })
              }
              setMostrarFormulario(!mostrarFormulario)
            }}
          >
            <Feather name={mostrarFormulario ? "x" : "edit"} size={20} color="#FFFFFF" />
            <Text style={estilos.textoBotonCrear}>
              {mostrarFormulario ? "Cancelar" : modoEdicion ? "Editar publicación" : "Crear publicación"}
            </Text>
          </TouchableOpacity>

          {/* Formulario para crear/editar publicación */}
          {mostrarFormulario && (
            <View style={estilos.formularioPublicacion}>
              <Text style={estilos.tituloFormulario}>{modoEdicion ? "Editar publicación" : "Nueva publicación"}</Text>

              <View style={estilos.campoFormulario}>
                <Text style={estilos.etiquetaCampo}>Título</Text>
                <TextInput
                  style={estilos.inputFormulario}
                  placeholder="Escribe un título para tu publicación"
                  placeholderTextColor="#BDBDBD"
                  value={nuevaPublicacion.titulo}
                  onChangeText={(texto) => setNuevaPublicacion({ ...nuevaPublicacion, titulo: texto })}
                  maxLength={100}
                />
              </View>

              <View style={estilos.campoFormulario}>
                <Text style={estilos.etiquetaCampo}>Descripción</Text>
                <TextInput
                  style={[estilos.inputFormulario, estilos.inputMultilinea]}
                  placeholder="Comparte tu experiencia o pregunta con la comunidad..."
                  placeholderTextColor="#BDBDBD"
                  value={nuevaPublicacion.descripcion}
                  onChangeText={(texto) => setNuevaPublicacion({ ...nuevaPublicacion, descripcion: texto })}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[estilos.botonPublicar, enviandoPublicacion && estilos.botonDeshabilitado]}
                onPress={modoEdicion ? editarPublicacion : crearPublicacion}
                disabled={enviandoPublicacion}
              >
                {enviandoPublicacion ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotonPublicar}>{modoEdicion ? "Actualizar" : "Publicar"}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de publicaciones */}
          <View style={estilos.seccionPublicaciones}>
            <Text style={estilos.tituloSeccion}>Publicaciones recientes</Text>

            {cargando && !refrescando ? (
              <View style={estilos.contenedorCargando}>
                <ActivityIndicator size="large" color="#F06292" />
                <Text style={estilos.textoCargando}>Cargando publicaciones...</Text>
              </View>
            ) : publicaciones.length === 0 ? (
              <View style={estilos.contenedorVacio}>
                <Feather name="message-square" size={50} color="#F8BBD0" />
                <Text style={estilos.textoVacio}>No hay publicaciones aún</Text>
                <Text style={estilos.subtextoVacio}>¡Sé el primero en compartir algo con la comunidad!</Text>
              </View>
            ) : (
              publicaciones.map((publicacion) => (
                <View key={publicacion.id} style={estilos.tarjetaPublicacion}>
                  <View style={estilos.encabezadoPublicacion}>
                    <View style={estilos.infoUsuario}>
                      <View style={estilos.avatarUsuario}>
                        <Text style={estilos.textoAvatar}>{publicacion.Nombre.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={estilos.nombreUsuario}>{`${publicacion.Nombre} ${publicacion.Apellido}`}</Text>
                        <Text style={estilos.fechaPublicacion}>{formatearFecha(publicacion.fecha_creacion)}</Text>
                      </View>
                    </View>
                    {publicacion.es_propietario && (
                      <TouchableOpacity
                        style={estilos.botonOpciones}
                        onPress={() => mostrarMenuPublicacion(publicacion)}
                      >
                        <Feather name="more-horizontal" size={20} color="#9E9E9E" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={estilos.contenidoPublicacion}>
                    <Text style={estilos.tituloPublicacion}>{publicacion.titulo}</Text>
                    <Text style={estilos.textoPublicacion}>{publicacion.descripcion}</Text>
                  </View>

                  <View style={estilos.estadisticasPublicacion}>
                    <View style={estilos.estadistica}>
                      <Feather name="heart" size={16} color="#9E9E9E" />
                      <Text style={estilos.textoEstadistica}>{publicacion.total_likes || 0}</Text>
                    </View>
                    <View style={estilos.estadistica}>
                      <Feather name="message-circle" size={16} color="#9E9E9E" />
                      <Text style={estilos.textoEstadistica}>{publicacion.total_comentarios || 0}</Text>
                    </View>
                  </View>

                  <View style={estilos.accionesPublicacion}>
                    <TouchableOpacity
                      style={[estilos.botonAccion, publicacion.usuario_ha_reaccionado && estilos.botonAccionActivo]}
                      onPress={() => toggleReaccion(publicacion.id, publicacion.usuario_ha_reaccionado)}
                      disabled={enviandoReaccion}
                    >
                      <Feather
                        name="heart"
                        size={18}
                        color={publicacion.usuario_ha_reaccionado ? "#F06292" : "#757575"}
                      />
                      <Text
                        style={[estilos.textoAccion, publicacion.usuario_ha_reaccionado && estilos.textoAccionActivo]}
                      >
                        Me gusta
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={estilos.botonAccion}
                      onPress={() => setComentarioActivo(comentarioActivo === publicacion.id ? null : publicacion.id)}
                    >
                      <Feather name="message-circle" size={18} color="#757575" />
                      <Text style={estilos.textoAccion}>Comentar</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sección de comentarios */}
                  {(comentarioActivo === publicacion.id || publicacion.comentarios?.length > 0) && (
                    <View style={estilos.seccionComentarios}>
                      {publicacion.comentarios?.length > 0 && (
                        <>
                          <Text style={estilos.tituloComentarios}>Comentarios ({publicacion.comentarios.length})</Text>

                          {publicacion.comentarios.map((comentario) => (
                            <View key={comentario.id} style={estilos.comentarioContainer}>
                              <View style={estilos.comentario}>
                                <View style={estilos.avatarComentario}>
                                  <Text style={estilos.textoAvatarPequeno}>{comentario.Nombre.charAt(0)}</Text>
                                </View>
                                <TouchableWithoutFeedback
                                  onLongPress={() => comentario.es_propietario && mostrarMenuComentario(comentario)}
                                >
                                  <View style={estilos.contenidoComentario}>
                                    <View style={estilos.encabezadoComentario}>
                                      <Text style={estilos.nombreComentario}>
                                        {`${comentario.Nombre} ${comentario.Apellido}`}
                                      </Text>
                                      <Text style={estilos.fechaComentario}>
                                        {formatearFecha(comentario.fecha_creacion)}
                                      </Text>
                                    </View>
                                    <Text style={estilos.textoComentario}>{comentario.contenido}</Text>

                                    <View style={estilos.accionesComentario}>
                                      <TouchableOpacity
                                        style={estilos.botonRespuesta}
                                        onPress={() =>
                                          setRespuestaActiva(respuestaActiva === comentario.id ? null : comentario.id)
                                        }
                                      >
                                        <Feather name="corner-down-right" size={14} color="#757575" />
                                        <Text style={estilos.textoBotonRespuesta}>Responder</Text>
                                      </TouchableOpacity>

                                      {comentario.es_propietario && (
                                        <TouchableOpacity
                                          style={estilos.botonOpcionesComentario}
                                          onPress={() => mostrarMenuComentario(comentario)}
                                        >
                                          <Feather name="more-horizontal" size={14} color="#9E9E9E" />
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                  </View>
                                </TouchableWithoutFeedback>
                              </View>

                              {/* Respuestas al comentario */}
                              {comentario.respuestas && comentario.respuestas.length > 0 && (
                                <View style={estilos.respuestasContainer}>
                                  {comentario.respuestas.map((respuesta) => (
                                    <View key={respuesta.id} style={estilos.respuesta}>
                                      <View style={estilos.avatarRespuesta}>
                                        <Text style={estilos.textoAvatarPequeno}>{respuesta.Nombre.charAt(0)}</Text>
                                      </View>
                                      <TouchableWithoutFeedback
                                        onLongPress={() => respuesta.es_propietario && mostrarMenuRespuesta(respuesta)}
                                      >
                                        <View style={estilos.contenidoRespuesta}>
                                          <View style={estilos.encabezadoRespuesta}>
                                            <Text style={estilos.nombreRespuesta}>
                                              {`${respuesta.Nombre} ${respuesta.Apellido}`}
                                            </Text>
                                            <Text style={estilos.fechaRespuesta}>
                                              {formatearFecha(respuesta.fecha_creacion)}
                                            </Text>
                                          </View>
                                          <Text style={estilos.textoRespuesta}>{respuesta.contenido}</Text>

                                          {respuesta.es_propietario && (
                                            <TouchableOpacity
                                              style={estilos.botonOpcionesRespuesta}
                                              onPress={() => mostrarMenuRespuesta(respuesta)}
                                            >
                                              <Feather name="more-horizontal" size={14} color="#9E9E9E" />
                                            </TouchableOpacity>
                                          )}
                                        </View>
                                      </TouchableWithoutFeedback>
                                    </View>
                                  ))}
                                </View>
                              )}

                              {/* Formulario para responder */}
                              {respuestaActiva === comentario.id && (
                                <View style={estilos.formularioRespuesta}>
                                  <TextInput
                                    style={estilos.inputRespuesta}
                                    placeholder="Escribe una respuesta..."
                                    placeholderTextColor="#BDBDBD"
                                    value={nuevaRespuesta}
                                    onChangeText={setNuevaRespuesta}
                                    multiline={true}
                                  />
                                  <TouchableOpacity
                                    style={[
                                      estilos.botonEnviarRespuesta,
                                      (!nuevaRespuesta.trim() || enviandoRespuesta) && estilos.botonDeshabilitado,
                                    ]}
                                    onPress={() => agregarRespuesta(comentario.id)}
                                    disabled={!nuevaRespuesta.trim() || enviandoRespuesta}
                                  >
                                    {enviandoRespuesta ? (
                                      <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                      <Feather name="send" size={16} color="#FFFFFF" />
                                    )}
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          ))}
                        </>
                      )}

                      {comentarioActivo === publicacion.id && (
                        <View style={estilos.formularioComentario}>
                          <TextInput
                            style={estilos.inputComentario}
                            placeholder="Escribe un comentario..."
                            placeholderTextColor="#BDBDBD"
                            value={nuevoComentario}
                            onChangeText={setNuevoComentario}
                            multiline={true}
                          />
                          <TouchableOpacity
                            style={[
                              estilos.botonEnviarComentario,
                              (!nuevoComentario.trim() || enviandoComentario) && estilos.botonDeshabilitado,
                            ]}
                            onPress={() => agregarComentario(publicacion.id)}
                            disabled={!nuevoComentario.trim() || enviandoComentario}
                          >
                            {enviandoComentario ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Feather name="send" size={18} color="#FFFFFF" />
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Espacio adicional al final */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barra de navegación inferior */}
      <View style={estilos.barraNavegacion}>
        <TouchableOpacity style={estilos.botonNav} onPress={handleNavegacionInicio}>
          <Feather name="home" size={24} color="#9E9E9E" />
          <Text style={estilos.textoNav}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={estilos.botonNav} onPress={handleNavegacionCalendario}>
          <Feather name="calendar" size={24} color="#9E9E9E" />
          <Text style={estilos.textoNav}>Calendario</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[estilos.botonNav, estilos.botonNavActivo]}>
          <Feather name="users" size={24} color="#F06292" />
          <Text style={[estilos.textoNav, estilos.textoNavActivo]}>Comunidad</Text>
        </TouchableOpacity>
      </View>

      {/* Modal para editar comentario */}
      {comentarioEditando && (
        <Modal
          transparent={true}
          visible={!!comentarioEditando}
          animationType="fade"
          onRequestClose={() => setComentarioEditando(null)}
        >
          <TouchableWithoutFeedback onPress={() => setComentarioEditando(null)}>
            <View style={estilos.modalFondo}>
              <TouchableWithoutFeedback>
                <View style={estilos.modalContenido}>
                  <Text style={estilos.modalTitulo}>Editar comentario</Text>
                  <TextInput
                    style={[estilos.inputFormulario, estilos.inputMultilinea, { marginVertical: 15 }]}
                    placeholder="Edita tu comentario..."
                    placeholderTextColor="#BDBDBD"
                    value={textoEditando}
                    onChangeText={setTextoEditando}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoFocus={true}
                  />
                  <View style={estilos.modalBotones}>
                    <TouchableOpacity
                      style={[estilos.modalBoton, estilos.modalBotonCancelar]}
                      onPress={() => setComentarioEditando(null)}
                    >
                      <Text style={estilos.modalBotonTexto}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[estilos.modalBoton, estilos.modalBotonGuardar]}
                      onPress={editarComentario}
                    >
                      <Text style={[estilos.modalBotonTexto, { color: "#FFFFFF" }]}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Modal para editar respuesta */}
      {respuestaEditando && (
        <Modal
          transparent={true}
          visible={!!respuestaEditando}
          animationType="fade"
          onRequestClose={() => setRespuestaEditando(null)}
        >
          <TouchableWithoutFeedback onPress={() => setRespuestaEditando(null)}>
            <View style={estilos.modalFondo}>
              <TouchableWithoutFeedback>
                <View style={estilos.modalContenido}>
                  <Text style={estilos.modalTitulo}>Editar respuesta</Text>
                  <TextInput
                    style={[estilos.inputFormulario, estilos.inputMultilinea, { marginVertical: 15 }]}
                    placeholder="Edita tu respuesta..."
                    placeholderTextColor="#BDBDBD"
                    value={textoRespuestaEditando}
                    onChangeText={setTextoRespuestaEditando}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoFocus={true}
                  />
                  <View style={estilos.modalBotones}>
                    <TouchableOpacity
                      style={[estilos.modalBoton, estilos.modalBotonCancelar]}
                      onPress={() => setRespuestaEditando(null)}
                    >
                      <Text style={estilos.modalBotonTexto}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[estilos.modalBoton, estilos.modalBotonGuardar]} onPress={editarRespuesta}>
                      <Text style={[estilos.modalBotonTexto, { color: "#FFFFFF" }]}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Modal de opciones para publicación */}
      <Modal
        transparent={true}
        visible={menuPublicacionVisible}
        animationType="fade"
        onRequestClose={() => setMenuPublicacionVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuPublicacionVisible(false)}>
          <View style={estilos.modalFondo}>
            <TouchableWithoutFeedback>
              <View style={estilos.menuOpciones}>
                {publicacionSeleccionada?.es_propietario && (
                  <>
                    <TouchableOpacity
                      style={estilos.opcionMenu}
                      onPress={() => iniciarEdicionPublicacion(publicacionSeleccionada)}
                    >
                      <Feather name="edit-2" size={20} color="#424242" />
                      <Text style={estilos.textoOpcionMenu}>Editar publicación</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[estilos.opcionMenu, estilos.opcionMenuEliminar]}
                      onPress={() => confirmarEliminarPublicacion(publicacionSeleccionada)}
                    >
                      <Feather name="trash-2" size={20} color="#D32F2F" />
                      <Text style={[estilos.textoOpcionMenu, { color: "#D32F2F" }]}>Eliminar publicación</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={estilos.opcionMenu} onPress={() => setMenuPublicacionVisible(false)}>
                  <Feather name="x" size={20} color="#424242" />
                  <Text style={estilos.textoOpcionMenu}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de opciones para comentario */}
      <Modal
        transparent={true}
        visible={menuComentarioVisible}
        animationType="fade"
        onRequestClose={() => setMenuComentarioVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuComentarioVisible(false)}>
          <View style={estilos.modalFondo}>
            <TouchableWithoutFeedback>
              <View style={estilos.menuOpciones}>
                {comentarioSeleccionado?.es_propietario && (
                  <>
                    <TouchableOpacity
                      style={estilos.opcionMenu}
                      onPress={() => iniciarEdicionComentario(comentarioSeleccionado)}
                    >
                      <Feather name="edit-2" size={20} color="#424242" />
                      <Text style={estilos.textoOpcionMenu}>Editar comentario</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[estilos.opcionMenu, estilos.opcionMenuEliminar]}
                      onPress={() => confirmarEliminarComentario(comentarioSeleccionado)}
                    >
                      <Feather name="trash-2" size={20} color="#D32F2F" />
                      <Text style={[estilos.textoOpcionMenu, { color: "#D32F2F" }]}>Eliminar comentario</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={estilos.opcionMenu} onPress={() => setMenuComentarioVisible(false)}>
                  <Feather name="x" size={20} color="#424242" />
                  <Text style={estilos.textoOpcionMenu}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de opciones para respuesta */}
      <Modal
        transparent={true}
        visible={menuRespuestaVisible}
        animationType="fade"
        onRequestClose={() => setMenuRespuestaVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuRespuestaVisible(false)}>
          <View style={estilos.modalFondo}>
            <TouchableWithoutFeedback>
              <View style={estilos.menuOpciones}>
                {respuestaSeleccionada?.es_propietario && (
                  <>
                    <TouchableOpacity
                      style={estilos.opcionMenu}
                      onPress={() => iniciarEdicionRespuesta(respuestaSeleccionada)}
                    >
                      <Feather name="edit-2" size={20} color="#424242" />
                      <Text style={estilos.textoOpcionMenu}>Editar respuesta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[estilos.opcionMenu, estilos.opcionMenuEliminar]}
                      onPress={() => confirmarEliminarRespuesta(respuestaSeleccionada)}
                    >
                      <Feather name="trash-2" size={20} color="#D32F2F" />
                      <Text style={[estilos.textoOpcionMenu, { color: "#D32F2F" }]}>Eliminar respuesta</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={estilos.opcionMenu} onPress={() => setMenuRespuestaVisible(false)}>
                  <Feather name="x" size={20} color="#424242" />
                  <Text style={estilos.textoOpcionMenu}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#FFF5F7",
  },
  contenedorPrincipal: {
    flex: 1,
  },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  tituloApp: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F06292",
  },
  subtituloApp: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  botonPerfil: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5F7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  contenido: {
    flex: 1,
    padding: 20,
  },
  botonCrearPublicacion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F06292",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  textoBotonCrear: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
  formularioPublicacion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tituloFormulario: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 16,
  },
  campoFormulario: {
    marginBottom: 16,
  },
  etiquetaCampo: {
    fontSize: 14,
    fontWeight: "500",
    color: "#757575",
    marginBottom: 8,
  },
  inputFormulario: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F5F5F5",
    fontSize: 14,
    color: "#424242",
  },
  inputMultilinea: {
    minHeight: 100,
    paddingTop: 12,
  },
  botonPublicar: {
    backgroundColor: "#F06292",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  textoBotonPublicar: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  botonDeshabilitado: {
    backgroundColor: "#F8BBD0",
    shadowOpacity: 0.1,
  },
  seccionPublicaciones: {
    marginBottom: 20,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 16,
  },
  contenedorCargando: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  contenedorCargandoCompleto: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  textoCargando: {
    fontSize: 14,
    color: "#757575",
    marginTop: 10,
  },
  textoError: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D32F2F",
    marginTop: 16,
    textAlign: "center",
  },
  botonReintentar: {
    backgroundColor: "#F06292",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  textoBotonReintentar: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  contenedorVacio: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  textoVacio: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#757575",
    marginTop: 16,
  },
  subtextoVacio: {
    fontSize: 14,
    color: "#9E9E9E",
    marginTop: 8,
    textAlign: "center",
  },
  tarjetaPublicacion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  encabezadoPublicacion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoUsuario: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarUsuario: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F06292",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textoAvatar: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  nombreUsuario: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
  },
  fechaPublicacion: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  botonOpciones: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  contenidoPublicacion: {
    marginBottom: 12,
  },
  tituloPublicacion: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 8,
  },
  textoPublicacion: {
    fontSize: 14,
    color: "#424242",
    lineHeight: 20,
  },
  estadisticasPublicacion: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingTop: 12,
    marginBottom: 12,
  },
  estadistica: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  textoEstadistica: {
    fontSize: 12,
    color: "#9E9E9E",
    marginLeft: 5,
  },
  accionesPublicacion: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingTop: 12,
  },
  botonAccion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 12,
  },
  botonAccionActivo: {
    backgroundColor: "#FFF5F7",
  },
  textoAccion: {
    fontSize: 12,
    color: "#757575",
    marginLeft: 5,
  },
  textoAccionActivo: {
    color: "#F06292",
    fontWeight: "500",
  },
  seccionComentarios: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingTop: 12,
  },
  tituloComentarios: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 12,
  },
  comentarioContainer: {
    marginBottom: 16,
  },
  comentario: {
    flexDirection: "row",
    marginBottom: 8,
  },
  avatarComentario: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F8BBD0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  textoAvatarPequeno: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  contenidoComentario: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 10,
  },
  encabezadoComentario: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  nombreComentario: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#424242",
  },
  fechaComentario: {
    fontSize: 10,
    color: "#9E9E9E",
  },
  textoComentario: {
    fontSize: 12,
    color: "#424242",
    lineHeight: 18,
  },
  accionesComentario: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  botonRespuesta: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoBotonRespuesta: {
    fontSize: 11,
    color: "#757575",
    marginLeft: 4,
  },
  botonOpcionesComentario: {
    padding: 2,
  },
  respuestasContainer: {
    marginLeft: 40,
    marginTop: 4,
  },
  respuesta: {
    flexDirection: "row",
    marginBottom: 8,
  },
  avatarRespuesta: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FCE4EC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  contenidoRespuesta: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 8,
  },
  encabezadoRespuesta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  nombreRespuesta: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#424242",
  },
  fechaRespuesta: {
    fontSize: 9,
    color: "#9E9E9E",
  },
  textoRespuesta: {
    fontSize: 11,
    color: "#424242",
    lineHeight: 16,
  },
  botonOpcionesRespuesta: {
    alignSelf: "flex-end",
    padding: 2,
    marginTop: 2,
  },
  formularioComentario: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  inputComentario: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F5F5F5",
    fontSize: 14,
    color: "#424242",
    maxHeight: 100,
  },
  botonEnviarComentario: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F06292",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  formularioRespuesta: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 40,
    marginTop: 4,
  },
  inputRespuesta: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#F5F5F5",
    fontSize: 12,
    color: "#424242",
    maxHeight: 80,
  },
  botonEnviarRespuesta: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F06292",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  barraNavegacion: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  botonNav: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  botonNavActivo: {
    backgroundColor: "#FFF5F7",
  },
  textoNav: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 4,
  },
  textoNavActivo: {
    color: "#F06292",
    fontWeight: "500",
  },
  modalFondo: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuOpciones: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 8,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  opcionMenu: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  opcionMenuEliminar: {
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  textoOpcionMenu: {
    fontSize: 16,
    color: "#424242",
    marginLeft: 12,
  },
  modalContenido: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 10,
  },
  modalBotones: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  modalBoton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  modalBotonCancelar: {
    backgroundColor: "#F5F5F5",
  },
  modalBotonGuardar: {
    backgroundColor: "#F06292",
  },
  modalBotonTexto: {
    fontSize: 14,
    fontWeight: "bold",
  },
})

export default PantallaComunidad
