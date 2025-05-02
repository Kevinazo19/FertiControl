import { Feather } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Constants from "expo-constants"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, TouchableWithoutFeedback, View,
} from "react-native"

const getEnvVariable = (name) => {
  try {
    return Constants.expoConfig?.extra?.[name] || ""
  } catch (error) {
    console.error(`Error al obtener variable de entorno ${name}:`, error)
    return ""
  }
}

const HTTP_URL = getEnvVariable("HTTP_URL")
const AUTH_TOKEN = getEnvVariable("AUTH_TOKEN")

async function ejecutarPipeline(solicitudes, intentos = 3) {
  if (!HTTP_URL || !AUTH_TOKEN) {
    console.error("❌ Error: Faltan variables de entorno HTTP_URL o AUTH_TOKEN")
    Alert.alert("Error de configuración", "Faltan variables de entorno necesarias para la conexión a la base de datos.")
    return { error: true, message: "Faltan credenciales", responses: [], results: [] }
  }

  const carga = { baton: null, requests: solicitudes }
  console.log("📤 Intentando conexión a Turso...")

  const tokenSeguro = AUTH_TOKEN
    ? `${AUTH_TOKEN.substring(0, 5)}...${AUTH_TOKEN.substring(AUTH_TOKEN.length - 5)}`
    : "no disponible"
  console.log(`URL: ${HTTP_URL}, Token: ${tokenSeguro}`)

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      console.log(`🔄 Intento ${intento} de ${intentos}`)

      const controlador = new AbortController()
      const timeoutId = setTimeout(() => controlador.abort(), 10000)

      const respuesta = await fetch(`${HTTP_URL}/v2/pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify(carga),
        signal: controlador.signal,
      })
      clearTimeout(timeoutId)

      const texto = await respuesta.text()

      if (!respuesta.ok) {
        console.error(`🔴 Error HTTP Turso (${respuesta.status}):`, texto)

        // Si es un error de autenticación, no reintentar
        if (respuesta.status === 401 || respuesta.status === 403) {
          Alert.alert(
            "Error de autenticación",
            "No se pudo autenticar con la base de datos. Verifica tu token de autenticación.",
          )
          return { error: true, message: `Error de autenticación: ${respuesta.status}`, responses: [], results: [] }
        }

        // Si no es el último intento, continuar al siguiente
        if (intento < intentos) continue

        throw new Error(`Error HTTP ${respuesta.status}: ${texto || "Sin detalles"}`)
      }

      try {
        const json = JSON.parse(texto)
        console.log("✅ Conexión exitosa con Turso")
        return json
      } catch (e) {
        console.error("🔴 No se pudo parsear JSON Turso:", texto)

        // Si no es el último intento, continuar al siguiente
        if (intento < intentos) continue

        throw new Error(`Error al parsear respuesta: ${e.message}`)
      }
    } catch (error) {
      console.error(`🔴 Error en la conexión con Turso (intento ${intento}):`, error)

      // Si no es el último intento, continuar al siguiente
      if (intento < intentos) {
        console.log(`⏱️ Esperando antes del siguiente intento...`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Esperar 1 segundo entre intentos
        continue
      }

      // Si llegamos aquí, todos los intentos fallaron
      Alert.alert(
        "Error de conexión",
        "No se pudo conectar a la base de datos después de varios intentos. Verifica tu conexión a internet.",
      )

      return {
        error: true,
        message: error.message || "Error de conexión",
        responses: [],
        results: [],
      }
    }
  }
}

// Función para verificar la conexión a la base de datos
async function verificarConexion() {
  try {
    const pingRequest = [
      {
        type: "execute",
        stmt: {
          sql: "SELECT 1 as ping",
        },
      },
      { type: "close" },
    ]

    const resultado = await ejecutarPipeline(pingRequest, 2)

    if (resultado.error) {
      return false
    }

    // Verificar que la respuesta contiene el resultado esperado
    let pingExitoso = false

    if (resultado.results && resultado.results[0] && resultado.results[0].response) {
      const rows = resultado.results[0].response.result.rows
      if (rows && rows.length > 0) {
        pingExitoso = true
      }
    }

    return pingExitoso
  } catch (error) {
    console.error("Error al verificar conexión:", error)
    return false
  }
}

const PantallaHome = ({
  navegarAComunidad,
  navegarAPerfil,
  navegarACalendario,
  navegarAPrevencionETS,
  navegarAMetodosBarrera,
  navegarAMetodosHormonales,
}) => {
  const [activeTab, setActiveTab] = useState("home")
  const [nombreUsuario, setNombreUsuario] = useState("Usuario")
  const [cargando, setCargando] = useState(true)
  const [encuestaCompletada, setEncuestaCompletada] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [datosGrafico, setDatosGrafico] = useState({
    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
    valores: [28, 30, 27, 29, 31, 26],
    legend: "Promedio de ciclos de las encuestas (días)",
  })
  const [errorConexion, setErrorConexion] = useState(false)
  const [estadoConexion, setEstadoConexion] = useState({
    conectado: false,
    mensaje: "Verificando conexión...",
    ultimaVerificacion: null,
  })

  // Estado para la encuesta - usando useRef para evitar re-renderizados
  const duracionCicloRef = useRef("")
  const duracionPeriodoRef = useRef("")
  const nivelDolorRef = useRef("")
  const estadoAnimoRef = useRef("")
  const flujoMenstrualRef = useRef("")
  const sintomasRef = useRef("")

  // Verificar conexión al iniciar
  useEffect(() => {
    const comprobarConexion = async () => {
      setCargando(true)
      console.log("🔍 Verificando conexión a la base de datos...")

      const conexionExitosa = await verificarConexion()

      setEstadoConexion({
        conectado: conexionExitosa,
        mensaje: conexionExitosa ? "Conectado a la base de datos" : "No se pudo conectar a la base de datos",
        ultimaVerificacion: new Date(),
      })

      setErrorConexion(!conexionExitosa)

      if (!conexionExitosa) {
        console.error("❌ No se pudo establecer conexión con la base de datos")
        Alert.alert("Problema de conexión", "No se pudo conectar a la base de datos. Se mostrarán datos por defecto.", [
          { text: "Entendido" },
        ])
      } else {
        console.log("✅ Conexión establecida correctamente")
      }

      setCargando(false)
    }

    comprobarConexion()
  }, [])

  // Obtener datos del usuario y encuesta al cargar
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true)

        // Obtener datos del usuario desde AsyncStorage
        const usuarioGuardado = await AsyncStorage.getItem("usuario")

        if (!usuarioGuardado) {
          console.log("⚠️ No se encontró información del usuario en AsyncStorage")
          setCargando(false)
          return
        }

        // Parsear los datos del usuario
        const datosUsuario = JSON.parse(usuarioGuardado)
        console.log("🟢 Datos de usuario encontrados:", datosUsuario)

        // Establecer el nombre del usuario
        if (datosUsuario.nombre) {
          setNombreUsuario(datosUsuario.nombre)
        }

        // Solo intentar operaciones de base de datos si hay conexión
        if (estadoConexion.conectado) {
          // Crear la tabla sin restricción de clave foránea
          await crearTablaEncuestas()

          // Verificar si ya completó la encuesta
          await verificarEncuestaCompletada(datosUsuario.id)

          // Cargar datos del gráfico
          await cargarDatosGrafico(datosUsuario.id)
        } else {
          console.log("⚠️ Saltando operaciones de base de datos debido a problemas de conexión")
        }

        setCargando(false)
      } catch (error) {
        console.error("🔴 Error al cargar datos:", error)
        setCargando(false)
      }
    }

    if (estadoConexion.ultimaVerificacion) {
      cargarDatos()
    }
  }, [estadoConexion])

  // Añadir este código justo después de los otros useEffect
  useEffect(() => {
    // Esta función se ejecutará cada vez que la pantalla se enfoque
    const verificarDatosAlRegresar = async () => {
      try {
        console.log("🔄 Verificando datos al regresar a la pantalla Home")
        const usuarioGuardado = await AsyncStorage.getItem("usuario")

        if (usuarioGuardado && estadoConexion.conectado) {
          const datosUsuario = JSON.parse(usuarioGuardado)
          console.log("🟢 Verificando encuesta para usuario:", datosUsuario.id)

          // Verificar encuesta y cargar datos
          await verificarEncuestaCompletada(datosUsuario.id)
          await cargarDatosGrafico(datosUsuario.id)
        }
      } catch (error) {
        console.error("🔴 Error al verificar datos al regresar:", error)
      }
    }

    // Ejecutar la verificación inmediatamente si hay conexión
    if (estadoConexion.conectado) {
      verificarDatosAlRegresar()
    }
  }, [activeTab, estadoConexion.conectado]) // Esto hará que se ejecute cuando cambie la pestaña activa o el estado de conexión

  // Función para reintentar la conexión
  const reintentarConexion = async () => {
    setCargando(true)
    console.log("🔄 Reintentando conexión a la base de datos...")

    const conexionExitosa = await verificarConexion()

    setEstadoConexion({
      conectado: conexionExitosa,
      mensaje: conexionExitosa ? "Conectado a la base de datos" : "No se pudo conectar a la base de datos",
      ultimaVerificacion: new Date(),
    })

    setErrorConexion(!conexionExitosa)

    if (conexionExitosa) {
      console.log("✅ Conexión restablecida correctamente")

      // Recargar datos
      const usuarioGuardado = await AsyncStorage.getItem("usuario")
      if (usuarioGuardado) {
        const datosUsuario = JSON.parse(usuarioGuardado)
        await crearTablaEncuestas()
        await verificarEncuestaCompletada(datosUsuario.id)
        await cargarDatosGrafico(datosUsuario.id)
      }
    } else {
      console.error("❌ No se pudo restablecer la conexión")
    }

    setCargando(false)
  }

  // Función para crear la tabla de encuestas sin restricción de clave foránea
  const crearTablaEncuestas = async () => {
    try {
      console.log("🔧 Creando tabla de encuestas sin restricción de clave foránea")

      // Primero intentamos eliminar cualquier restricción de clave foránea existente
      const eliminarRestriccion = [
        {
          type: "execute",
          stmt: {
            sql: `PRAGMA foreign_keys = OFF;`,
          },
        },
        { type: "close" },
      ]

      const respuesta1 = await ejecutarPipeline(eliminarRestriccion)
      if (respuesta1.error) {
        console.error("❌ Error al desactivar restricciones:", respuesta1.message)
        return false
      }

      console.log("✅ Restricciones de clave foránea desactivadas")

      // Ahora creamos la tabla sin ninguna referencia a usuarios
      const crearTabla = [
        {
          type: "execute",
          stmt: {
            sql: `CREATE TABLE IF NOT EXISTS encuestas_ciclo (
            id TEXT PRIMARY KEY,
            usuario_id TEXT NOT NULL,
            duracion_ciclo TEXT,
            duracion_periodo TEXT,
            nivel_dolor TEXT,
            estado_animo TEXT,
            flujo_menstrual TEXT,
            sintomas TEXT,
            fecha_creacion TEXT
          )`,
          },
        },
        { type: "close" },
      ]

      const respuesta2 = await ejecutarPipeline(crearTabla)
      if (respuesta2.error) {
        console.error("❌ Error al crear tabla:", respuesta2.message)
        return false
      }

      console.log("✅ Tabla de encuestas creada correctamente")
      return true
    } catch (error) {
      console.error("❌ Error al crear tabla de encuestas:", error)
      return false
    }
  }

  // Reemplazar la función verificarEncuestaCompletada completa
  const verificarEncuestaCompletada = async (usuarioId) => {
    try {
      console.log("🔍 Verificando encuesta completada para usuario:", usuarioId)

      // Consultar encuestas existentes
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT * FROM encuestas_ciclo WHERE usuario_id = ? ORDER BY fecha_creacion DESC LIMIT 1`,
            args: [{ type: "text", value: usuarioId }],
          },
        },
        { type: "close" },
      ]

      console.log("🔍 Consultando encuestas para usuario:", usuarioId)
      const respuesta = await ejecutarPipeline(solicitudes)

      if (respuesta.error) {
        console.error("❌ Error al consultar encuestas:", respuesta.message)
        return
      }

      // Procesar resultados
      let filas = []
      let encuestaEncontrada = false

      // Manejar diferentes estructuras de respuesta
      if (respuesta.results && respuesta.results[0] && respuesta.results[0].response) {
        const filasRaw = respuesta.results[0].response.result.rows || []
        console.log("📋 Filas encontradas (formato 1):", filasRaw.length)

        if (filasRaw.length > 0) {
          encuestaEncontrada = true
          filas = filasRaw.map((fila) => ({
            id: fila[0].value,
            usuario_id: fila[1].value,
            duracion_ciclo: fila[2].value,
            duracion_periodo: fila[3].value,
            nivel_dolor: fila[4].value,
            estado_animo: fila[5].value,
            flujo_menstrual: fila[6].value,
            sintomas: fila[7].value,
            fecha_creacion: fila[8].value,
          }))
        }
      } else if (respuesta.responses && respuesta.responses[0] && respuesta.responses[0].result) {
        const filasRaw = respuesta.responses[0].result.rows || []
        console.log("📋 Filas encontradas (formato 2):", filasRaw.length)

        if (filasRaw.length > 0) {
          encuestaEncontrada = true
          filas = filasRaw
        }
      }

      console.log("📊 Encuesta encontrada:", encuestaEncontrada)
      setEncuestaCompletada(encuestaEncontrada)

      if (encuestaEncontrada && filas.length > 0) {
        // Cargar las respuestas anteriores para edición
        console.log("📝 Cargando respuestas anteriores:", filas[0])

        // Asegurarse de que los campos existan antes de asignarlos
        duracionCicloRef.current = filas[0].duracion_ciclo || ""
        duracionPeriodoRef.current = filas[0].duracion_periodo || ""
        nivelDolorRef.current = filas[0].nivel_dolor || ""
        estadoAnimoRef.current = filas[0].estado_animo || ""
        flujoMenstrualRef.current = filas[0].flujo_menstrual || ""
        sintomasRef.current = filas[0].sintomas || ""
      } else {
        console.log("❌ No se encontraron encuestas para este usuario")
      }
    } catch (error) {
      console.error("🔴 Error al verificar encuesta:", error)
      setEncuestaCompletada(false)
    }
  }

  // Reemplazar la función cargarDatosGrafico completa
  const cargarDatosGrafico = async (usuarioId) => {
    try {
      setErrorConexion(false)
      console.log("📊 Cargando datos del gráfico para usuario:", usuarioId)

      // Continuar con la consulta original...
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT duracion_ciclo, fecha_creacion FROM encuestas_ciclo 
          WHERE usuario_id = ? 
          ORDER BY fecha_creacion DESC 
          LIMIT 12`, // Aumentamos el límite para tener más datos disponibles
            args: [{ type: "text", value: usuarioId }],
          },
        },
        { type: "close" },
      ]

      const respuesta = await ejecutarPipeline(solicitudes)

      // Verificar si hay error en la respuesta
      if (respuesta.error) {
        console.error("❌ Error al cargar datos del gráfico:", respuesta.message)
        throw new Error(respuesta.message)
      }

      // Procesar resultados
      let filas = []

      // Manejar diferentes estructuras de respuesta
      if (respuesta.results && respuesta.results[0] && respuesta.results[0].response) {
        const filasRaw = respuesta.results[0].response.result.rows || []
        console.log("📋 Filas encontradas para gráfico (formato 1):", filasRaw.length)

        if (filasRaw.length > 0) {
          filas = filasRaw.map((fila) => ({
            duracion_ciclo: fila[0].value,
            fecha_creacion: fila[1].value,
          }))
        }
      } else if (respuesta.responses && respuesta.responses[0] && respuesta.responses[0].result) {
        const filasRaw = respuesta.responses[0].result.rows || []
        console.log("📋 Filas encontradas para gráfico (formato 2):", filasRaw.length)

        if (filasRaw.length > 0) {
          filas = filasRaw
        }
      }

      console.log("📊 Datos procesados para gráfico:", filas)

      // Si hay datos, actualizar el gráfico
      if (filas.length > 0) {
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        
        // Filtrar valores atípicos y procesar los datos para el gráfico
        const filasValidas = filas.filter((fila) => {
          // Convertir duración del ciclo a número
          const duracion = Number.parseInt(fila.duracion_ciclo, 10) || 0
          // Aceptar cualquier valor positivo razonable (mayor que 0 y menor que 100)
          return duracion > 0 && duracion < 100
        })

        // Si no hay datos válidos después del filtrado, usar valores por defecto
        if (filasValidas.length === 0) {
          console.log("⚠️ No hay datos válidos después del filtrado, usando valores por defecto")
          setDatosGrafico({
            labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
            valores: [28, 29, 27, 28, 30, 28],
            legend: "Promedio de ciclos de las encuestas (valores por defecto)",
          })
          return
        }

        // Agrupar datos por mes para evitar repeticiones
        const datosPorMes = {}
        
        filasValidas.forEach((fila) => {
          const fecha = new Date(fila.fecha_creacion)
          const mes = fecha.getMonth()
          const duracion = Number.parseInt(fila.duracion_ciclo, 10) || 28
          
          if (!datosPorMes[mes]) {
            datosPorMes[mes] = {
              total: duracion,
              count: 1
            }
          } else {
            datosPorMes[mes].total += duracion
            datosPorMes[mes].count += 1
          }
        })
        
        // Convertir los datos agrupados en arrays para el gráfico
        const mesesConDatos = Object.keys(datosPorMes).map(Number)
        mesesConDatos.sort((a, b) => b - a) // Ordenar de más reciente a más antiguo
        
        const labels = []
        const valores = []
        
        // Tomar hasta 6 meses únicos con datos
        mesesConDatos.slice(0, 6).forEach(mes => {
          labels.push(meses[mes])
          // Calcular el promedio para cada mes
          const promedio = Math.round(datosPorMes[mes].total / datosPorMes[mes].count)
          valores.push(promedio)
          console.log(`📅 Mes ${meses[mes]}: Promedio de duración ${promedio} días (${datosPorMes[mes].count} registros)`)
        })
        
        // Si hay menos de 6 meses de datos, completar con valores por defecto
        if (labels.length < 6) {
          // Determinar qué meses faltan
          const mesesFaltantes = 6 - labels.length
          const mesActual = new Date().getMonth()
          
          for (let i = 1; i <= mesesFaltantes; i++) {
            // Calcular el mes anterior al más antiguo que ya tenemos
            const ultimoMesIndex = mesesConDatos.length > 0 ? 
              Math.min(...mesesConDatos) - i : 
              (mesActual - i + 12) % 12
              
            const mesIndex = (ultimoMesIndex + 12) % 12 // Asegurar que sea positivo
            
            // Añadir al principio para mantener el orden cronológico
            labels.unshift(meses[mesIndex])
            valores.unshift(28) // Valor por defecto
          }
        }

        console.log("📊 Datos finales para gráfico:", { labels, valores })

        // Actualizar el estado del gráfico con el nuevo formato para react-native-svg-charts
        setDatosGrafico({
          labels,
          valores,
          legend: "Promedio de ciclos de las encuestas (días)",
        })

        console.log("✅ Gráfico actualizado correctamente")
      } else {
        console.log("⚠️ No hay datos suficientes para actualizar el gráfico")
      }
    } catch (error) {
      console.error("🔴 Error al cargar datos del gráfico:", error)
      setErrorConexion(true)
      // Mantener datos de ejemplo si hay error
      setDatosGrafico({
        labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
        valores: [28, 29, 27, 28, 30, 28],
        legend: "Valores por defecto (error de conexión)",
      })
    }
  }

  // Reemplazar la función guardarEncuesta completa
  const guardarEncuesta = async () => {
    try {
      // Verificar conexión antes de intentar guardar
      if (!estadoConexion.conectado) {
        Alert.alert("Sin conexión", "No hay conexión con la base de datos. No se pueden guardar los datos.", [
          { text: "Cancelar", style: "cancel" },
          { text: "Reintentar conexión", onPress: reintentarConexion },
        ])
        return
      }

      // Validar que todos los campos estén completos
      if (!duracionCicloRef.current || !duracionPeriodoRef.current || !nivelDolorRef.current) {
        Alert.alert(
          "Campos incompletos",
          "Por favor completa los campos obligatorios (duración del ciclo, duración del periodo y nivel de dolor).",
        )
        return
      }

      // Validar rangos de valores
      const duracionCiclo = Number.parseInt(duracionCicloRef.current, 10)
      const duracionPeriodo = Number.parseInt(duracionPeriodoRef.current, 10)
      const nivelDolor = Number.parseInt(nivelDolorRef.current, 10)

      // Ahora también actualizaremos la validación en la función guardarEncuesta
      // para permitir que se ingresen valores menores, manteniendo advertencias pero permitiendo guardar

      // Reemplazar la validación de duracionCiclo con:

      // Validar duración del ciclo (advertir si está fuera de 21-40 días pero permitir guardar)
      if (isNaN(duracionCiclo) || duracionCiclo <= 0 || duracionCiclo > 100) {
        Alert.alert("Valor incorrecto", "La duración del ciclo debe ser un número positivo (entre 1 y 100 días).")
        return
      } else if (duracionCiclo < 21 || duracionCiclo > 40) {
        // Solo mostrar advertencia pero permitir continuar
        Alert.alert(
          "Valor inusual",
          "Has ingresado una duración de ciclo de " +
            duracionCiclo +
            " días. El rango normal suele estar entre 21 y 40 días. ¿Deseas continuar?",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Continuar", onPress: () => confirmarGuardarEncuesta() },
          ],
        )
        return
      }

      // Validar duración del período (2-10 días es el rango normal)
      if (isNaN(duracionPeriodo) || duracionPeriodo < 2 || duracionPeriodo > 10) {
        Alert.alert(
          "Valor incorrecto",
          "La duración del periodo debe estar entre 2 y 10 días. Este es el rango normal para la mayoría de las mujeres.",
        )
        return
      }

      // Validar nivel de dolor (1-10)
      if (isNaN(nivelDolor) || nivelDolor < 1 || nivelDolor > 10) {
        Alert.alert("Valor incorrecto", "El nivel de dolor debe estar entre 1 y 10.")
        return
      }

      setCargando(true)
      console.log("🔄 Iniciando proceso de guardado de encuesta")

      // Obtener ID del usuario
      const usuarioGuardado = await AsyncStorage.getItem("usuario")
      if (!usuarioGuardado) {
        Alert.alert("Error", "No se pudo identificar al usuario. Intenta iniciar sesión nuevamente.")
        setCargando(false)
        return
      }

      const datosUsuario = JSON.parse(usuarioGuardado)
      const usuarioId = datosUsuario.id

      console.log("👤 Usuario identificado:", usuarioId)
      console.log("📝 Datos a guardar:", {
        duracionCiclo: duracionCicloRef.current,
        duracionPeriodo: duracionPeriodoRef.current,
        nivelDolor: nivelDolorRef.current,
        estadoAnimo: estadoAnimoRef.current,
        flujoMenstrual: flujoMenstrualRef.current,
        sintomas: sintomasRef.current,
      })

      // Generar ID único para la encuesta
      const encuestaId = `enc_${Date.now()}`
      console.log("🆔 ID generado para la encuesta:", encuestaId)

      // Asegurarnos de que la tabla existe sin restricciones
      const tablaCreada = await crearTablaEncuestas()
      if (!tablaCreada) {
        Alert.alert("Error", "No se pudo crear la tabla de encuestas. Intenta de nuevo más tarde.")
        setCargando(false)
        return
      }

      // Insertar nueva encuesta con manejo de errores mejorado
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `INSERT INTO encuestas_ciclo (
          id, usuario_id, duracion_ciclo, duracion_periodo, nivel_dolor, 
          estado_animo, flujo_menstrual, sintomas, fecha_creacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            args: [
              { type: "text", value: encuestaId },
              { type: "text", value: usuarioId },
              { type: "text", value: duracionCicloRef.current },
              { type: "text", value: duracionPeriodoRef.current },
              { type: "text", value: nivelDolorRef.current },
              { type: "text", value: estadoAnimoRef.current || "" },
              { type: "text", value: flujoMenstrualRef.current || "" },
              { type: "text", value: sintomasRef.current || "" },
            ],
          },
        },
        { type: "close" },
      ]

      console.log("📤 Enviando solicitud de inserción")
      const resultado = await ejecutarPipeline(solicitudes)

      // Verificar si hay error en la respuesta
      if (resultado.error) {
        console.error("❌ Error al guardar encuesta:", resultado.message)
        Alert.alert("Error", `No se pudo guardar la encuesta: ${resultado.message}. Intenta de nuevo más tarde.`)
        setCargando(false)
        return
      }

      console.log("📥 Resultado de guardar encuesta:", JSON.stringify(resultado, null, 2))

      // Verificar si la inserción fue exitosa con mejor manejo de errores
      let exitoso = true
      let mensajeError = ""

      if (resultado.results) {
        // Verificar si hay algún error en los resultados
        const errorResult = resultado.results.find((r) => r.type === "error" && r.error)
        if (errorResult) {
          exitoso = false
          mensajeError = errorResult.error.message || "Error desconocido"
          console.error("❌ Error en la respuesta:", errorResult.error)
        }
      }

      if (exitoso) {
        console.log("✅ Encuesta guardada exitosamente")

        // Actualizar estado
        setEncuestaCompletada(true)
        setModalVisible(false)

        // Recargar datos del gráfico
        console.log("🔄 Recargando datos del gráfico")
        await cargarDatosGrafico(usuarioId)

        Alert.alert(
          encuestaCompletada ? "Encuesta actualizada" : "Encuesta guardada",
          "Gracias por completar la encuesta sobre tu ciclo menstrual.",
        )
      } else {
        console.error(`❌ Error al guardar la encuesta: ${mensajeError}`)
        Alert.alert("Error", `No se pudo guardar la encuesta: ${mensajeError}. Intenta de nuevo más tarde.`)
      }

      setCargando(false)
    } catch (error) {
      console.error("🔴 Error al guardar encuesta:", error)
      Alert.alert("Error", "No se pudo guardar la encuesta. Intenta de nuevo más tarde.")
      setCargando(false)
    }
  }

  // Y agregar esta nueva función después de guardarEncuesta:

  const confirmarGuardarEncuesta = async () => {
    try {
      setCargando(true)
      console.log("🔄 Guardando encuesta con valores inusuales (confirmado por usuario)")

      // Obtener ID del usuario
      const usuarioGuardado = await AsyncStorage.getItem("usuario")
      if (!usuarioGuardado) {
        Alert.alert("Error", "No se pudo identificar al usuario. Intenta iniciar sesión nuevamente.")
        setCargando(false)
        return
      }

      const datosUsuario = JSON.parse(usuarioGuardado)
      const usuarioId = datosUsuario.id
      const encuestaId = `enc_${Date.now()}`

      // Crear tabla si es necesario
      await crearTablaEncuestas()

      // Insertar la encuesta
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `INSERT INTO encuestas_ciclo (
            id, usuario_id, duracion_ciclo, duracion_periodo, nivel_dolor, 
            estado_animo, flujo_menstrual, sintomas, fecha_creacion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            args: [
              { type: "text", value: encuestaId },
              { type: "text", value: usuarioId },
              { type: "text", value: duracionCicloRef.current },
              { type: "text", value: duracionPeriodoRef.current },
              { type: "text", value: nivelDolorRef.current },
              { type: "text", value: estadoAnimoRef.current || "" },
              { type: "text", value: flujoMenstrualRef.current || "" },
              { type: "text", value: sintomasRef.current || "" },
            ],
          },
        },
        { type: "close" },
      ]

      console.log("📤 Enviando solicitud de inserción")
      const resultado = await ejecutarPipeline(solicitudes)

      if (resultado.error) {
        console.error("❌ Error al guardar encuesta:", resultado.message)
        Alert.alert("Error", `No se pudo guardar la encuesta: ${resultado.message}. Intenta de nuevo más tarde.`)
        setCargando(false)
        return
      }

      // Procesar resultado normalmente...
      setEncuestaCompletada(true)
      setModalVisible(false)
      await cargarDatosGrafico(usuarioId)

      Alert.alert(
        encuestaCompletada ? "Encuesta actualizada" : "Encuesta guardada",
        "Gracias por completar la encuesta sobre tu ciclo menstrual.",
      )

      setCargando(false)
    } catch (error) {
      console.error("🔴 Error al guardar encuesta:", error)
      Alert.alert("Error", "No se pudo guardar la encuesta. Intenta de nuevo más tarde.")
      setCargando(false)
    }
  }

  // Métodos anticonceptivos
  const metodos = [
    {
      id: "barrera",
      titulo: "Métodos de barrera",
      icono: "shield",
      color: "#F06292",
      descripcion: "Condones, diafragmas y más",
    },
    {
      id: "hormonales",
      titulo: "Hormonales",
      icono: "droplet",
      color: "#EC407A",
      descripcion: "Píldoras, parches, anillos",
    },
  ]

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedorCargando}>
        <ActivityIndicator size="large" color="#F06292" />
        <Text style={estilos.textoCargando}>Cargando...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />

      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <View>
          <Text style={estilos.tituloApp}>FertiControl</Text>
          <Text style={estilos.subtituloApp}>Tu guía anticonceptiva personal</Text>
        </View>

        <TouchableOpacity style={estilos.botonPerfil} onPress={navegarAPerfil}>
          <Feather name="user" size={20} color="#F06292" />
        </TouchableOpacity>
      </View>

      <ScrollView style={estilos.contenido} showsVerticalScrollIndicator={false}>
        {/* Indicador de estado de conexión */}
        {errorConexion && (
          <TouchableOpacity style={estilos.bannerError} onPress={reintentarConexion}>
            <Feather name="wifi-off" size={20} color="#FFFFFF" />
            <Text style={estilos.textoBannerError}>Sin conexión a la base de datos. Toca para reintentar.</Text>
          </TouchableOpacity>
        )}

        {/* Sección de bienvenida */}
        <View style={estilos.seccionBienvenida}>
          <Text style={estilos.textoBienvenida}>
            Hola, <Text style={estilos.nombreUsuario}>{nombreUsuario}</Text>
          </Text>
        </View>

        {/* Sección de encuesta */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <Text style={estilos.tituloTarjeta}>Encuesta sobre tu ciclo</Text>
          </View>

          {encuestaCompletada ? (
            <View>
              <View style={estilos.encuestaCompletada}>
                <View style={estilos.estadoEncuesta}>
                  <Feather name="check-circle" size={24} color="#4CAF50" />
                  <Text style={estilos.textoEncuestaCompletada}>Encuesta completada</Text>
                </View>
              </View>
              <TouchableOpacity style={estilos.botonModificarNuevo} onPress={() => setModalVisible(true)}>
                <Text style={estilos.textoBotonModificarNuevo}>Modificar respuestas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={estilos.encuestaPendiente}>
              <Text style={estilos.textoEncuestaPendiente}>
                Completa una breve encuesta sobre tu ciclo menstrual para personalizar tu experiencia
              </Text>
              <TouchableOpacity style={estilos.botonCompletar} onPress={() => setModalVisible(true)}>
                <Text style={estilos.textoBotonCompletar}>Completar encuesta</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sección de datos del ciclo - Versión texto */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <Text style={estilos.tituloTarjeta}>Datos de tu ciclo</Text>
          </View>

          <View style={estilos.contenedorDatosCiclo}>
            <Text style={estilos.subtituloDatosCiclo}>Promedio de ciclos de las encuestas</Text>

            {/* Datos en formato texto */}
            <View style={estilos.listaDatosCiclo}>
              {datosGrafico.labels.map((mes, index) => (
                <View key={index} style={estilos.itemDatoCiclo}>
                  <Text style={estilos.mesDatoCiclo}>{mes}:</Text>
                  <Text style={estilos.valorDatoCiclo}>{datosGrafico.valores[index]} días</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={estilos.leyendaGrafico}>
            {encuestaCompletada
              ? "Esto nos ayuda a mejorar nuestros resultados de cálculo"
              : "Completa la encuesta para ayudarnos a mejorar nuestros cálculos"}
          </Text>
        </View>

        {/* Sección de métodos anticonceptivos */}
        <Text style={estilos.tituloSeccion}>Métodos anticonceptivos</Text>
        <Text style={estilos.descripcionSeccion}>
          Selecciona un método para ver sus recomendaciones y efectos secundarios
        </Text>

        <View style={estilos.contenedorMetodos}>
          {metodos.map((metodo) => (
            <TouchableOpacity
              key={metodo.id}
              style={estilos.tarjetaMetodo}
              onPress={() => {
                console.log(`Método seleccionado: ${metodo.id}`)
                if (metodo.id === "barrera" && navegarAMetodosBarrera) {
                  console.log("Navegando a Métodos de Barrera")
                  navegarAMetodosBarrera()
                } else if (metodo.id === "hormonales" && navegarAMetodosHormonales) {
                  console.log("Navegando a Métodos Hormonales")
                  navegarAMetodosHormonales()
                }
              }}
            >
              <View style={[estilos.iconoMetodo, { backgroundColor: metodo.color }]}>
                <Feather name={metodo.icono} size={24} color="#FFFFFF" />
              </View>
              <Text style={estilos.tituloMetodo}>{metodo.titulo}</Text>
              <Text style={estilos.descripcionMetodo}>{metodo.descripcion}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sección de información de ETS */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <Text style={estilos.tituloTarjeta}>Información de ETS</Text>
          </View>

          <TouchableOpacity style={estilos.etsItem} onPress={navegarAPrevencionETS}>
            <View style={[estilos.etsIcono, { backgroundColor: "#EC407A" }]}>
              <Feather name="info" size={20} color="#FFFFFF" />
            </View>
            <View style={estilos.etsInfo}>
              <Text style={estilos.etsTitulo}>Prevención de ETS</Text>
              <Text style={estilos.etsDescripcion}>
                Aprende sobre métodos efectivos para prevenir infecciones de transmisión sexual
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {/* Espacio adicional al final */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Barra de navegación inferior */}
      <View style={estilos.barraNavegacion}>
        <TouchableOpacity
          style={[estilos.botonNav, activeTab === "home" && estilos.botonNavActivo]}
          onPress={() => setActiveTab("home")}
        >
          <Feather name="home" size={24} color={activeTab === "home" ? "#F06292" : "#9E9E9E"} />
          <Text style={[estilos.textoNav, activeTab === "home" && estilos.textoNavActivo]}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.botonNav, activeTab === "calendar" && estilos.botonNavActivo]}
          onPress={() => {
            setActiveTab("calendar")
            if (navegarACalendario) navegarACalendario()
          }}
        >
          <Feather name="calendar" size={24} color={activeTab === "calendar" ? "#F06292" : "#9E9E9E"} />
          <Text style={[estilos.textoNav, activeTab === "calendar" && estilos.textoNavActivo]}>Calendario</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.botonNav, activeTab === "community" && estilos.botonNavActivo]}
          onPress={() => {
            setActiveTab("community")
            if (navegarAComunidad) navegarAComunidad()
          }}
        >
          <Feather name="users" size={24} color={activeTab === "community" ? "#F06292" : "#9E9E9E"} />
          <Text style={[estilos.textoNav, activeTab === "community" && estilos.textoNavActivo]}>Comunidad</Text>
        </TouchableOpacity>
      </View>

      {/* Modal para la encuesta */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={estilos.centrarModal}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={estilos.contenidoModal}>
              <ScrollView
                style={estilos.scrollFormulario}
                contentContainerStyle={estilos.contenedorScrollFormulario}
                keyboardShouldPersistTaps="handled"
              >
                <View style={estilos.formularioEncuesta}>
                  <Text style={estilos.tituloFormulario}>Encuesta sobre tu ciclo menstrual</Text>

                  <View style={estilos.campoFormulario}>
                    <Text style={estilos.etiquetaCampo}>Duración promedio de tu ciclo (días) *</Text>
                    <TextInput
                      style={estilos.inputFormulario}
                      defaultValue={duracionCicloRef.current}
                      onChangeText={(text) => {
                        duracionCicloRef.current = text
                        // Validación en tiempo real opcional
                        const valor = Number.parseInt(text, 10)
                        if (text && (isNaN(valor) || valor < 21 || valor > 40)) {
                          // Puedes mostrar un indicador visual de error si lo deseas
                        }
                      }}
                      placeholder="Ej: 28 (entre 21-40 días)"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={estilos.textoAyuda}>El ciclo normal dura entre 21 y 40 días</Text>
                  </View>

                  <View style={estilos.campoFormulario}>
                    <Text style={estilos.etiquetaCampo}>Duración promedio de tu periodo (días) *</Text>
                    <TextInput
                      style={estilos.inputFormulario}
                      defaultValue={duracionPeriodoRef.current}
                      onChangeText={(text) => {
                        duracionPeriodoRef.current = text
                        // Validación en tiempo real opcional
                        const valor = Number.parseInt(text, 10)
                        if (text && (isNaN(valor) || valor < 2 || valor > 10)) {
                          // Puedes mostrar un indicador visual de error si lo deseas
                        }
                      }}
                      placeholder="Ej: 5 (entre 2-10 días)"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={estilos.textoAyuda}>El periodo normal dura entre 2 y 10 días</Text>
                  </View>

                  <View style={estilos.campoFormulario}>
                    <Text style={estilos.etiquetaCampo}>Nivel de dolor (1-10) *</Text>
                    <TextInput
                      style={estilos.inputFormulario}
                      defaultValue={nivelDolorRef.current}
                      onChangeText={(text) => {
                        nivelDolorRef.current = text
                        // Validación en tiempo real opcional
                        const valor = Number.parseInt(text, 10)
                        if (text && (isNaN(valor) || valor < 1 || valor > 10)) {
                          // Puedes mostrar un indicador visual de error si lo deseas
                        }
                      }}
                      placeholder="Ej: 6 (entre 1-10)"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={estilos.textoAyuda}>1 = sin dolor, 10 = dolor extremo</Text>
                  </View>

                  <View style={estilos.campoFormulario}>
                    <Text style={estilos.etiquetaCampo}>Estado de ánimo predominante</Text>
                    <TextInput
                      style={estilos.inputFormulario}
                      defaultValue={estadoAnimoRef.current}
                      onChangeText={(text) => (estadoAnimoRef.current = text)}
                      placeholder="Ej: Irritable, Tranquila, etc."
                    />
                  </View>

                  <View style={estilos.campoFormulario}>
                    <Text style={estilos.etiquetaCampo}>Flujo menstrual</Text>
                    <TextInput
                      style={estilos.inputFormulario}
                      defaultValue={flujoMenstrualRef.current}
                      onChangeText={(text) => (flujoMenstrualRef.current = text)}
                      placeholder="Ej: Ligero, Moderado, Abundante"
                    />
                  </View>

                  <View style={estilos.campoFormulario}>
                    <Text style={estilos.etiquetaCampo}>Síntomas principales</Text>
                    <TextInput
                      style={[estilos.inputFormulario, estilos.inputMultilinea]}
                      defaultValue={sintomasRef.current}
                      onChangeText={(text) => (sintomasRef.current = text)}
                      placeholder="Ej: Dolor de cabeza, hinchazón, etc."
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <Text style={estilos.notaFormulario}>* Campos obligatorios</Text>

                  <View style={estilos.botonesFormulario}>
                    <TouchableOpacity
                      style={[estilos.botonFormulario, estilos.botonCancelar]}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[estilos.botonFormulario, estilos.botonGuardar]} onPress={guardarEncuesta}>
                      <Text style={estilos.textoBotonGuardar}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#FFF5F7",
  },
  contenedorCargando: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF5F7",
  },
  textoCargando: {
    marginTop: 10,
    color: "#F06292",
    fontSize: 16,
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
  seccionBienvenida: {
    marginBottom: 20,
  },
  textoBienvenida: {
    fontSize: 18,
    color: "#424242",
  },
  nombreUsuario: {
    fontWeight: "bold",
    color: "#F06292",
  },
  encuestaCompletada: {
    backgroundColor: "#F1F8E9",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  estadoEncuesta: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoEncuestaCompletada: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  botonModificar: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  textoBotonModificar: {
    fontSize: 12,
    color: "#757575",
  },
  encuestaPendiente: {
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 15,
  },
  textoEncuestaPendiente: {
    fontSize: 14,
    color: "#424242",
    marginBottom: 12,
    lineHeight: 20,
  },
  botonCompletar: {
    backgroundColor: "#F06292",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  textoBotonCompletar: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 14,
  },
  tarjeta: {
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
  encabezadoTarjeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tituloTarjeta: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#424242",
  },
  contenedorGrafico: {
    alignItems: "center",
    marginVertical: 10,
  },
  leyendaGrafico: {
    fontSize: 12,
    color: "#757575",
    textAlign: "center",
    marginTop: 5,
    fontStyle: "italic",
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 5,
  },
  descripcionSeccion: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 15,
  },
  contenedorMetodos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  tarjetaMetodo: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  iconoMetodo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  tituloMetodo: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 6,
  },
  descripcionMetodo: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  etsItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
  },
  etsIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  etsInfo: {
    flex: 1,
  },
  etsTitulo: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
  },
  etsDescripcion: {
    fontSize: 12,
    color: "#757575",
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
  // Estilos para el modal y formulario
  centrarModal: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  contenidoModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollFormulario: {
    width: "100%",
  },
  formularioEncuesta: {
    width: "100%",
  },
  tituloFormulario: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F06292",
    marginBottom: 15,
    textAlign: "center",
  },
  campoFormulario: {
    marginBottom: 15,
  },
  etiquetaCampo: {
    fontSize: 14,
    color: "#424242",
    marginBottom: 5,
  },
  inputFormulario: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#424242",
    backgroundColor: "#F9F9F9",
  },
  inputMultilinea: {
    height: 80,
    textAlignVertical: "top",
  },
  notaFormulario: {
    fontSize: 12,
    color: "#9E9E9E",
    marginBottom: 15,
    fontStyle: "italic",
  },
  botonesFormulario: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  botonFormulario: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  botonCancelar: {
    backgroundColor: "#F5F5F5",
    marginRight: 10,
  },
  botonGuardar: {
    backgroundColor: "#F06292",
    marginLeft: 10,
  },
  textoBotonCancelar: {
    color: "#757575",
    fontWeight: "500",
  },
  textoBotonGuardar: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  botonModificarNuevo: {
    backgroundColor: "#F06292",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
    marginHorizontal: 15,
  },
  textoBotonModificarNuevo: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 14,
    textAlign: "center",
  },
  contenedorScrollFormulario: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contenedorDatosCiclo: {
    padding: 10,
  },
  subtituloDatosCiclo: {
    fontSize: 14,
    fontWeight: "500",
    color: "#F06292",
    marginBottom: 10,
    textAlign: "center",
  },
  listaDatosCiclo: {
    backgroundColor: "#FFF5F7",
    borderRadius: 8,
    padding: 10,
  },
  itemDatoCiclo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F8BBD0",
  },
  mesDatoCiclo: {
    fontSize: 14,
    color: "#616161",
    fontWeight: "500",
  },
  valorDatoCiclo: {
    fontSize: 14,
    color: "#F06292",
    fontWeight: "bold",
  },
  mensajeError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  textoError: {
    color: "#D32F2F",
    fontSize: 12,
    marginLeft: 8,
  },
  textoAyuda: {
    fontSize: 11,
    color: "#9E9E9E",
    marginTop: 2,
    fontStyle: "italic",
  },
  bannerError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D32F2F",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  textoBannerError: {
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
})

export default PantallaHome
