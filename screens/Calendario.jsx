import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales["es"] = {
  monthNames: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  monthNamesShort: ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."],
  dayNames: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  dayNamesShort: ["Dom.", "Lun.", "Mar.", "Mié.", "Jue.", "Vie.", "Sáb."],
  today: "Hoy",
}
LocaleConfig.defaultLocale = "es"


const HTTP_URL = Constants.expoConfig.extra.HTTP_URL;
const AUTH_TOKEN = Constants.expoConfig.extra.AUTH_TOKEN;

async function ejecutarPipeline(solicitudes) {
  const carga = { baton: null, requests: solicitudes }
  console.log("📤 Payload Turso:", JSON.stringify(carga, null, 2))

  try {
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
  } catch (error) {
    console.error("🔴 Error en la conexión con Turso:", error)
    throw error
  }
}

// Función para crear la tabla de ciclos menstruales si no existe
async function crearTablaCiclosMenstruales() {
  try {
    const solicitudes = [
      {
        type: "execute",
        stmt: {
          sql: `CREATE TABLE IF NOT EXISTS ciclos_menstruales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER NOT NULL,
            fecha_inicio TEXT NOT NULL,
            fecha_fin TEXT,
            duracion INTEGER,
            sintomas TEXT,
            estado_animo TEXT,
            flujo TEXT,
            notas TEXT,
            FOREIGN KEY (id_usuario) REFERENCES Registros(id)
          )`,
        },
      },
      { type: "close" },
    ]

    await ejecutarPipeline(solicitudes)
    console.log("✅ Tabla ciclos_menstruales creada o verificada correctamente")
  } catch (error) {
    console.error("🔴 Error al crear tabla ciclos_menstruales:", error)
    Alert.alert("Error", "No se pudo configurar la base de datos para el calendario menstrual.")
  }
}

