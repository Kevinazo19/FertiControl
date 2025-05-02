import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, } from "react-native";

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

const PantallaPerfil = (props) => {
  // Extraer props con valores por defecto para evitar errores
  const navegarALogin =
    props.navegarALogin ||
    (() => {
      console.log("⚠️ Intentando navegar a login con función por defecto")
      Alert.alert(
        "Error de navegación",
        "No se pudo navegar a la pantalla de login. Por favor reinicia la aplicación.",
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

  // Función para volver a la pantalla anterior
  const volverAPantallaAnterior = props.volverAPantallaAnterior || navegarAMain

  // Estados
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [cargandoActualizacion, setCargandoActualizacion] = useState(false)
  const [datosCompletos, setDatosCompletos] = useState(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [datosEditados, setDatosEditados] = useState({
    nombre: "",
    apellido: "",
    edad: "",
    fecha_nacimiento: "",
  })
  const [modalCambioContrasena, setModalCambioContrasena] = useState(false)
  const [contrasenas, setContrasenas] = useState({
    actual: "",
    nueva: "",
    confirmar: "",
  })
  const [mostrarContrasenaActual, setMostrarContrasenaActual] = useState(false)
  const [mostrarContrasenaNueva, setMostrarContrasenaNueva] = useState(false)
  const [mostrarContrasenaConfirmar, setMostrarContrasenaConfirmar] = useState(false)

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true)
        const usuarioGuardado = await AsyncStorage.getItem("usuario")

        if (!usuarioGuardado) {
          console.log("🔴 No hay usuario guardado en AsyncStorage")
          Alert.alert("Error", "No se encontró información de usuario. Por favor inicia sesión nuevamente.", [
            { text: "OK", onPress: navegarALogin },
          ])
          return
        }

        const datosUsuario = JSON.parse(usuarioGuardado)
        setUsuario(datosUsuario)

        // Cargar datos completos del usuario desde la base de datos
        await cargarDatosCompletos(datosUsuario.id)
      } catch (error) {
        console.error("🔴 Error al cargar datos del usuario:", error)
        Alert.alert("Error", "No se pudieron cargar tus datos. Por favor intenta nuevamente.", [{ text: "OK" }])
      } finally {
        setCargando(false)
      }
    }

    cargarDatos()
  }, [navegarALogin])

  // Intentar cargar datos nuevamente si hay problemas
  useEffect(() => {
    if (usuario && !datosCompletos) {
      // Si tenemos usuario pero no datos completos, intentar cargar nuevamente después de un breve retraso
      const timer = setTimeout(() => {
        console.log("🟠 Reintentando cargar datos completos...")
        cargarDatosCompletos(usuario.id)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [usuario, datosCompletos])

  // Función para cargar datos completos del usuario desde la base de datos
  const cargarDatosCompletos = async (idUsuario) => {
    try {
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `SELECT id, Nombre, Apellido, Edad, Fecha_de_nacimiento, correo, contraseña
                FROM Registros
                WHERE id = ?
                LIMIT 1`,
            args: [{ type: "text", value: String(idUsuario) }],
          },
        },
        { type: "close" },
      ]

      const respuesta = await ejecutarPipeline(solicitudes)
      console.log("🟢 Respuesta de cargar datos:", JSON.stringify(respuesta, null, 2))

      // Adaptación para manejar diferentes estructuras de respuesta
      let datos = null
      if (respuesta.results && respuesta.results[0] && respuesta.results[0].response) {
        const filasRaw = respuesta.results[0].response.result.rows || []
        if (filasRaw.length > 0) {
          const fila = filasRaw[0]
          datos = {
            id: fila[0].value,
            nombre: fila[1].value,
            apellido: fila[2].value,
            edad: fila[3]?.value || "",
            fecha_nacimiento: fila[4]?.value || "",
            correo: fila[5].value,
            contrasena: fila[6].value,
          }
        }
      } else if (respuesta.responses && respuesta.responses[0] && respuesta.responses[0].result) {
        const filas = respuesta.responses[0].result.rows || []
        if (filas.length > 0) {
          const fila = filas[0]
          datos = {
            id: fila[0],
            nombre: fila[1],
            apellido: fila[2],
            edad: fila[3] || "",
            fecha_nacimiento: fila[4] || "",
            correo: fila[5],
            contrasena: fila[6],
          }
        }
      }

      if (datos) {
        console.log("🟢 Datos completos cargados:", datos)
        setDatosCompletos(datos)
        setDatosEditados({
          nombre: datos.nombre || "",
          apellido: datos.apellido || "",
          edad: datos.edad ? String(datos.edad) : "",
          fecha_nacimiento: datos.fecha_nacimiento || "",
        })
      } else {
        console.log("🟠 No se encontraron datos completos del usuario")
        Alert.alert(
          "Advertencia",
          "No se pudieron cargar todos tus datos. Algunas funciones podrían no estar disponibles.",
          [{ text: "Entendido" }],
        )
      }
    } catch (error) {
      console.error("🔴 Error al cargar datos completos:", error)
      Alert.alert(
        "Error",
        "No se pudieron cargar tus datos completos. Por favor intenta nuevamente. Detalles: " +
          (error.message || "Error desconocido"),
      )
    }
  }

  // Función para actualizar los datos del usuario
  const actualizarDatosUsuario = async () => {
    try {
      setCargandoActualizacion(true)

      // Validar datos
      if (!datosEditados.nombre.trim() || !datosEditados.apellido.trim()) {
        Alert.alert("Campos requeridos", "El nombre y apellido son obligatorios.")
        setCargandoActualizacion(false)
        return
      }

      // IMPORTANTE: Enviamos todos los valores como texto para evitar problemas de tipo
      // La edad se envía como texto aunque sea un número
      console.log("🟢 Actualizando datos con:", {
        nombre: datosEditados.nombre.trim(),
        apellido: datosEditados.apellido.trim(),
        edad: datosEditados.edad.trim(),
        fecha_nacimiento: datosEditados.fecha_nacimiento.trim(),
        id: usuario.id,
      })

      // Actualizar en la base de datos - TODOS LOS VALORES COMO TEXTO
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `UPDATE Registros 
                SET Nombre = ?, Apellido = ?, Edad = ?, Fecha_de_nacimiento = ?
                WHERE id = ?`,
            args: [
              { type: "text", value: datosEditados.nombre.trim() },
              { type: "text", value: datosEditados.apellido.trim() },
              { type: "text", value: datosEditados.edad.trim() || "" }, // Enviamos la edad como texto
              { type: "text", value: datosEditados.fecha_nacimiento.trim() },
              { type: "text", value: String(usuario.id) },
            ],
          },
        },
        { type: "close" },
      ]

      const respuesta = await ejecutarPipeline(solicitudes)
      console.log("🟢 Respuesta de actualización:", JSON.stringify(respuesta, null, 2))

      // Verificar si la actualización fue exitosa
      let actualizacionExitosa = false

      if (respuesta.results && respuesta.results[0] && respuesta.results[0].response) {
        actualizacionExitosa = true
      } else if (respuesta.responses && respuesta.responses[0]) {
        actualizacionExitosa = true
      }

      if (!actualizacionExitosa) {
        throw new Error("No se pudo confirmar la actualización en la base de datos")
      }

      // Actualizar AsyncStorage
      const usuarioActualizado = {
        ...usuario,
        nombre: datosEditados.nombre.trim(),
        apellido: datosEditados.apellido.trim(),
      }
      await AsyncStorage.setItem("usuario", JSON.stringify(usuarioActualizado))
      setUsuario(usuarioActualizado)

      // Recargar datos completos
      await cargarDatosCompletos(usuario.id)

      // Salir del modo edición
      setModoEdicion(false)

      Alert.alert("¡Perfil actualizado!", "Tus datos han sido actualizados correctamente.")
    } catch (error) {
      console.error("🔴 Error al actualizar datos:", error)
      Alert.alert(
        "Error",
        "No se pudieron actualizar tus datos. Por favor intenta nuevamente. Detalles: " +
          (error.message || "Error desconocido"),
      )
    } finally {
      setCargandoActualizacion(false)
    }
  }

  // Función para cambiar la contraseña
  const cambiarContrasena = async () => {
    try {
      setCargandoActualizacion(true)

      // Validar contraseñas
      if (!contrasenas.actual || !contrasenas.nueva || !contrasenas.confirmar) {
        Alert.alert("Campos incompletos", "Por favor completa todos los campos.")
        return
      }

      if (contrasenas.nueva !== contrasenas.confirmar) {
        Alert.alert("Error", "La nueva contraseña y su confirmación no coinciden.")
        return
      }

      if (contrasenas.nueva.length < 6) {
        Alert.alert("Contraseña débil", "La contraseña debe tener al menos 6 caracteres.")
        return
      }

      // Verificar contraseña actual
      if (contrasenas.actual !== datosCompletos.contrasena) {
        Alert.alert("Contraseña incorrecta", "La contraseña actual no es correcta.")
        return
      }

      // Actualizar contraseña en la base de datos
      const solicitudes = [
        {
          type: "execute",
          stmt: {
            sql: `UPDATE Registros 
                  SET contraseña = ?
                  WHERE id = ?`,
            args: [
              { type: "text", value: contrasenas.nueva },
              { type: "text", value: String(usuario.id) },
            ],
          },
        },
        { type: "close" },
      ]

      await ejecutarPipeline(solicitudes)

      // Limpiar campos y cerrar modal
      setContrasenas({
        actual: "",
        nueva: "",
        confirmar: "",
      })
      setModalCambioContrasena(false)

      // Recargar datos completos
      await cargarDatosCompletos(usuario.id)

      Alert.alert("¡Contraseña actualizada!", "Tu contraseña ha sido cambiada correctamente.")
    } catch (error) {
      console.error("🔴 Error al cambiar contraseña:", error)
      Alert.alert("Error", "No se pudo cambiar tu contraseña. Por favor intenta nuevamente.")
    } finally {
      setCargandoActualizacion(false)
    }
  }

  // Función para cerrar sesión
  const cerrarSesion = async () => {
    try {
      Alert.alert(
        "Cerrar sesión",
        "¿deseas cerrar sesión?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Cerrar sesión",
            style: "destructive",
            onPress: async () => {
              try {
                // Eliminar datos de usuario
                await AsyncStorage.removeItem("usuario")
                console.log("🟢 Sesión cerrada correctamente")

                // Navegar directamente al login
                navegarALogin()
              } catch (error) {
                console.error("🔴 Error al cerrar sesión:", error)
                Alert.alert("Error", "No se pudo cerrar sesión. Por favor intenta nuevamente.")
              }
            },
          },
        ],
        { cancelable: true },
      )
    } catch (error) {
      console.error("🔴 Error al cerrar sesión:", error)
      Alert.alert("Error", "No se pudo cerrar sesión. Por favor intenta nuevamente.")
    }
  }

  // Función para formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return ""

    try {
      // Si la fecha ya tiene formato DD/MM/YYYY, devolverla tal cual
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
        return fecha
      }

      // Si es una fecha ISO, formatearla
      const fechaObj = new Date(fecha)
      if (isNaN(fechaObj.getTime())) return fecha

      const dia = fechaObj.getDate().toString().padStart(2, "0")
      const mes = (fechaObj.getMonth() + 1).toString().padStart(2, "0")
      const anio = fechaObj.getFullYear()

      return `${dia}/${mes}/${anio}`
    } catch (error) {
      console.error("Error al formatear fecha:", error)
      return fecha
    }
  }

  // Renderizar pantalla de carga
  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />
        <View style={estilos.contenedorCargando}>
          <ActivityIndicator size="large" color="#F06292" />
          <Text style={estilos.textoCargando}>Cargando tu perfil...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />

      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <TouchableOpacity style={estilos.botonVolver} onPress={volverAPantallaAnterior}>
          <Feather name="arrow-left" size={24} color="#F06292" />
        </TouchableOpacity>
        <Text style={estilos.tituloEncabezado}>Mi Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilos.contenedorPrincipal}>
        <ScrollView
          style={estilos.contenido}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={estilos.contenidoScroll}
        >
          {/* Sección de avatar y nombre */}
          <View style={estilos.seccionAvatar}>
            <View style={estilos.avatar}>
              <Text style={estilos.textoAvatar}>{usuario?.nombre ? usuario.nombre.charAt(0).toUpperCase() : "?"}</Text>
            </View>
            <Text style={estilos.nombreUsuario}>{usuario ? `${usuario.nombre} ${usuario.apellido}` : "Usuario"}</Text>
            <Text style={estilos.correoUsuario}>{usuario?.correo || ""}</Text>
          </View>

          {/* Sección de datos personales */}
          <View style={estilos.tarjeta}>
            <View style={estilos.encabezadoTarjeta}>
              <Text style={estilos.tituloTarjeta}>Datos personales</Text>
              {!modoEdicion ? (
                <TouchableOpacity style={estilos.botonEditar} onPress={() => setModoEdicion(true)}>
                  <Feather name="edit-2" size={16} color="#F06292" />
                  <Text style={estilos.textoBotonEditar}>Editar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={estilos.botonCancelar}
                  onPress={() => {
                    setModoEdicion(false)
                    // Restaurar datos originales
                    if (datosCompletos) {
                      setDatosEditados({
                        nombre: datosCompletos.nombre || "",
                        apellido: datosCompletos.apellido || "",
                        edad: datosCompletos.edad ? String(datosCompletos.edad) : "",
                        fecha_nacimiento: datosCompletos.fecha_nacimiento || "",
                      })
                    }
                  }}
                >
                  <Feather name="x" size={16} color="#9E9E9E" />
                  <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>

            {modoEdicion ? (
              // Formulario de edición
              <View style={estilos.formulario}>
                <View style={estilos.campoFormulario}>
                  <Text style={estilos.etiquetaCampo}>Nombre</Text>
                  <TextInput
                    style={estilos.inputFormulario}
                    value={datosEditados.nombre}
                    onChangeText={(texto) => setDatosEditados({ ...datosEditados, nombre: texto })}
                    placeholder="Tu nombre"
                    placeholderTextColor="#BDBDBD"
                  />
                </View>

                <View style={estilos.campoFormulario}>
                  <Text style={estilos.etiquetaCampo}>Apellido</Text>
                  <TextInput
                    style={estilos.inputFormulario}
                    value={datosEditados.apellido}
                    onChangeText={(texto) => setDatosEditados({ ...datosEditados, apellido: texto })}
                    placeholder="Tu apellido"
                    placeholderTextColor="#BDBDBD"
                  />
                </View>

                <View style={estilos.campoFormulario}>
                  <Text style={estilos.etiquetaCampo}>Edad</Text>
                  <TextInput
                    style={estilos.inputFormulario}
                    value={datosEditados.edad}
                    onChangeText={(texto) => setDatosEditados({ ...datosEditados, edad: texto })}
                    placeholder="Tu edad"
                    placeholderTextColor="#BDBDBD"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={estilos.campoFormulario}>
                  <Text style={estilos.etiquetaCampo}>Fecha de nacimiento (DD/MM/AAAA)</Text>
                  <TextInput
                    style={estilos.inputFormulario}
                    value={datosEditados.fecha_nacimiento}
                    onChangeText={(texto) => setDatosEditados({ ...datosEditados, fecha_nacimiento: texto })}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#BDBDBD"
                  />
                </View>

                <TouchableOpacity
                  style={[estilos.botonGuardar, cargandoActualizacion && estilos.botonDeshabilitado]}
                  onPress={actualizarDatosUsuario}
                  disabled={cargandoActualizacion}
                >
                  {cargandoActualizacion ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={estilos.textoBotonGuardar}>Guardar cambios</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // Vista de datos
              <View style={estilos.datosPersonales}>
                <View style={estilos.filaDatos}>
                  <Text style={estilos.etiquetaDato}>Nombre:</Text>
                  <Text style={estilos.valorDato}>{datosCompletos?.nombre || "No especificado"}</Text>
                </View>

                <View style={estilos.filaDatos}>
                  <Text style={estilos.etiquetaDato}>Apellido:</Text>
                  <Text style={estilos.valorDato}>{datosCompletos?.apellido || "No especificado"}</Text>
                </View>

                <View style={estilos.filaDatos}>
                  <Text style={estilos.etiquetaDato}>Edad:</Text>
                  <Text style={estilos.valorDato}>{datosCompletos?.edad || "No especificada"}</Text>
                </View>

                <View style={estilos.filaDatos}>
                  <Text style={estilos.etiquetaDato}>Fecha de nacimiento:</Text>
                  <Text style={estilos.valorDato}>
                    {datosCompletos?.fecha_nacimiento
                      ? formatearFecha(datosCompletos.fecha_nacimiento)
                      : "No especificada"}
                  </Text>
                </View>

                <View style={estilos.filaDatos}>
                  <Text style={estilos.etiquetaDato}>Correo electrónico:</Text>
                  <Text style={estilos.valorDato}>{datosCompletos?.correo || "No especificado"}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Sección de seguridad */}
          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloTarjeta}>Seguridad</Text>

            <TouchableOpacity style={estilos.opcion} onPress={() => setModalCambioContrasena(true)}>
              <View style={estilos.iconoOpcion}>
                <Feather name="lock" size={20} color="#FFFFFF" />
              </View>
              <View style={estilos.contenidoOpcion}>
                <Text style={estilos.tituloOpcion}>Cambiar contraseña</Text>
                <Text style={estilos.descripcionOpcion}>Actualiza tu contraseña para mayor seguridad</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9E9E9E" />
            </TouchableOpacity>
          </View>

          {/* Botón de cerrar sesión */}
          <TouchableOpacity style={estilos.botonCerrarSesion} onPress={cerrarSesion}>
            <Feather name="log-out" size={20} color="#FFFFFF" />
            <Text style={estilos.textoBotonCerrarSesion}>Cerrar sesión</Text>
          </TouchableOpacity>

          {/* Versión de la app */}
          <Text style={estilos.versionApp}>FertiControl v1.0.0</Text>

          {/* Espacio adicional al final */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal para cambio de contraseña */}
      <Modal
        visible={modalCambioContrasena}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalCambioContrasena(false)}
      >
        <TouchableOpacity style={estilos.fondoModal} activeOpacity={1} onPress={() => setModalCambioContrasena(false)}>
          <View
            style={estilos.contenidoModal}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <Text style={estilos.tituloModal}>Cambiar contraseña</Text>

            <View style={estilos.campoFormulario}>
              <Text style={estilos.etiquetaCampo}>Contraseña actual</Text>
              <View style={estilos.contenedorInputContrasena}>
                <TextInput
                  style={estilos.inputContrasena}
                  value={contrasenas.actual}
                  onChangeText={(texto) => setContrasenas({ ...contrasenas, actual: texto })}
                  placeholder="Ingresa tu contraseña actual"
                  placeholderTextColor="#BDBDBD"
                  secureTextEntry={!mostrarContrasenaActual}
                />
                <TouchableOpacity
                  style={estilos.iconoOjo}
                  onPress={() => setMostrarContrasenaActual(!mostrarContrasenaActual)}
                >
                  <Feather name={mostrarContrasenaActual ? "eye-off" : "eye"} size={18} color="#F48FB1" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={estilos.campoFormulario}>
              <Text style={estilos.etiquetaCampo}>Nueva contraseña</Text>
              <View style={estilos.contenedorInputContrasena}>
                <TextInput
                  style={estilos.inputContrasena}
                  value={contrasenas.nueva}
                  onChangeText={(texto) => setContrasenas({ ...contrasenas, nueva: texto })}
                  placeholder="Ingresa tu nueva contraseña"
                  placeholderTextColor="#BDBDBD"
                  secureTextEntry={!mostrarContrasenaNueva}
                />
                <TouchableOpacity
                  style={estilos.iconoOjo}
                  onPress={() => setMostrarContrasenaNueva(!mostrarContrasenaNueva)}
                >
                  <Feather name={mostrarContrasenaNueva ? "eye-off" : "eye"} size={18} color="#F48FB1" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={estilos.campoFormulario}>
              <Text style={estilos.etiquetaCampo}>Confirmar contraseña</Text>
              <View style={estilos.contenedorInputContrasena}>
                <TextInput
                  style={estilos.inputContrasena}
                  value={contrasenas.confirmar}
                  onChangeText={(texto) => setContrasenas({ ...contrasenas, confirmar: texto })}
                  placeholder="Confirma tu nueva contraseña"
                  placeholderTextColor="#BDBDBD"
                  secureTextEntry={!mostrarContrasenaConfirmar}
                />
                <TouchableOpacity
                  style={estilos.iconoOjo}
                  onPress={() => setMostrarContrasenaConfirmar(!mostrarContrasenaConfirmar)}
                >
                  <Feather name={mostrarContrasenaConfirmar ? "eye-off" : "eye"} size={18} color="#F48FB1" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={estilos.botonesModal}>
              <TouchableOpacity
                style={estilos.botonCancelarModal}
                onPress={() => {
                  setModalCambioContrasena(false)
                  setContrasenas({
                    actual: "",
                    nueva: "",
                    confirmar: "",
                  })
                }}
              >
                <Text style={estilos.textoBotonCancelarModal}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.botonGuardarModal, cargandoActualizacion && estilos.botonDeshabilitado]}
                onPress={cambiarContrasena}
                disabled={cargandoActualizacion}
              >
                {cargandoActualizacion ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotonGuardarModal}>Cambiar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
  tituloEncabezado: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F06292",
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  contenido: {
    flex: 1,
  },
  contenidoScroll: {
    padding: 20,
  },
  seccionAvatar: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F06292",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  textoAvatar: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  nombreUsuario: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 4,
  },
  correoUsuario: {
    fontSize: 14,
    color: "#757575",
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
    marginBottom: 16,
  },
  tituloTarjeta: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#424242",
  },
  botonEditar: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoBotonEditar: {
    fontSize: 14,
    color: "#F06292",
    marginLeft: 4,
  },
  botonCancelar: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoBotonCancelar: {
    fontSize: 14,
    color: "#9E9E9E",
    marginLeft: 4,
  },
  datosPersonales: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
  },
  filaDatos: {
    flexDirection: "row",
    marginBottom: 12,
  },
  etiquetaDato: {
    width: 140,
    fontSize: 14,
    color: "#757575",
  },
  valorDato: {
    flex: 1,
    fontSize: 14,
    color: "#424242",
    fontWeight: "500",
  },
  formulario: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
  },
  campoFormulario: {
    marginBottom: 16,
  },
  etiquetaCampo: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 8,
  },
  inputFormulario: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F5F5F5",
    fontSize: 14,
    color: "#424242",
  },
  botonGuardar: {
    backgroundColor: "#F06292",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#F48FB1",
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
  botonDeshabilitado: {
    backgroundColor: "#F8BBD0",
    shadowOpacity: 0.1,
  },
  opcion: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  opcionSwitch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  iconoOpcion: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F06292",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contenidoOpcion: {
    flex: 1,
  },
  tituloOpcion: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 2,
  },
  descripcionOpcion: {
    fontSize: 12,
    color: "#757575",
  },
  botonCerrarSesion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F44336",
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: "#FFCDD2",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  textoBotonCerrarSesion: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  versionApp: {
    textAlign: "center",
    fontSize: 12,
    color: "#9E9E9E",
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
  fondoModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  contenidoModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  tituloModal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F06292",
    marginBottom: 16,
    textAlign: "center",
  },
  contenedorInputContrasena: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  inputContrasena: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#424242",
  },
  iconoOjo: {
    padding: 8,
  },
  botonesModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  botonCancelarModal: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 8,
  },
  textoBotonCancelarModal: {
    color: "#757575",
    fontSize: 14,
    fontWeight: "bold",
  },
  botonGuardarModal: {
    flex: 1,
    backgroundColor: "#F06292",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#F48FB1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  textoBotonGuardarModal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
})

export default PantallaPerfil
