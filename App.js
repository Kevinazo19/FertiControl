"use client"

import AsyncStorage from "@react-native-async-storage/async-storage"
import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import PantallaCalendarioSimple from "./screens/Calendario"
import PantallaComunidad from "./screens/Comunidad"
import Login from "./screens/Login"
import PantallaHome from "./screens/main"
import MetodosBarrera from "./screens/MetodosBarrera"
import MetodosHormonales from "./screens/MetodosHormonales"
import Perfil from "./screens/perfil"
import PrevencionETS from "./screens/PrevencionETS"
import Registro from "./screens/Registro"

export default function App() {
  const [mostrarPantalla, setMostrarPantalla] = useState("login")
  const [pantallaAnterior, setPantallaAnterior] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const verificarSesion = async () => {
      try {
        setCargando(true)
        const usuarioGuardado = await AsyncStorage.getItem("usuario")

        if (usuarioGuardado) {
          console.log("Usuario encontrado en AsyncStorage:", usuarioGuardado)
          setMostrarPantalla("calendario")
        } else {
          console.log("No se encontró usuario en AsyncStorage")
          setMostrarPantalla("login")
        }
      } catch (error) {
        console.error("Error al verificar sesión:", error)
        setMostrarPantalla("login")
      } finally {
        setCargando(false)
      }
    }

    verificarSesion()
  }, [])

  // Agregar este código justo después de las importaciones
  useEffect(() => {
    // Configurar un manejador global de errores
    const errorHandler = (error, isFatal) => {
      console.error("Error no controlado:", error)
      // Aquí podrías mostrar un mensaje al usuario o realizar alguna acción
    }

    // Establecer el manejador global de errores
    if (global.ErrorUtils) {
      const originalGlobalHandler = global.ErrorUtils.getGlobalHandler()
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        errorHandler(error, isFatal)
        originalGlobalHandler(error, isFatal)
      })
    }

    return () => {
      // Restaurar el manejador original si es necesario
      if (global.ErrorUtils) {
        global.ErrorUtils.setGlobalHandler(global.ErrorUtils.getGlobalHandler())
      }
    }
  }, [])

  // Guardar la pantalla anterior cuando cambia mostrarPantalla
  useEffect(() => {
    if (
      mostrarPantalla !== "perfil" &&
      mostrarPantalla !== "login" &&
      mostrarPantalla !== "prevencionETS" &&
      mostrarPantalla !== "metodosBarrera" &&
      mostrarPantalla !== "metodosHormonales" &&
      mostrarPantalla !== null
    ) {
      setPantallaAnterior(mostrarPantalla)
      console.log("Pantalla anterior guardada:", mostrarPantalla)
    }
  }, [mostrarPantalla])

  // Funciones de navegación
  const navegarARegistro = () => setMostrarPantalla("registro")
  const navegarALogin = () => setMostrarPantalla("login")
  const navegarAMain = () => setMostrarPantalla("main")
  const navegarAComunidad = () => setMostrarPantalla("comunidad")
  const navegarAPerfil = () => setMostrarPantalla("perfil")
  const navegarACalendario = () => setMostrarPantalla("calendario")
  const navegarAPrevencionETS = () => setMostrarPantalla("prevencionETS")
  const navegarAMetodosBarrera = () => setMostrarPantalla("metodosBarrera")
  const navegarAMetodosHormonales = () => setMostrarPantalla("metodosHormonales")

  // Función para volver a la pantalla anterior
  const volverAPantallaAnterior = () => {
    if (pantallaAnterior) {
      setMostrarPantalla(pantallaAnterior)
    } else {
      setMostrarPantalla("main") // Fallback a main si no hay pantalla anterior
    }
  }

  // Pantalla de carga
  if (cargando) {
    return (
      <View style={styles.contenedorCarga}>
        <ActivityIndicator size="large" color="#F06292" />
        <Text style={styles.textoCarga}>Cargando...</Text>
      </View>
    )
  }

  // Renderiza la pantalla correspondiente
  return (
    <View style={styles.container}>
      {mostrarPantalla === "login" && <Login navegarARegistro={navegarARegistro} navegarAMain={navegarAMain} />}
      {mostrarPantalla === "registro" && <Registro navegarALogin={navegarALogin} navegarAMain={navegarAMain} />}
      {mostrarPantalla === "comunidad" && (
        <PantallaComunidad
          navegarAMain={navegarAMain}
          navegarALogin={navegarALogin}
          navegarACalendario={navegarACalendario}
          navegarAPerfil={navegarAPerfil}
        />
      )}
      {mostrarPantalla === "main" && (
        <PantallaHome
          navegarALogin={navegarALogin}
          navegarAComunidad={navegarAComunidad}
          navegarAPerfil={navegarAPerfil}
          navegarACalendario={navegarACalendario}
          navegarAPrevencionETS={navegarAPrevencionETS}
          navegarAMetodosBarrera={navegarAMetodosBarrera}
          navegarAMetodosHormonales={navegarAMetodosHormonales}
        />
      )}
      {mostrarPantalla === "perfil" && (
        <Perfil
          navegarAMain={navegarAMain}
          navegarALogin={navegarALogin}
          navegarACalendario={navegarACalendario}
          navegarAComunidad={navegarAComunidad}
          volverAPantallaAnterior={volverAPantallaAnterior}
          pantallaAnterior={pantallaAnterior}
        />
      )}
      {mostrarPantalla === "calendario" && (
        <PantallaCalendarioSimple
          navegarAMain={navegarAMain}
          navegarAComunidad={navegarAComunidad}
          navegarAPerfil={navegarAPerfil}
        />
      )}
      {mostrarPantalla === "prevencionETS" && <PrevencionETS navegarAMain={navegarAMain} />}
      {mostrarPantalla === "metodosBarrera" && <MetodosBarrera navegarAMain={navegarAMain} />}
      {mostrarPantalla === "metodosHormonales" && <MetodosHormonales navegarAMain={navegarAMain} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contenedorCarga: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF5F7",
  },
  textoCarga: {
    marginTop: 10,
    color: "#F06292",
    fontSize: 16,
  },
})
