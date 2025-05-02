import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";

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

const listarTodosLosCorreos = async () => {
  try {
    const solicitud = [
      {
        type: "execute",
        stmt: {
          sql: `SELECT id, correo, contraseña FROM Registros`,
        },
      },
      { type: "close" },
    ]

    const respuesta = await ejecutarPipeline(solicitud)

    // Adaptación para manejar la estructura de respuesta correcta
    let correos = []
    if (respuesta.results && respuesta.results[0] && respuesta.results[0].response) {
      const filas = respuesta.results[0].response.result.rows || []
      correos = filas.map((fila) => ({
        id: fila[0].value,
        correo: fila[1].value,
        contraseña: fila[2].value,
      }))
    } else if (respuesta.responses && respuesta.responses[0] && respuesta.responses[0].result) {
      correos = respuesta.responses[0].result.rows || []
    }

    console.log("📋 TODOS LOS CORREOS EN LA BASE DE DATOS:")
    correos.forEach((usuario) => {
      console.log(`ID: ${usuario.id}, Correo: "${usuario.correo}", Contraseña: "${usuario.contraseña}"`)
    })

    return correos
  } catch (error) {
    console.error("🔴 Error al listar correos:", error)
    return []
  }
}

const PantallaLogin = (props) => {
  // Extraer props con valores por defecto para evitar errores
  const navegarARegistro =
    props.navegarARegistro ||
    (() => {
      console.log("⚠️ Intentando navegar a registro con función por defecto")
      Alert.alert(
        "Error de navegación",
        "No se pudo navegar a la pantalla de registro. Por favor reinicia la aplicación.",
        [{ text: "Entendido" }],
      )
    })

  const navegarAMain =
    props.navegarAMain ||
    (() => {
      console.log("⚠️ Intentando navegar a main con función por defecto")
      Alert.alert(
        "Error de navegación",
        "No se pudo navegar a la pantalla principal. Por favor reinicia la aplicación.",
        [{ text: "Entendido" }],
      )
    })

  const [correo, setCorreo] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [estadoConexion, setEstadoConexion] = useState("verificando")
  const [modoDebug, setModoDebug] = useState(false)
  const [contadorDebug, setContadorDebug] = useState(0)

  // Verificar que las props de navegación estén definidas
  useEffect(() => {
    console.log("🔍 Verificando props de navegación:")
    console.log(
      "navegarARegistro:",
      typeof props.navegarARegistro === "function" ? "✅ Es función" : "❌ No es función",
    )
    console.log("navegarAMain:", typeof props.navegarAMain === "function" ? "✅ Es función" : "❌ No es función")

    // Listar todos los correos al iniciar en modo debug
    if (modoDebug) {
      listarTodosLosCorreos()
    }
  }, [props, modoDebug])

  useEffect(() => {
    verificarConexion()
    verificarSesionActiva()
  }, [])

  // Verificar si hay una sesión activa al cargar la pantalla
  const verificarSesionActiva = async () => {
    try {
      const usuarioGuardado = await AsyncStorage.getItem("usuario")
      if (usuarioGuardado) {
        const datosUsuario = JSON.parse(usuarioGuardado)
        console.log("🟢 Sesión activa encontrada:", datosUsuario)
        // Navegar directamente a la pantalla principal si hay sesión activa
        if (typeof props.navegarAMain === "function") {
          props.navegarAMain()
        } else {
          console.error("⚠️ No se puede navegar a main: navegarAMain no es una función")
        }
      }
    } catch (error) {
      console.error("🔴 Error al verificar sesión:", error)
    }
  }

  const verificarConexion = async () => {
    try {
      setEstadoConexion("verificando")
      const respuesta = await fetch(`${HTTP_URL}/health`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      })
      const texto = await respuesta.text()
      console.log("🟢 Turso health OK:", texto)
      setEstadoConexion("conectado")
    } catch (err) {
      console.error("🔴 Turso health error:", err)
      setEstadoConexion("error")
      Alert.alert(
        "Error de conexión",
        "No pudimos conectar con la base de datos. Por favor verifica tu conexión a internet e intenta nuevamente.",
        [{ text: "Reintentar", onPress: verificarConexion }],
      )
    }
  }

  const validarFormulario = () => {
    if (!correo.trim()) {
      Alert.alert("Campo requerido", "Por favor ingresa tu correo electrónico")
      return false
    }

    if (!contrasena) {
      Alert.alert("Campo requerido", "Por favor ingresa tu contraseña")
      return false
    }

    return true
  }

  const manejarLogin = async () => {
    if (!validarFormulario()) {
      return
    }

    setCargando(true)
    try {
      // Normalizar el correo (quitar espacios y convertir a minúsculas)
      const correoNormalizado = correo.trim().toLowerCase()
      console.log("🔵 Intentando login con:", correoNormalizado)

      // Primero, listar todos los correos para depuración si está en modo debug
      if (modoDebug) {
        await listarTodosLosCorreos()
      }

      // Consulta directa sin distinguir mayúsculas/minúsculas usando LOWER()
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT id, Nombre, Apellido, correo, contraseña
                  FROM Registros
                  WHERE LOWER(correo) = LOWER(?)
                  LIMIT 1`,
            args: [{ type: "text", value: correoNormalizado }],
          },
        },
        { type: "close" },
      ]

      const respuesta = await ejecutarPipeline(solicitudes)

      // Adaptación para manejar diferentes estructuras de respuesta
      let filas = []
      if (respuesta.results && respuesta.results[0] && respuesta.results[0].response) {
        const filasRaw = respuesta.results[0].response.result.rows || []
        filas = filasRaw.map((fila) => ({
          id: fila[0].value,
          Nombre: fila[1].value,
          Apellido: fila[2].value,
          correo: fila[3].value,
          contraseña: fila[4].value,
        }))
      } else if (respuesta.responses && respuesta.responses[0] && respuesta.responses[0].result) {
        filas = respuesta.responses[0].result.rows || []
      }

      if (filas.length > 0) {
        const usuario = filas[0]
        console.log("🟢 Usuario encontrado:", usuario)

        // Comparamos la contraseña ingresada con la almacenada
        if (usuario.contraseña === contrasena) {
          console.log("🟢 Contraseña correcta")

          const datosUsuario = {
            id: usuario.id,
            nombre: usuario.Nombre,
            apellido: usuario.Apellido,
            correo: usuario.correo,
          }

          // Guardar los datos del usuario para mantener la sesión
          await AsyncStorage.setItem("usuario", JSON.stringify(datosUsuario))

          Alert.alert(`¡Te damos la bienvenida ${usuario.Nombre}!`, "Has iniciado sesión correctamente en FertiControl.", [
            {
              text: "Continuar",
              onPress: () => {
                console.log("🔵 Navegando a la pantalla principal con usuario:", datosUsuario)
                if (typeof props.navegarAMain === "function") {
                  props.navegarAMain()
                } else {
                  console.error("⚠️ No se puede navegar a main: navegarAMain no es una función")
                  Alert.alert(
                    "Error de navegación",
                    "No se pudo navegar a la pantalla principal. Por favor reinicia la aplicación.",
                    [{ text: "Entendido" }],
                  )
                }
              },
            },
          ])
        } else {
          console.log("🟠 Contraseña incorrecta")
          console.log(`Contraseña ingresada: "${contrasena}"`)
          console.log(`Contraseña almacenada: "${usuario.contraseña}"`)

          Alert.alert(
            "Contraseña incorrecta",
            "La contraseña que ingresaste no es correcta. Por favor intenta nuevamente.",
            [{ text: "Entendido" }],
          )
        }
      } else {
        console.log("🟠 Usuario no encontrado")

        // Ofrecer registro
        Alert.alert("No pudimos encontrarte", "El correo electrónico no está registrado. ¿Deseas crear una cuenta?", [
          { text: "Intentar de nuevo", style: "cancel" },
          {
            text: "Crear cuenta",
            onPress: () => {
              setCorreo("")
              setContrasena("")
              if (typeof props.navegarARegistro === "function") {
                props.navegarARegistro()
              } else {
                console.error("⚠️ No se puede navegar a registro: navegarARegistro no es una función")
                Alert.alert(
                  "Error de navegación",
                  "No se pudo navegar a la pantalla de registro. Por favor reinicia la aplicación.",
                  [{ text: "Entendido" }],
                )
              }
            },
          },
        ])
      }
    } catch (error) {
      console.error("🔴 Error en inicio de sesión:", error)
      Alert.alert(
        "Error al iniciar sesión",
        "Ocurrió un problema al verificar tus credenciales. Por favor intenta nuevamente más tarde.",
        [{ text: "Entendido" }],
      )
    } finally {
      setCargando(false)
    }
  }

  // Función para activar el modo debug
  const activarModoDebug = () => {
    const nuevoContador = contadorDebug + 1
    setContadorDebug(nuevoContador)

    if (nuevoContador >= 5) {
      setModoDebug(!modoDebug)
      setContadorDebug(0)

      if (!modoDebug) {
        Alert.alert("Modo debug activado", "Se mostrarán datos sensibles en la consola")
        listarTodosLosCorreos()
      } else {
        Alert.alert("Modo debug desactivado")
      }
    }
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilos.vistaEvitarTeclado}>
        <ScrollView contentContainerStyle={estilos.contenedorScroll} showsVerticalScrollIndicator={false}>
          <View style={estilos.contenedorTitulo}>
            <TouchableOpacity onPress={activarModoDebug} activeOpacity={1}>
              <Text style={estilos.nombreApp}>FertiControl</Text>
              <Text style={estilos.sloganApp}>Tu guía anticonceptiva personal</Text>
            </TouchableOpacity>

            {modoDebug && (
              <TouchableOpacity
                style={estilos.botonDebug}
                onPress={() => {
                  listarTodosLosCorreos()
                  Alert.alert("Listando usuarios", "Revisa la consola para ver todos los usuarios")
                }}
              >
                <Text style={estilos.textoBotonDebug}>Listar usuarios</Text>
              </TouchableOpacity>
            )}
          </View>

          {estadoConexion === "error" && (
            <View style={estilos.mensajeError}>
              <Feather name="wifi-off" size={18} color="#F44336" />
              <Text style={estilos.textoError}>Error de conexión. Toca para reintentar.</Text>
              <TouchableOpacity onPress={verificarConexion}>
                <Feather name="refresh-cw" size={18} color="#F06292" />
              </TouchableOpacity>
            </View>
          )}

          <View style={estilos.contenedorFormulario}>
            <Text style={estilos.tituloFormulario}>Iniciar sesión</Text>

            <View style={estilos.grupoInputs}>
              <View style={estilos.contenedorInput}>
                <Feather name="mail" size={18} color="#F48FB1" style={estilos.iconoInput} />
                <TextInput
                  placeholder="Correo electrónico"
                  value={correo}
                  onChangeText={setCorreo}
                  style={estilos.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#BDBDBD"
                />
              </View>

              <View style={estilos.contenedorInput}>
                <Feather name="lock" size={18} color="#F48FB1" style={estilos.iconoInput} />
                <TextInput
                  placeholder="Contraseña"
                  value={contrasena}
                  onChangeText={setContrasena}
                  style={[estilos.input, estilos.inputContrasena]}
                  secureTextEntry={!mostrarContrasena}
                  placeholderTextColor="#BDBDBD"
                />
                <TouchableOpacity onPress={() => setMostrarContrasena(!mostrarContrasena)} style={estilos.iconoOjo}>
                  <Feather name={mostrarContrasena ? "eye-off" : "eye"} size={18} color="#F48FB1" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[estilos.botonLogin, cargando && estilos.botonDeshabilitado]}
              onPress={manejarLogin}
              disabled={cargando || estadoConexion !== "conectado"}
            >
              {cargando ? (
                <View style={estilos.contenedorCargando}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={estilos.textoBotonLogin}>Iniciando sesión...</Text>
                </View>
              ) : (
                <Text style={estilos.textoBotonLogin}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>

            <View style={estilos.separador}>
              <View style={estilos.lineaSeparador} />
              <Text style={estilos.textoSeparador}>o</Text>
              <View style={estilos.lineaSeparador} />
            </View>
            <View style={estilos.contenedorRegistro}>
              <Text style={estilos.textoRegistro}>¿No tienes una cuenta?</Text>
              <TouchableOpacity onPress={navegarARegistro}>
                <Text style={estilos.enlaceRegistro}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#FFF5F7" },
  vistaEvitarTeclado: { flex: 1 },
  contenedorScroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20 },
  contenedorTitulo: { alignItems: "center", marginTop: 30, marginBottom: 20 },
  nombreApp: { fontSize: 28, fontWeight: "bold", color: "#F06292", marginBottom: 4 },
  sloganApp: { fontSize: 14, color: "#9E9E9E", textAlign: "center" },
  contenedorFormulario: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
  },
  tituloFormulario: { fontSize: 20, fontWeight: "bold", color: "#F06292", marginBottom: 16, textAlign: "center" },
  grupoInputs: { marginBottom: 16 },
  contenedorInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  iconoInput: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#424242" },
  inputContrasena: { flex: 1, paddingRight: 36 },
  iconoOjo: { position: "absolute", right: 14 },
  botonLogin: {
    backgroundColor: "#F06292",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#F48FB1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  botonDeshabilitado: { backgroundColor: "#F8BBD0", shadowOpacity: 0.1 },
  textoBotonLogin: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  separador: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  lineaSeparador: { flex: 1, height: 1, backgroundColor: "#F5F5F5" },
  textoSeparador: { marginHorizontal: 10, color: "#9E9E9E", fontSize: 14 },
  contenedorRegistro: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  textoRegistro: { fontSize: 13, color: "#9E9E9E" },
  enlaceRegistro: { fontSize: 13, color: "#F06292", fontWeight: "bold", marginLeft: 4 },
  mensajeError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  textoError: {
    color: "#D32F2F",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  contenedorCargando: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  botonDebug: {
    marginTop: 10,
    backgroundColor: "#9C27B0",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  textoBotonDebug: {
    color: "#FFFFFF",
    fontSize: 12,
  },
})

export default PantallaLogin