// Modificamos la declaración del componente para recibir directamente las funciones de navegación
const PantallaCalendario = ({ navegarAMain, navegarAComunidad, navegarAPerfil }) => {
  const [activeTab, setActiveTab] = useState("calendar")
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [ciclosMenstruales, setCiclosMenstruales] = useState([])
  const [marcasFechas, setMarcasFechas] = useState({})
  const [fechaSeleccionada, setFechaSeleccionada] = useState("")
  const [modalRegistro, setModalRegistro] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [detallesCiclo, setDetallesCiclo] = useState(null)
  const [nuevoCiclo, setNuevoCiclo] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    sintomas: "",
    estado_animo: "",
    flujo: "moderado",
    notas: "",
  })
  const [estadisticas, setEstadisticas] = useState({
    duracionPromedio: 0,
    longitudCicloPromedio: 0,
    regularidad: 0,
  })
  const [predicciones, setPredicciones] = useState([])
  const [modalSintomas, setModalSintomas] = useState(false)
  const [sintomasRegistro, setSintomasRegistro] = useState({
    dolor_cabeza: false,
    dolor_abdominal: false,
    dolor_espalda: false,
    nauseas: false,
    fatiga: false,
    hinchazon: false,
    antojos: false,
    cambios_humor: false,
    acne: false,
    sensibilidad_senos: false,
  })
  const [estadosAnimo, setEstadosAnimo] = useState({
    feliz: false,
    triste: false,
    irritable: false,
    ansiosa: false,
    cansada: false,
    energica: false,
    sensible: false,
    tranquila: false,
  })
  const [tiposFlujo, setTiposFlujo] = useState({
    ligero: false,
    moderado: true,
    abundante: false,
    manchado: false,
  })

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    cargarDatosUsuario()
    crearTablaCiclosMenstruales()
  }, [])

  // Función para cargar los datos del usuario desde AsyncStorage
  const cargarDatosUsuario = async () => {
    try {
      setCargando(true)
      const usuarioGuardado = await AsyncStorage.getItem("usuario")

      if (!usuarioGuardado) {
        console.log("🔴 No hay usuario guardado en AsyncStorage")
        Alert.alert("Error", "No se encontró información de usuario. Por favor inicia sesión nuevamente.", [
          {
            text: "OK",
            onPress: () => {
              // Aquí deberíamos navegar a Login, pero como no tenemos esa función
              // como prop, no podemos hacerlo directamente
              console.log("Debería navegar a Login")
            },
          },
        ])
        return
      }

      const datosUsuario = JSON.parse(usuarioGuardado)
      setUsuario(datosUsuario)

      // Cargar ciclos menstruales del usuario
      await cargarCiclosMenstruales(datosUsuario.id)
    } catch (error) {
      console.error("🔴 Error al cargar datos del usuario:", error)
      Alert.alert("Error", "No se pudieron cargar tus datos. Por favor intenta nuevamente.", [{ text: "OK" }])
    } finally {
      setCargando(false)
    }
  }

  // Función para cargar los ciclos menstruales del usuario
  const cargarCiclosMenstruales = async (idUsuario) => {
    try {
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT id, fecha_inicio, fecha_fin, duracion, sintomas, estado_animo, flujo, notas
                  FROM ciclos_menstruales
                  WHERE id_usuario = ?
                  ORDER BY fecha_inicio DESC`,
            args: [{ type: "text", value: String(idUsuario) }],
          },
        },
        { type: "close" },
      ]

      const respuesta = await ejecutarPipeline(solicitudes)

      // Adaptación para manejar diferentes estructuras de respuesta
      let ciclos = []
      if (respuesta.results && respuesta.results[0] && respuesta.results[0].response) {
        const filasRaw = respuesta.results[0].response.result.rows || []
        ciclos = filasRaw.map((fila) => ({
          id: fila[0].value,
          fecha_inicio: fila[1].value,
          fecha_fin: fila[2]?.value || "",
          duracion: fila[3]?.value || 0,
          sintomas: fila[4]?.value || "",
          estado_animo: fila[5]?.value || "",
          flujo: fila[6]?.value || "moderado",
          notas: fila[7]?.value || "",
        }))
      } else if (respuesta.responses && respuesta.responses[0] && respuesta.responses[0].result) {
        const filas = respuesta.responses[0].result.rows || []
        ciclos = filas
      }

      console.log("🟢 Ciclos menstruales cargados:", ciclos.length)
      setCiclosMenstruales(ciclos)

      // Generar marcas para el calendario
      generarMarcasFechas(ciclos)

      // Calcular estadísticas
      calcularEstadisticas(ciclos)

      // Predecir próximos ciclos
      predecirProximosCiclos(ciclos)
    } catch (error) {
      console.error("🔴 Error al cargar ciclos menstruales:", error)
      Alert.alert("Error", "No se pudieron cargar tus datos de ciclo menstrual. Por favor intenta nuevamente.")
    }
  }

  // Función para generar las marcas de fechas para el calendario
  const generarMarcasFechas = (ciclos) => {
    const marcas = {}

    // Marcar días de período
    ciclos.forEach((ciclo) => {
      if (ciclo.fecha_inicio) {
        const fechaInicio = new Date(ciclo.fecha_inicio)
        let fechaFin

        if (ciclo.fecha_fin) {
          fechaFin = new Date(ciclo.fecha_fin)
        } else if (ciclo.duracion) {
          fechaFin = new Date(fechaInicio)
          fechaFin.setDate(fechaInicio.getDate() + ciclo.duracion - 1)
        } else {
          // Si no hay fecha fin ni duración, asumimos 5 días por defecto
          fechaFin = new Date(fechaInicio)
          fechaFin.setDate(fechaInicio.getDate() + 4) // 5 días en total
        }

        // Marcar todos los días del período
        const fechaActual = new Date(fechaInicio)
        while (fechaActual <= fechaFin) {
          const fechaFormateada = fechaActual.toISOString().split("T")[0]
          marcas[fechaFormateada] = {
            selected: true,
            selectedColor: "#F06292",
            marked: true,
            dotColor: "#F06292",
          }
          fechaActual.setDate(fechaActual.getDate() + 1)
        }
      }
    })

    // Marcar predicciones con un color diferente
    predicciones.forEach((prediccion) => {
      const fechaInicio = new Date(prediccion.fecha_inicio)
      const fechaFin = new Date(prediccion.fecha_fin)

      const fechaActual = new Date(fechaInicio)
      while (fechaActual <= fechaFin) {
        const fechaFormateada = fechaActual.toISOString().split("T")[0]
        marcas[fechaFormateada] = {
          selected: true,
          selectedColor: "#F8BBD0",
          marked: true,
          dotColor: "#F8BBD0",
        }
        fechaActual.setDate(fechaActual.getDate() + 1)
      }
    })

    setMarcasFechas(marcas)
  }

  // Función para calcular estadísticas basadas en los ciclos registrados
  const calcularEstadisticas = (ciclos) => {
    if (ciclos.length === 0) {
      setEstadisticas({
        duracionPromedio: 0,
        longitudCicloPromedio: 0,
        regularidad: 0,
      })
      return
    }

    // Calcular duración promedio del período
    let duracionTotal = 0
    let ciclosConDuracion = 0

    ciclos.forEach((ciclo) => {
      if (ciclo.duracion) {
        duracionTotal += ciclo.duracion
        ciclosConDuracion++
      } else if (ciclo.fecha_inicio && ciclo.fecha_fin) {
        const inicio = new Date(ciclo.fecha_inicio)
        const fin = new Date(ciclo.fecha_fin)
        const duracion = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)) + 1
        duracionTotal += duracion
        ciclosConDuracion++
      }
    })

    const duracionPromedio = ciclosConDuracion > 0 ? Math.round(duracionTotal / ciclosConDuracion) : 0

    // Calcular longitud promedio del ciclo (de inicio a inicio)
    let longitudTotal = 0
    let ciclosConLongitud = 0

    for (let i = 0; i < ciclos.length - 1; i++) {
      const inicioActual = new Date(ciclos[i].fecha_inicio)
      const inicioAnterior = new Date(ciclos[i + 1].fecha_inicio)
      const longitud = Math.floor((inicioActual - inicioAnterior) / (1000 * 60 * 60 * 24))
      if (longitud > 0 && longitud < 60) {
        // Filtrar valores atípicos
        longitudTotal += longitud
        ciclosConLongitud++
      }
    }

    const longitudCicloPromedio = ciclosConLongitud > 0 ? Math.round(longitudTotal / ciclosConLongitud) : 28 // Valor por defecto

    // Calcular regularidad (qué tan consistente es la longitud del ciclo)
    const variaciones = []
    for (let i = 0; i < ciclos.length - 1; i++) {
      const inicioActual = new Date(ciclos[i].fecha_inicio)
      const inicioAnterior = new Date(ciclos[i + 1].fecha_inicio)
      const longitud = Math.floor((inicioActual - inicioAnterior) / (1000 * 60 * 60 * 24))
      if (longitud > 0 && longitud < 60) {
        variaciones.push(Math.abs(longitud - longitudCicloPromedio))
      }
    }

    const variacionPromedio =
      variaciones.length > 0 ? variaciones.reduce((sum, val) => sum + val, 0) / variaciones.length : 0
    const regularidad = Math.max(0, 100 - variacionPromedio * 10) // Convertir a porcentaje

    setEstadisticas({
      duracionPromedio,
      longitudCicloPromedio,
      regularidad: Math.round(regularidad),
    })
  }

  // Función para predecir los próximos ciclos menstruales
  const predecirProximosCiclos = (ciclos) => {
    if (ciclos.length === 0) {
      setPredicciones([])
      return
    }

    // Calcular longitud promedio del ciclo
    let longitudTotal = 0
    let ciclosConLongitud = 0

    for (let i = 0; i < ciclos.length - 1; i++) {
      const inicioActual = new Date(ciclos[i].fecha_inicio)
      const inicioAnterior = new Date(ciclos[i + 1].fecha_inicio)
      const longitud = Math.floor((inicioActual - inicioAnterior) / (1000 * 60 * 60 * 24))
      if (longitud > 0 && longitud < 60) {
        // Filtrar valores atípicos
        longitudTotal += longitud
        ciclosConLongitud++
      }
    }

    const longitudCicloPromedio = ciclosConLongitud > 0 ? Math.round(longitudTotal / ciclosConLongitud) : 28 // Valor por defecto

    // Calcular duración promedio del período
    let duracionTotal = 0
    let ciclosConDuracion = 0

    ciclos.forEach((ciclo) => {
      if (ciclo.duracion) {
        duracionTotal += ciclo.duracion
        ciclosConDuracion++
      } else if (ciclo.fecha_inicio && ciclo.fecha_fin) {
        const inicio = new Date(ciclo.fecha_inicio)
        const fin = new Date(ciclo.fecha_fin)
        const duracion = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)) + 1
        duracionTotal += duracion
        ciclosConDuracion++
      }
    })

    const duracionPromedio = ciclosConDuracion > 0 ? Math.round(duracionTotal / ciclosConDuracion) : 5 // Valor por defecto

    // Predecir los próximos 3 ciclos
    const predicciones = []
    const ultimoCiclo = ciclos[0] // El más reciente
    let ultimaFechaInicio = new Date(ultimoCiclo.fecha_inicio)

    for (let i = 0; i < 3; i++) {
      // Calcular próxima fecha de inicio
      const proximaFechaInicio = new Date(ultimaFechaInicio)
      proximaFechaInicio.setDate(proximaFechaInicio.getDate() + longitudCicloPromedio)

      // Calcular fecha de fin
      const proximaFechaFin = new Date(proximaFechaInicio)
      proximaFechaFin.setDate(proximaFechaInicio.getDate() + duracionPromedio - 1)

      // Formatear fechas
      const fechaInicioFormateada = proximaFechaInicio.toISOString().split("T")[0]
      const fechaFinFormateada = proximaFechaFin.toISOString().split("T")[0]

      predicciones.push({
        fecha_inicio: fechaInicioFormateada,
        fecha_fin: fechaFinFormateada,
        duracion: duracionPromedio,
        prediccion: true,
      })

      ultimaFechaInicio = proximaFechaInicio
    }

    setPredicciones(predicciones)

    // Actualizar marcas del calendario con las predicciones
    generarMarcasFechas([...ciclos, ...predicciones])
  }

  // Función para registrar un nuevo ciclo menstrual
  const registrarCicloMenstrual = async () => {
    try {
      if (!nuevoCiclo.fecha_inicio) {
        Alert.alert("Campo requerido", "Por favor selecciona la fecha de inicio del período.")
        return
      }

      // Calcular duración si hay fecha de fin
      let duracion = null
      if (nuevoCiclo.fecha_fin) {
        const inicio = new Date(nuevoCiclo.fecha_inicio)
        const fin = new Date(nuevoCiclo.fecha_fin)
        if (fin < inicio) {
          Alert.alert("Error", "La fecha de fin no puede ser anterior a la fecha de inicio.")
          return
        }
        duracion = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)) + 1
      }

      // Preparar síntomas como JSON string
      const sintomasSeleccionados = Object.entries(sintomasRegistro)
        .filter(([_, valor]) => valor)
        .map(([sintoma]) => sintoma)
        .join(", ")

      // Preparar estados de ánimo como JSON string
      const animosSeleccionados = Object.entries(estadosAnimo)
        .filter(([_, valor]) => valor)
        .map(([animo]) => animo)
        .join(", ")

      // Obtener flujo seleccionado
      const flujoSeleccionado = Object.entries(tiposFlujo)
        .filter(([_, valor]) => valor)
        .map(([flujo]) => flujo)[0]

      // Insertar en la base de datos
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `INSERT INTO ciclos_menstruales 
                  (id_usuario, fecha_inicio, fecha_fin, duracion, sintomas, estado_animo, flujo, notas) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              { type: "text", value: String(usuario.id) },
              { type: "text", value: nuevoCiclo.fecha_inicio },
              nuevoCiclo.fecha_fin ? { type: "text", value: nuevoCiclo.fecha_fin } : { type: "null" },
              duracion !== null ? { type: "integer", value: duracion } : { type: "null" },
              { type: "text", value: sintomasSeleccionados },
              { type: "text", value: animosSeleccionados },
              { type: "text", value: flujoSeleccionado || "moderado" },
              { type: "text", value: nuevoCiclo.notas || "" },
            ],
          },
        },
        { type: "close" },
      ]

      await ejecutarPipeline(solicitudes)

      // Limpiar formulario y cerrar modal
      setNuevoCiclo({
        fecha_inicio: "",
        fecha_fin: "",
        sintomas: "",
        estado_animo: "",
        flujo: "moderado",
        notas: "",
      })
      setSintomasRegistro({
        dolor_cabeza: false,
        dolor_abdominal: false,
        dolor_espalda: false,
        nauseas: false,
        fatiga: false,
        hinchazon: false,
        antojos: false,
        cambios_humor: false,
        acne: false,
        sensibilidad_senos: false,
      })
      setEstadosAnimo({
        feliz: false,
        triste: false,
        irritable: false,
        ansiosa: false,
        cansada: false,
        energica: false,
        sensible: false,
        tranquila: false,
      })
      setTiposFlujo({
        ligero: false,
        moderado: true,
        abundante: false,
        manchado: false,
      })
      setModalRegistro(false)
      setModalSintomas(false)

      // Recargar ciclos menstruales
      await cargarCiclosMenstruales(usuario.id)

      Alert.alert("¡Registro exitoso!", "Tu período ha sido registrado correctamente.")
    } catch (error) {
      console.error("🔴 Error al registrar ciclo menstrual:", error)
      Alert.alert("Error", "No se pudo registrar tu período. Por favor intenta nuevamente.")
    }
  }

  // Función para mostrar detalles de un ciclo menstrual
  const mostrarDetallesCiclo = (fecha) => {
    // Buscar si hay un ciclo registrado en esa fecha
    const cicloEnFecha = ciclosMenstruales.find((ciclo) => {
      const fechaInicio = new Date(ciclo.fecha_inicio)
      let fechaFin

      if (ciclo.fecha_fin) {
        fechaFin = new Date(ciclo.fecha_fin)
      } else if (ciclo.duracion) {
        fechaFin = new Date(fechaInicio)
        fechaFin.setDate(fechaInicio.getDate() + ciclo.duracion - 1)
      } else {
        // Si no hay fecha fin ni duración, asumimos 5 días por defecto
        fechaFin = new Date(fechaInicio)
        fechaFin.setDate(fechaInicio.getDate() + 4) // 5 días en total
      }

      const fechaSeleccionadaObj = new Date(fecha)
      return fechaSeleccionadaObj >= fechaInicio && fechaSeleccionadaObj <= fechaFin
    })

    // Buscar si hay una predicción en esa fecha
    const prediccionEnFecha = predicciones.find((prediccion) => {
      const fechaInicio = new Date(prediccion.fecha_inicio)
      const fechaFin = new Date(prediccion.fecha_fin)
      const fechaSeleccionadaObj = new Date(fecha)
      return fechaSeleccionadaObj >= fechaInicio && fechaSeleccionadaObj <= fechaFin
    })

    if (cicloEnFecha) {
      setDetallesCiclo({
        ...cicloEnFecha,
        esPeriodo: true,
        esPrediccion: false,
      })
      setModalDetalle(true)
    } else if (prediccionEnFecha) {
      setDetallesCiclo({
        ...prediccionEnFecha,
        esPeriodo: true,
        esPrediccion: true,
      })
      setModalDetalle(true)
    } else {
      // No hay ciclo ni predicción en esta fecha
      setDetallesCiclo({
        fecha: fecha,
        esPeriodo: false,
        esPrediccion: false,
      })
      setModalDetalle(true)
    }
  }

  // Función para formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return ""

    try {
      const fechaObj = new Date(fecha)
      return fechaObj.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error al formatear fecha:", error)
      return fecha
    }
  }

  // Funciones de navegación simplificadas
  // Estas funciones ahora utilizan directamente las props recibidas
  const handleNavegacionInicio = () => {
    console.log("Navegando a Inicio")
    if (typeof navegarAMain === "function") {
      navegarAMain()
    } else {
      console.error("La función navegarAMain no está disponible")
    }
  }

  const handleNavegacionComunidad = () => {
    console.log("Navegando a Comunidad")
    if (typeof navegarAComunidad === "function") {
      navegarAComunidad()
    } else {
      console.error("La función navegarAComunidad no está disponible")
    }
  }

  const handleNavegacionPerfil = () => {
    console.log("Navegando a Perfil")
    if (typeof navegarAPerfil === "function") {
      navegarAPerfil()
    } else {
      console.error("La función navegarAPerfil no está disponible")
    }
  }

  // Renderizar pantalla de carga
  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />
        <View style={estilos.contenedorCargando}>
          <ActivityIndicator size="large" color="#F06292" />
          <Text style={estilos.textoCargando}>Cargando tu calendario menstrual...</Text>
        </View>
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
          <Text style={estilos.subtituloApp}>Calendario menstrual</Text>
        </View>
        <TouchableOpacity style={estilos.botonPerfil} onPress={handleNavegacionPerfil}>
          <Feather name="user" size={20} color="#F06292" />
        </TouchableOpacity>
      </View>

      <ScrollView style={estilos.contenido} showsVerticalScrollIndicator={false}>
        {/* Sección de bienvenida personalizada */}
        {usuario && (
          <View style={estilos.tarjetaBienvenida}>
            <View style={estilos.encabezadoBienvenida}>
              <View style={estilos.avatarBienvenida}>
                <Text style={estilos.textoAvatarBienvenida}>
                  {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
              <View style={estilos.infoBienvenida}>
                <Text style={estilos.tituloBienvenida}>
                  {(() => {
                    const hora = new Date().getHours()
                    if (hora >= 5 && hora < 12) return "¡Buenos días"
                    else if (hora >= 12 && hora < 19) return "¡Buenas tardes"
                    else return "¡Buenas noches"
                  })()}, {usuario.nombre}!
                </Text>
                <Text style={estilos.subtituloBienvenida}>Tu calendario menstrual</Text>
              </View>
            </View>

            <View style={estilos.resumenCiclo}>
              {predicciones.length > 0 ? (
                <View style={estilos.estadoCiclo}>
                  <Feather name="calendar" size={20} color="#F06292" />
                  <Text style={estilos.textoEstadoCiclo}>
                    Tu próximo período comienza el {formatearFecha(predicciones[0]?.fecha_inicio)}
                  </Text>
                </View>
              ) : (
                <View style={estilos.estadoCiclo}>
                  <Feather name="info" size={20} color="#F06292" />
                  <Text style={estilos.textoEstadoCiclo}>Registra tu período para ver predicciones</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Sección de calendario */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <Text style={estilos.tituloTarjeta}>Calendario</Text>
            <View style={estilos.leyendaCalendario}>
              <View style={estilos.itemLeyenda}>
                <View style={[estilos.puntoLeyenda, { backgroundColor: "#F06292" }]} />
                <Text style={estilos.textoLeyenda}>Período registrado</Text>
              </View>
              <View style={estilos.itemLeyenda}>
                <View style={[estilos.puntoLeyenda, { backgroundColor: "#F8BBD0" }]} />
                <Text style={estilos.textoLeyenda}>Predicción</Text>
              </View>
            </View>
          </View>

          <Calendar
            current={new Date().toISOString().split("T")[0]}
            onDayPress={(day) => {
              setFechaSeleccionada(day.dateString)
              mostrarDetallesCiclo(day.dateString)
            }}
            markedDates={marcasFechas}
            theme={{
              calendarBackground: "#FFFFFF",
              textSectionTitleColor: "#F06292",
              selectedDayBackgroundColor: "#F06292",
              selectedDayTextColor: "#FFFFFF",
              todayTextColor: "#F06292",
              dayTextColor: "#424242",
              textDisabledColor: "#BDBDBD",
              dotColor: "#F06292",
              selectedDotColor: "#FFFFFF",
              arrowColor: "#F06292",
              monthTextColor: "#424242",
              indicatorColor: "#F06292",
              textDayFontWeight: "300",
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "500",
            }}
          />

          <TouchableOpacity
            style={estilos.botonRegistrar}
            onPress={() => {
              setNuevoCiclo({
                ...nuevoCiclo,
                fecha_inicio: new Date().toISOString().split("T")[0],
              })
              setModalRegistro(true)
            }}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={estilos.textoBotonRegistrar}>Registrar período</Text>
          </TouchableOpacity>
        </View>

        {/* Sección de estadísticas */}
        <View style={estilos.tarjeta}>
          <Text style={estilos.tituloTarjeta}>Estadísticas de tu ciclo</Text>

          <View style={estilos.estadisticasContainer}>
            <View style={estilos.estadisticaItem}>
              <Text style={estilos.valorEstadistica}>{estadisticas.duracionPromedio}</Text>
              <Text style={estilos.labelEstadistica}>Días de período</Text>
            </View>

            <View style={estilos.estadisticaItem}>
              <Text style={estilos.valorEstadistica}>{estadisticas.longitudCicloPromedio}</Text>
              <Text style={estilos.labelEstadistica}>Días de ciclo</Text>
            </View>

            <View style={estilos.estadisticaItem}>
              <Text style={estilos.valorEstadistica}>{estadisticas.regularidad}%</Text>
              <Text style={estilos.labelEstadistica}>Regularidad</Text>
            </View>
          </View>

          {/* Reemplazamos los gráficos con información textual */}
          <View style={estilos.seccionEstadisticasTexto}>
            <Text style={estilos.tituloEstadisticasTexto}>Resumen de tus últimos ciclos</Text>

            {ciclosMenstruales.length > 0 ? (
              <View style={estilos.contenedorEstadisticasTexto}>
                <Text style={estilos.textoEstadisticas}>
                  Has registrado {ciclosMenstruales.length} ciclo(s) menstrual(es).
                </Text>
                <Text style={estilos.textoEstadisticas}>
                  Tu último período comenzó el {formatearFecha(ciclosMenstruales[0]?.fecha_inicio)}.
                </Text>
                <Text style={estilos.textoEstadisticas}>
                  La duración promedio de tu período es de {estadisticas.duracionPromedio} días.
                </Text>
                <Text style={estilos.textoEstadisticas}>
                  Tu ciclo menstrual dura aproximadamente {estadisticas.longitudCicloPromedio} días.
                </Text>
              </View>
            ) : (
              <Text style={estilos.textoSinDatos}>
                Aún no has registrado ningún ciclo menstrual. Registra tu período para ver estadísticas.
              </Text>
            )}
          </View>

          {/* Sección de síntomas más comunes */}
          {ciclosMenstruales.length > 0 && (
            <View style={estilos.seccionEstadisticasTexto}>
              <Text style={estilos.tituloEstadisticasTexto}>Síntomas más frecuentes</Text>
              <View style={estilos.contenedorSintomas}>
                {["dolor_cabeza", "dolor_abdominal", "fatiga", "hinchazon", "antojos"].map((sintoma) => {
                  const count = ciclosMenstruales.filter((c) => c.sintomas && c.sintomas.includes(sintoma)).length
                  const porcentaje = Math.round((count / ciclosMenstruales.length) * 100)

                  let nombreSintoma = ""
                  switch (sintoma) {
                    case "dolor_cabeza":
                      nombreSintoma = "Dolor de cabeza"
                      break
                    case "dolor_abdominal":
                      nombreSintoma = "Dolor abdominal"
                      break
                    case "fatiga":
                      nombreSintoma = "Fatiga"
                      break
                    case "hinchazon":
                      nombreSintoma = "Hinchazón"
                      break
                    case "antojos":
                      nombreSintoma = "Antojos"
                      break
                    default:
                      nombreSintoma = sintoma
                  }

                  return (
                    <View key={sintoma} style={estilos.itemSintoma}>
                      <Text style={estilos.nombreSintoma}>{nombreSintoma}</Text>
                      <View style={estilos.barraProgreso}>
                        <View
                          style={[estilos.progresoSintoma, { width: `${porcentaje}%`, backgroundColor: "#F06292" }]}
                        />
                      </View>
                      <Text style={estilos.porcentajeSintoma}>{porcentaje}%</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}
        </View>

        {/* Sección de próximos períodos */}
        <View style={estilos.tarjeta}>
          <Text style={estilos.tituloTarjeta}>Próximos períodos</Text>

          {predicciones.length > 0 ? (
            <View style={estilos.listaPredicciones}>
              {predicciones.map((prediccion, index) => (
                <View key={index} style={estilos.itemPrediccion}>
                  <View style={estilos.iconoPrediccion}>
                    <Feather name="calendar" size={20} color="#FFFFFF" />
                  </View>
                  <View style={estilos.infoPrediccion}>
                    <Text style={estilos.fechaPrediccion}>
                      {formatearFecha(prediccion.fecha_inicio)} - {formatearFecha(prediccion.fecha_fin)}
                    </Text>
                    <Text style={estilos.duracionPrediccion}>Duración estimada: {prediccion.duracion} días</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={estilos.mensajeVacio}>
              <Feather name="calendar" size={40} color="#F8BBD0" />
              <Text style={estilos.textoMensajeVacio}>Registra al menos un período para ver predicciones futuras</Text>
            </View>
          )}
        </View>

        {/* Sección de consejos */}
        <View style={estilos.tarjeta}>
          <Text style={estilos.tituloTarjeta}>Consejos para tu bienestar</Text>

          <View style={estilos.consejo}>
            <View style={estilos.iconoConsejo}>
              <Feather name="heart" size={20} color="#FFFFFF" />
            </View>
            <View style={estilos.contenidoConsejo}>
              <Text style={estilos.tituloConsejo}>Alivio de cólicos menstruales</Text>
              <Text style={estilos.textoConsejo}>
                Aplica calor en el abdomen bajo, realiza ejercicios suaves como yoga o caminatas, y mantente hidratada.
              </Text>
            </View>
          </View>

          <View style={estilos.consejo}>
            <View style={[estilos.iconoConsejo, { backgroundColor: "#9C27B0" }]}>
              <Feather name="coffee" size={20} color="#FFFFFF" />
            </View>
            <View style={estilos.contenidoConsejo}>
              <Text style={estilos.tituloConsejo}>Alimentación durante el período</Text>
              <Text style={estilos.textoConsejo}>
                Consume alimentos ricos en hierro como espinacas y lentejas. Evita el exceso de cafeína y sal que pueden
                aumentar la hinchazón.
              </Text>
            </View>
          </View>

          <View style={estilos.consejo}>
            <View style={[estilos.iconoConsejo, { backgroundColor: "#4CAF50" }]}>
              <Feather name="activity" size={20} color="#FFFFFF" />
            </View>
            <View style={estilos.contenidoConsejo}>
              <Text style={estilos.tituloConsejo}>Ejercicio y descanso</Text>
              <Text style={estilos.textoConsejo}>
                El ejercicio moderado puede ayudar a reducir los síntomas. Asegúrate de descansar lo suficiente durante
                estos días.
              </Text>
            </View>
          </View>
        </View>

        {/* Espacio adicional al final */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Barra de navegación inferior */}
      <View style={estilos.barraNavegacion}>
        <TouchableOpacity style={estilos.botonNav} onPress={handleNavegacionInicio}>
          <Feather name="home" size={24} color="#9E9E9E" />
          <Text style={estilos.textoNav}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[estilos.botonNav, estilos.botonNavActivo]}>
          <Feather name="calendar" size={24} color="#F06292" />
          <Text style={[estilos.textoNav, estilos.textoNavActivo]}>Calendario</Text>
        </TouchableOpacity>

        <TouchableOpacity style={estilos.botonNav} onPress={handleNavegacionComunidad}>
          <Feather name="users" size={24} color="#9E9E9E" />
          <Text style={estilos.textoNav}>Comunidad</Text>
        </TouchableOpacity>
      </View>

      {/* Modal para registrar período */}
      <Modal
        visible={modalRegistro}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalRegistro(false)}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.contenidoModal}>
            <View style={estilos.encabezadoModal}>
              <Text style={estilos.tituloModal}>Registrar período</Text>
              <TouchableOpacity style={estilos.botonCerrarModal} onPress={() => setModalRegistro(false)}>
                <Feather name="x" size={24} color="#9E9E9E" />
              </TouchableOpacity>
            </View>

            <ScrollView style={estilos.formularioModal}>
              <View style={estilos.campoFormulario}>
                <Text style={estilos.etiquetaCampo}>Fecha de inicio</Text>
                <TouchableOpacity
                  style={estilos.inputFecha}
                  onPress={() => {
                    // Aquí podrías abrir un DatePicker, pero por simplicidad usamos la fecha actual
                    setNuevoCiclo({
                      ...nuevoCiclo,
                      fecha_inicio: new Date().toISOString().split("T")[0],
                    })
                  }}
                >
                  <Text style={estilos.textoInputFecha}>
                    {nuevoCiclo.fecha_inicio ? formatearFecha(nuevoCiclo.fecha_inicio) : "Seleccionar fecha"}
                  </Text>
                  <Feather name="calendar" size={20} color="#F06292" />
                </TouchableOpacity>
              </View>

              <View style={estilos.campoFormulario}>
                <Text style={estilos.etiquetaCampo}>Fecha de fin (opcional)</Text>
                <TouchableOpacity
                  style={estilos.inputFecha}
                  onPress={() => {
                    // Aquí podrías abrir un DatePicker
                    if (nuevoCiclo.fecha_inicio) {
                      const fechaInicio = new Date(nuevoCiclo.fecha_inicio)
                      const fechaFin = new Date(fechaInicio)
                      fechaFin.setDate(fechaInicio.getDate() + 4) // 5 días por defecto
                      setNuevoCiclo({
                        ...nuevoCiclo,
                        fecha_fin: fechaFin.toISOString().split("T")[0],
                      })
                    }
                  }}
                >
                  <Text style={estilos.textoInputFecha}>
                    {nuevoCiclo.fecha_fin ? formatearFecha(nuevoCiclo.fecha_fin) : "Seleccionar fecha"}
                  </Text>
                  <Feather name="calendar" size={20} color="#F06292" />
                </TouchableOpacity>
              </View>

              <View style={estilos.campoFormulario}>
                <Text style={estilos.etiquetaCampo}>Síntomas y estado de ánimo</Text>
                <TouchableOpacity
                  style={estilos.botonSintomas}
                  onPress={() => {
                    setModalSintomas(true)
                    setModalRegistro(false)
                  }}
                >
                  <Text style={estilos.textoBotonSintomas}>Seleccionar síntomas</Text>
                  <Feather name="chevron-right" size={20} color="#F06292" />
                </TouchableOpacity>
              </View>

              <View style={estilos.campoFormulario}>
                <Text style={estilos.etiquetaCampo}>Notas adicionales</Text>
                <TextInput
                  style={[estilos.inputFormulario, estilos.inputMultilinea]}
                  placeholder="Escribe cualquier observación adicional..."
                  placeholderTextColor="#BDBDBD"
                  value={nuevoCiclo.notas}
                  onChangeText={(texto) => setNuevoCiclo({ ...nuevoCiclo, notas: texto })}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <TouchableOpacity style={estilos.botonGuardar} onPress={registrarCicloMenstrual}>
              <Text style={estilos.textoBotonGuardar}>Guardar registro</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar síntomas */}
      <Modal
        visible={modalSintomas}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setModalSintomas(false)
          setModalRegistro(true)
        }}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.contenidoModal}>
            <View style={estilos.encabezadoModal}>
              <Text style={estilos.tituloModal}>Síntomas y estado de ánimo</Text>
              <TouchableOpacity
                style={estilos.botonCerrarModal}
                onPress={() => {
                  setModalSintomas(false)
                  setModalRegistro(true)
                }}
              >
                <Feather name="x" size={24} color="#9E9E9E" />
              </TouchableOpacity>
            </View>

            <ScrollView style={estilos.formularioModal}>
              <Text style={estilos.subtituloModal}>Síntomas físicos</Text>
              <View style={estilos.grupoOpciones}>
                <TouchableOpacity
                  style={[estilos.opcionSintoma, sintomasRegistro.dolor_cabeza && estilos.opcionSintomaSeleccionada]}
                  onPress={() =>
                    setSintomasRegistro({ ...sintomasRegistro, dolor_cabeza: !sintomasRegistro.dolor_cabeza })
                  }
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      sintomasRegistro.dolor_cabeza && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Dolor de cabeza
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, sintomasRegistro.dolor_abdominal && estilos.opcionSintomaSeleccionada]}
                  onPress={() =>
                    setSintomasRegistro({ ...sintomasRegistro, dolor_abdominal: !sintomasRegistro.dolor_abdominal })
                  }
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      sintomasRegistro.dolor_abdominal && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Dolor abdominal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, sintomasRegistro.dolor_espalda && estilos.opcionSintomaSeleccionada]}
                  onPress={() =>
                    setSintomasRegistro({ ...sintomasRegistro, dolor_espalda: !sintomasRegistro.dolor_espalda })
                  }
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      sintomasRegistro.dolor_espalda && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Dolor de espalda
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, sintomasRegistro.nauseas && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setSintomasRegistro({ ...sintomasRegistro, nauseas: !sintomasRegistro.nauseas })}
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      sintomasRegistro.nauseas && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Náuseas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, sintomasRegistro.fatiga && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setSintomasRegistro({ ...sintomasRegistro, fatiga: !sintomasRegistro.fatiga })}
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      sintomasRegistro.fatiga && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Fatiga
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, sintomasRegistro.hinchazon && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setSintomasRegistro({ ...sintomasRegistro, hinchazon: !sintomasRegistro.hinchazon })}
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      sintomasRegistro.hinchazon && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Hinchazón
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, sintomasRegistro.antojos && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setSintomasRegistro({ ...sintomasRegistro, antojos: !sintomasRegistro.antojos })}
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      sintomasRegistro.antojos && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Antojos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, sintomasRegistro.acne && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setSintomasRegistro({ ...sintomasRegistro, acne: !sintomasRegistro.acne })}
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      sintomasRegistro.acne && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Acné
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    estilos.opcionSintoma,
                    sintomasRegistro.sensibilidad_senos && estilos.opcionSintomaSeleccionada,
                  ]}
                  onPress={() =>
                    setSintomasRegistro({
                      ...sintomasRegistro,
                      sensibilidad_senos: !sintomasRegistro.sensibilidad_senos,
                    })
                  }
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      sintomasRegistro.sensibilidad_senos && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Sensibilidad en senos
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={estilos.subtituloModal}>Estado de ánimo</Text>
              <View style={estilos.grupoOpciones}>
                <TouchableOpacity
                  style={[estilos.opcionSintoma, estadosAnimo.feliz && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setEstadosAnimo({ ...estadosAnimo, feliz: !estadosAnimo.feliz })}
                >
                  <Text
                    style={[estilos.textoOpcionSintoma, estadosAnimo.feliz && estilos.textoOpcionSintomaSeleccionada]}
                  >
                    Feliz
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, estadosAnimo.triste && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setEstadosAnimo({ ...estadosAnimo, triste: !estadosAnimo.triste })}
                >
                  <Text
                    style={[estilos.textoOpcionSintoma, estadosAnimo.triste && estilos.textoOpcionSintomaSeleccionada]}
                  >
                    Triste
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, estadosAnimo.irritable && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setEstadosAnimo({ ...estadosAnimo, irritable: !estadosAnimo.irritable })}
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      estadosAnimo.irritable && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Irritable
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, estadosAnimo.ansiosa && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setEstadosAnimo({ ...estadosAnimo, ansiosa: !estadosAnimo.ansiosa })}
                >
                  <Text
                    style={[estilos.textoOpcionSintoma, estadosAnimo.ansiosa && estilos.textoOpcionSintomaSeleccionada]}
                  >
                    Ansiosa
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, estadosAnimo.cansada && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setEstadosAnimo({ ...estadosAnimo, cansada: !estadosAnimo.cansada })}
                >
                  <Text
                    style={[estilos.textoOpcionSintoma, estadosAnimo.cansada && estilos.textoOpcionSintomaSeleccionada]}
                  >
                    Cansada
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, estadosAnimo.energica && estilos.opcionSintomaSeleccionada]}
                  onPress={() => setEstadosAnimo({ ...estadosAnimo, energica: !estadosAnimo.energica })}
                >
                  <Text
                    style={[
                      estilos.textoOpcionSintoma,
                      estadosAnimo.energica && estilos.textoOpcionSintomaSeleccionada,
                    ]}
                  >
                    Enérgica
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={estilos.subtituloModal}>Flujo menstrual</Text>
              <View style={estilos.grupoOpciones}>
                <TouchableOpacity
                  style={[estilos.opcionSintoma, tiposFlujo.ligero && estilos.opcionSintomaSeleccionada]}
                  onPress={() =>
                    setTiposFlujo({
                      ligero: true,
                      moderado: false,
                      abundante: false,
                      manchado: false,
                    })
                  }
                >
                  <Text
                    style={[estilos.textoOpcionSintoma, tiposFlujo.ligero && estilos.textoOpcionSintomaSeleccionada]}
                  >
                    Ligero
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, tiposFlujo.moderado && estilos.opcionSintomaSeleccionada]}
                  onPress={() =>
                    setTiposFlujo({
                      ligero: false,
                      moderado: true,
                      abundante: false,
                      manchado: false,
                    })
                  }
                >
                  <Text
                    style={[estilos.textoOpcionSintoma, tiposFlujo.moderado && estilos.textoOpcionSintomaSeleccionada]}
                  >
                    Moderado
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, tiposFlujo.abundante && estilos.opcionSintomaSeleccionada]}
                  onPress={() =>
                    setTiposFlujo({
                      ligero: false,
                      moderado: false,
                      abundante: true,
                      manchado: false,
                    })
                  }
                >
                  <Text
                    style={[estilos.textoOpcionSintoma, tiposFlujo.abundante && estilos.textoOpcionSintomaSeleccionada]}
                  >
                    Abundante
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.opcionSintoma, tiposFlujo.manchado && estilos.opcionSintomaSeleccionada]}
                  onPress={() =>
                    setTiposFlujo({
                      ligero: false,
                      moderado: false,
                      abundante: false,
                      manchado: true,
                    })
                  }
                >
                  <Text
                    style={[estilos.textoOpcionSintoma, tiposFlujo.manchado && estilos.textoOpcionSintomaSeleccionada]}
                  >
                    Manchado
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={estilos.botonGuardar}
              onPress={() => {
                setModalSintomas(false)
                setModalRegistro(true)
              }}
            >
              <Text style={estilos.textoBotonGuardar}>Guardar selección</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para detalles de día */}
      <Modal
        visible={modalDetalle}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalDetalle(false)}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.contenidoModal}>
            <View style={estilos.encabezadoModal}>
              <Text style={estilos.tituloModal}>
                {detallesCiclo?.fecha ? formatearFecha(detallesCiclo.fecha) : "Detalles del día"}
              </Text>
              <TouchableOpacity style={estilos.botonCerrarModal} onPress={() => setModalDetalle(false)}>
                <Feather name="x" size={24} color="#9E9E9E" />
              </TouchableOpacity>
            </View>

            <ScrollView style={estilos.detallesModal}>
              {detallesCiclo?.esPeriodo ? (
                <>
                  <View style={estilos.estadoDia}>
                    <View
                      style={[
                        estilos.indicadorEstado,
                        { backgroundColor: detallesCiclo.esPrediccion ? "#F8BBD0" : "#F06292" },
                      ]}
                    />
                    <Text style={estilos.textoEstadoDia}>
                      {detallesCiclo.esPrediccion ? "Período predicho" : "Período registrado"}
                    </Text>
                  </View>

                  <View style={estilos.seccionDetalle}>
                    <Text style={estilos.tituloSeccionDetalle}>Duración</Text>
                    <Text style={estilos.textoDetalle}>
                      {detallesCiclo.duracion || 5} días ({formatearFecha(detallesCiclo.fecha_inicio)} -{" "}
                      {formatearFecha(detallesCiclo.fecha_fin)})
                    </Text>
                  </View>

                  {!detallesCiclo.esPrediccion && detallesCiclo.sintomas && (
                    <View style={estilos.seccionDetalle}>
                      <Text style={estilos.tituloSeccionDetalle}>Síntomas registrados</Text>
                      <Text style={estilos.textoDetalle}>{detallesCiclo.sintomas || "Ninguno registrado"}</Text>
                    </View>
                  )}

                  {!detallesCiclo.esPrediccion && detallesCiclo.estado_animo && (
                    <View style={estilos.seccionDetalle}>
                      <Text style={estilos.tituloSeccionDetalle}>Estado de ánimo</Text>
                      <Text style={estilos.textoDetalle}>{detallesCiclo.estado_animo || "No registrado"}</Text>
                    </View>
                  )}

                  {!detallesCiclo.esPrediccion && detallesCiclo.flujo && (
                    <View style={estilos.seccionDetalle}>
                      <Text style={estilos.tituloSeccionDetalle}>Flujo menstrual</Text>
                      <Text style={estilos.textoDetalle}>{detallesCiclo.flujo || "No registrado"}</Text>
                    </View>
                  )}

                  {!detallesCiclo.esPrediccion && detallesCiclo.notas && (
                    <View style={estilos.seccionDetalle}>
                      <Text style={estilos.tituloSeccionDetalle}>Notas</Text>
                      <Text style={estilos.textoDetalle}>{detallesCiclo.notas || "Sin notas adicionales"}</Text>
                    </View>
                  )}

                  {detallesCiclo.esPrediccion && (
                    <View style={estilos.seccionDetalle}>
                      <Text style={estilos.textoPrediccion}>
                        Esta es una predicción basada en tus ciclos anteriores. Puedes registrar tu período real cuando
                        comience.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={estilos.mensajeVacio}>
                  <Feather name="calendar" size={40} color="#F8BBD0" />
                  <Text style={estilos.textoMensajeVacio}>No hay información para este día</Text>
                  <TouchableOpacity
                    style={estilos.botonRegistrarDia}
                    onPress={() => {
                      setModalDetalle(false)
                      setNuevoCiclo({
                        ...nuevoCiclo,
                        fecha_inicio: detallesCiclo.fecha,
                      })
                      setModalRegistro(true)
                    }}
                  >
                    <Text style={estilos.textoBotonRegistrarDia}>Registrar período en esta fecha</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {detallesCiclo?.esPeriodo && !detallesCiclo.esPrediccion && (
              <TouchableOpacity
                style={[estilos.botonEliminar]}
                onPress={() => {
                  Alert.alert(
                    "Eliminar registro",
                    "¿Estás segura de que deseas eliminar este registro de período?",
                    [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Eliminar",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            const solicitudes = [
                              {
                                type: "execute",
                                stmt: {
                                  sql: `DELETE FROM ciclos_menstruales WHERE id = ?`,
                                  args: [{ type: "text", value: String(detallesCiclo.id) }],
                                },
                              },
                              { type: "close" },
                            ]
                            await ejecutarPipeline(solicitudes)
                            setModalDetalle(false)
                            await cargarCiclosMenstruales(usuario.id)
                            Alert.alert("Registro eliminado", "El registro ha sido eliminado correctamente.")
                          } catch (error) {
                            console.error("Error al eliminar registro:", error)
                            Alert.alert("Error", "No se pudo eliminar el registro. Intenta nuevamente.")
                          }
                        },
                      },
                    ],
                    { cancelable: true },
                  )
                }}
              >
                <Feather name="trash-2" size={18} color="#FFFFFF" />
                <Text style={estilos.textoBotonEliminar}>Eliminar registro</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#FFF5F7",
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
    marginBottom: 16,
  },
  tituloTarjeta: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 8,
  },
  leyendaCalendario: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  itemLeyenda: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  puntoLeyenda: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  textoLeyenda: {
    fontSize: 12,
    color: "#757575",
  },
  botonRegistrar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F06292",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  textoBotonRegistrar: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  estadisticasContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  estadisticaItem: {
    alignItems: "center",
  },
  valorEstadistica: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F06292",
    marginBottom: 4,
  },
  labelEstadistica: {
    fontSize: 12,
    color: "#757575",
    textAlign: "center",
  },
  seccionEstadisticasTexto: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
  },
  tituloEstadisticasTexto: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 12,
  },
  contenedorEstadisticasTexto: {
    marginTop: 8,
  },
  textoEstadisticas: {
    fontSize: 14,
    color: "#424242",
    marginBottom: 8,
    lineHeight: 20,
  },
  textoSinDatos: {
    fontSize: 14,
    color: "#757575",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  contenedorSintomas: {
    marginTop: 8,
  },
  itemSintoma: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  nombreSintoma: {
    width: 120,
    fontSize: 14,
    color: "#424242",
  },
  barraProgreso: {
    flex: 1,
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginHorizontal: 8,
  },
  progresoSintoma: {
    height: 8,
    borderRadius: 4,
  },
  porcentajeSintoma: {
    width: 40,
    fontSize: 12,
    color: "#757575",
    textAlign: "right",
  },
  listaPredicciones: {
    marginTop: 8,
  },
  itemPrediccion: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconoPrediccion: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8BBD0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoPrediccion: {
    flex: 1,
  },
  fechaPrediccion: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 2,
  },
  duracionPrediccion: {
    fontSize: 12,
    color: "#757575",
  },
  mensajeVacio: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  textoMensajeVacio: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  consejo: {
    flexDirection: "row",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  iconoConsejo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F06292",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contenidoConsejo: {
    flex: 1,
  },
  tituloConsejo: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 4,
  },
  textoConsejo: {
    fontSize: 12,
    color: "#757575",
    lineHeight: 18,
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
  fondoModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  contenidoModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  encabezadoModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tituloModal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F06292",
  },
  botonCerrarModal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  formularioModal: {
    maxHeight: "70%",
  },
  campoFormulario: {
    marginBottom: 16,
  },
  etiquetaCampo: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 8,
  },
  inputFecha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  textoInputFecha: {
    fontSize: 14,
    color: "#424242",
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
    textAlignVertical: "top",
  },
  botonSintomas: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  textoBotonSintomas: {
    fontSize: 14,
    color: "#424242",
  },
  botonGuardar: {
    backgroundColor: "#F06292",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  textoBotonGuardar: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  subtituloModal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 12,
    marginTop: 16,
  },
  grupoOpciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  opcionSintoma: {
    backgroundColor: "#F9F9F9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  opcionSintomaSeleccionada: {
    backgroundColor: "#FCE4EC",
    borderColor: "#F06292",
  },
  textoOpcionSintoma: {
    fontSize: 12,
    color: "#757575",
  },
  textoOpcionSintomaSeleccionada: {
    color: "#F06292",
    fontWeight: "500",
  },
  detallesModal: {
    maxHeight: "70%",
  },
  estadoDia: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  indicadorEstado: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  textoEstadoDia: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
  },
  seccionDetalle: {
    marginBottom: 16,
  },
  tituloSeccionDetalle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#757575",
    marginBottom: 6,
  },
  textoDetalle: {
    fontSize: 14,
    color: "#424242",
    lineHeight: 20,
  },
  textoPrediccion: {
    fontSize: 14,
    color: "#757575",
    fontStyle: "italic",
    lineHeight: 20,
    backgroundColor: "#FFF5F7",
    padding: 12,
    borderRadius: 10,
  },
  botonEliminar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F44336",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
  },
  textoBotonEliminar: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  botonRegistrarDia: {
    backgroundColor: "#F06292",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  textoBotonRegistrarDia: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  contenedorCargando: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  textoCargando: {
    marginTop: 12,
    fontSize: 16,
    color: "#F06292",
  },
  // Estilos para la sección de bienvenida
  tarjetaBienvenida: {
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
  encabezadoBienvenida: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarBienvenida: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F06292",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textoAvatarBienvenida: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  infoBienvenida: {
    flex: 1,
  },
  tituloBienvenida: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 4,
  },
  subtituloBienvenida: {
    fontSize: 14,
    color: "#757575",
  },
  resumenCiclo: {
    marginTop: 8,
  },
  estadoCiclo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F7",
    borderRadius: 10,
    padding: 12,
  },
  textoEstadoCiclo: {
    fontSize: 14,
    color: "#424242",
    marginLeft: 8,
  },
})

export default PantallaCalendario
