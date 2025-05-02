import { Feather } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import DateTimePicker from "@react-native-community/datetimepicker"
import Constants from "expo-constants"
import { useState } from "react"
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native"

const HTTP_URL = Constants.expoConfig.extra.HTTP_URL
const AUTH_TOKEN = Constants.expoConfig.extra.AUTH_TOKEN

async function ejecutarPipeline(solicitudes) {
  const carga = { baton: null, requests: solicitudes }
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
      throw new Error(texto || `HTTP ${respuesta.status}`)
    }

    return JSON.parse(texto)
  } catch (error) {
    throw error
  }
}

const PantallaRegistro = ({ navegarALogin, navegarAMain }) => {
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [edad, setEdad] = useState("")
  const [fecha, setFecha] = useState(new Date())
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [correo, setCorreo] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [cargando, setCargando] = useState(false)

  const cambiarFecha = (event, selectedDate) => {
    const currentDate = selectedDate || fecha
    if (Platform.OS === "android") setMostrarCalendario(false)
    setFecha(currentDate)
  }

  const validarFormulario = () => {
    if (!nombre.trim()) {
      Alert.alert("Campo requerido", "Por favor ingresa tu nombre")
      return false
    }
    if (!apellido.trim()) {
      Alert.alert("Campo requerido", "Por favor ingresa tu apellido")
      return false
    }
    if (!edad.trim()) {
      Alert.alert("Campo requerido", "Por favor ingresa tu edad")
      return false
    }
    if (!correo.trim()) {
      Alert.alert("Campo requerido", "Por favor ingresa tu correo electrónico")
      return false
    }
    if (!contrasena) {
      Alert.alert("Campo requerido", "Por favor ingresa una contraseña")
      return false
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regex.test(correo.trim())) {
      Alert.alert("Formato inválido", "Por favor ingresa un correo electrónico válido")
      return false
    }
    if (contrasena.length < 6) {
      Alert.alert("Contraseña débil", "La contraseña debe tener al menos 6 caracteres")
      return false
    }
    return true
  }

  const manejarRegistro = async () => {
    if (!validarFormulario()) return
    setCargando(true)

    try {
      // Verificar correo existente
      const verificar = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT COUNT(*) as existe FROM Registros WHERE correo = ?`,
            args: [{ type: "text", value: correo.trim().toLowerCase() }],
          },
        },
        { type: "close" },
      ]
      const resVer = await ejecutarPipeline(verificar)
      const existe = Number.parseInt(resVer.results[0].response.result.rows[0][0].value) > 0

      if (existe) {
        Alert.alert(
          "Correo ya registrado",
          "Este correo electrónico ya está registrado. Por favor inicia sesión o usa otro correo.",
          [{ text: "Entendido" }, { text: "Iniciar sesión", onPress: navegarALogin }],
        )
        setCargando(false)
        return
      }

      // Insertar nuevo usuario - Usamos la consulta original sin el campo ID
      const registro = [
        {
          type: "execute",
          stmt: {
            sql: `INSERT INTO Registros (Nombre, Apellido, Edad, Fecha_de_nacimiento, correo, contraseña)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              { type: "text", value: nombre.trim() },
              { type: "text", value: apellido.trim() },
              { type: "text", value: edad.trim() },
              {
                type: "text",
                value: fecha.toISOString().split("T")[0],
              },
              { type: "text", value: correo.trim().toLowerCase() },
              { type: "text", value: contrasena },
            ],
          },
        },
        { type: "close" },
      ]

      console.log("🟡 Ejecutando consulta de inserción...")
      const resInsert = await ejecutarPipeline(registro)
      console.log("🟡 Resultado de inserción:", JSON.stringify(resInsert))

      if (resInsert.results && resInsert.results[0].type === "ok") {
        console.log("🟢 Inserción exitosa, obteniendo ID del usuario...")

        // Obtener el ID del usuario recién registrado
        const obtenerUsuario = [
          {
            type: "execute",
            stmt: {
              sql: `SELECT rowid, * FROM Registros WHERE correo = ? LIMIT 1`,
              args: [{ type: "text", value: correo.trim().toLowerCase() }],
            },
          },
          { type: "close" },
        ]

        const resUsuario = await ejecutarPipeline(obtenerUsuario)
        console.log("🟡 Resultado de consulta de usuario:", JSON.stringify(resUsuario))

        if (
          resUsuario.results &&
          resUsuario.results[0].type === "ok" &&
          resUsuario.results[0].response.result.rows.length > 0
        ) {
          const usuario = resUsuario.results[0].response.result.rows[0]
          const usuarioId = usuario[0].value // rowid

          // Crear objeto de usuario para guardar en AsyncStorage
          const datosUsuario = {
            id: usuarioId,
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            edad: edad.trim(),
            fecha_nacimiento: fecha.toISOString().split("T")[0],
            correo: correo.trim().toLowerCase(),
          }

          console.log("🟢 Guardando datos de usuario en AsyncStorage:", datosUsuario)

          // Guardar en AsyncStorage
          await AsyncStorage.setItem("usuario", JSON.stringify(datosUsuario))
          await AsyncStorage.setItem("usuarioActual", correo.trim().toLowerCase())

          // Verificar que se guardó correctamente
          const verificacion = await AsyncStorage.getItem("usuario")
          console.log("🟢 Verificación de datos guardados:", verificacion)

          Alert.alert(
            "¡Registro exitoso!",
            `¡Te damos la bienvenida ${nombre} a FertiControl! Tu cuenta ha sido creada correctamente.`,
            [{ text: "Continuar", onPress: navegarAMain }],
          )
        } else {
          throw new Error("No se pudo obtener la información del usuario registrado")
        }
      } else {
        throw new Error("No se pudo confirmar la inserción en la base de datos")
      }
    } catch (error) {
      console.error("🔴 Error en registro:", error)
      Alert.alert(
        "Error al crear cuenta",
        "Ocurrió un problema al registrar tu cuenta. Por favor intenta nuevamente más tarde.",
        [{ text: "Entendido" }],
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilos.vistaEvitarTeclado}>
        <ScrollView contentContainerStyle={estilos.contenedorScroll} showsVerticalScrollIndicator={false}>
          <View style={estilos.contenedorTitulo}>
            <Text style={estilos.nombreApp}>FertiControl</Text>
            <Text style={estilos.sloganApp}>Tu guía anticonceptiva personal</Text>
          </View>
          <View style={estilos.contenedorFormulario}>
            <Text style={estilos.tituloFormulario}>Crear cuenta</Text>
            <View style={estilos.grupoInputs}>
              <View style={estilos.contenedorInput}>
                <Feather name="user" size={18} color="#F48FB1" style={estilos.iconoInput} />
                <TextInput
                  placeholder="Nombre"
                  value={nombre}
                  onChangeText={setNombre}
                  style={estilos.input}
                  placeholderTextColor="#BDBDBD"
                />
              </View>
              <View style={estilos.contenedorInput}>
                <Feather name="user" size={18} color="#F48FB1" style={estilos.iconoInput} />
                <TextInput
                  placeholder="Apellido"
                  value={apellido}
                  onChangeText={setApellido}
                  style={estilos.input}
                  placeholderTextColor="#BDBDBD"
                />
              </View>
              <View style={estilos.contenedorInput}>
                <Feather name="gift" size={18} color="#F48FB1" style={estilos.iconoInput} />
                <TextInput
                  placeholder="Edad"
                  value={edad}
                  onChangeText={setEdad}
                  style={estilos.input}
                  keyboardType="numeric"
                  placeholderTextColor="#BDBDBD"
                />
              </View>
              <TouchableOpacity style={estilos.contenedorInput} onPress={() => setMostrarCalendario(true)}>
                <Feather name="calendar" size={18} color="#F48FB1" style={estilos.iconoInput} />
                <Text style={estilos.input}>{fecha.toLocaleDateString("es-MX")}</Text>
              </TouchableOpacity>
              {mostrarCalendario && (
                <DateTimePicker
                  value={fecha}
                  mode="date"
                  display="default"
                  onChange={cambiarFecha}
                  maximumDate={new Date()}
                  locale="es-MX"
                />
              )}
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
              style={[estilos.botonRegistro, cargando && estilos.botonDeshabilitado]}
              onPress={manejarRegistro}
              disabled={cargando}
            >
              {cargando ? (
                <View style={estilos.contenedorCargando}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={estilos.textoBotonRegistro}>Creando cuenta...</Text>
                </View>
              ) : (
                <Text style={estilos.textoBotonRegistro}>Crear cuenta</Text>
              )}
            </TouchableOpacity>
            <View style={estilos.contenedorLogin}>
              <Text style={estilos.textoLogin}>¿Ya tienes una cuenta?</Text>
              <TouchableOpacity onPress={navegarALogin}>
                <Text style={estilos.enlaceLogin}>Iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#FFF5F7",
  },
  vistaEvitarTeclado: {
    flex: 1,
  },
  contenedorScroll: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  contenedorTitulo: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 15,
  },
  nombreApp: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#F06292",
    marginBottom: 2,
  },
  sloganApp: {
    fontSize: 15,
    color: "#9E9E9E",
    textAlign: "center",
  },
  contenedorFormulario: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 15,
  },
  tituloFormulario: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F06292",
    marginBottom: 15,
    textAlign: "center",
  },
  grupoInputs: {
    marginBottom: 15,
  },
  contenedorInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  iconoInput: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#424242",
  },
  inputContrasena: {
    flex: 1,
    paddingRight: 36,
  },
  iconoOjo: {
    position: "absolute",
    right: 12,
  },
  botonRegistro: {
    backgroundColor: "#F06292",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#F48FB1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  botonDeshabilitado: {
    backgroundColor: "#F8BBD0",
    shadowOpacity: 0.1,
  },
  textoBotonRegistro: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  contenedorLogin: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
  },
  textoLogin: {
    fontSize: 14,
    color: "#9E9E9E",
  },
  enlaceLogin: {
    fontSize: 14,
    color: "#F06292",
    fontWeight: "bold",
    marginLeft: 4,
  },
  contenedorCargando: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
})

export default PantallaRegistro
