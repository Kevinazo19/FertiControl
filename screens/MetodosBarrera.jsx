import { Feather } from "@expo/vector-icons"
import { useEffect } from "react"
import {
  BackHandler, Linking, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from "react-native"

const MetodosBarrera = ({ navegarAMain }) => {
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      navegarAMain()
      return true 
    })
    return () => backHandler.remove() 
  }, [navegarAMain])
  const abrirEnlace = async (url) => {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      console.error("No se puede abrir el enlace:", url)
    }
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />

      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <TouchableOpacity style={estilos.botonRegresar} onPress={navegarAMain}>
          <Feather name="arrow-left" size={24} color="#F06292" />
        </TouchableOpacity>
        <Text style={estilos.tituloEncabezado}>Métodos de Barrera</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={estilos.contenido} showsVerticalScrollIndicator={false}>
        {/* Introducción */}
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>¿Qué son los métodos de barrera?</Text>
          <Text style={estilos.textoNormal}>
            Los métodos anticonceptivos de barrera son dispositivos que impiden físicamente que el esperma llegue al
            óvulo, previniendo así el embarazo. Algunos también ofrecen protección contra las infecciones de transmisión
            sexual (ITS).
          </Text>
        </View>

        {/* Condón Masculino */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#F06292" }]}>
              <Feather name="shield" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Condón Masculino</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Funda delgada de látex, poliuretano o poliisopreno que se coloca sobre el pene erecto antes del contacto
            sexual.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>• 98% con uso perfecto{"\n"}• 85% con uso típico</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Protege contra la mayoría de las ITS{"\n"}• Fácil de conseguir y usar{"\n"}• Sin efectos secundarios
              hormonales{"\n"}• Económico
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Puede disminuir la sensibilidad{"\n"}• Debe colocarse correctamente{"\n"}• Puede romperse si no se usa
              adecuadamente{"\n"}• Algunas personas son alérgicas al látex
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Uso correcto:</Text>
            <Text style={estilos.textoInfo}>
              1. Verificar la fecha de caducidad{"\n"}
              2. Abrir el empaque con cuidado (no usar dientes ni tijeras){"\n"}
              3. Colocar en el pene erecto antes de cualquier contacto genital{"\n"}
              4. Dejar espacio en la punta para el semen{"\n"}
              5. Desenrollar hasta la base del pene{"\n"}
              6. Después de la eyaculación, sujetar el condón por la base al retirar el pene{"\n"}
              7. Desechar en la basura, no en el inodoro
            </Text>
          </View>

          <Text style={estilos.notaImportante}>
            ¡IMPORTANTE! Usar un condón nuevo para cada acto sexual. No usar dos condones a la vez.
          </Text>
        </View>

        {/* Condón Femenino */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#EC407A" }]}>
              <Feather name="shield" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Condón Femenino</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Funda de poliuretano o nitrilo con anillos flexibles en ambos extremos que se inserta en la vagina antes del
            contacto sexual.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>• 95% con uso perfecto{"\n"}• 79% con uso típico</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Protege contra la mayoría de las ITS{"\n"}• Puede colocarse hasta 8 horas antes del contacto sexual
              {"\n"}• La mujer tiene el control de su uso{"\n"}• Alternativa para personas alérgicas al látex{"\n"}•
              Cubre más área genital externa
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Menos disponible que el condón masculino{"\n"}• Más costoso{"\n"}• Puede producir ruido durante el acto
              sexual{"\n"}• Requiere práctica para su colocación
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Uso correcto:</Text>
            <Text style={estilos.textoInfo}>
              1. Verificar la fecha de caducidad{"\n"}
              2. Encontrar una posición cómoda (acostada, sentada o en cuclillas){"\n"}
              3. Apretar el anillo interno e insertarlo en la vagina{"\n"}
              4. Empujar con el dedo hasta que el anillo interno cubra el cérvix{"\n"}
              5. El anillo externo debe quedar fuera de la vagina{"\n"}
              6. Guiar el pene dentro del condón durante la penetración{"\n"}
              7. Para retirarlo, girar el anillo externo y tirar suavemente
            </Text>
          </View>
        </View>

        {/* Diafragma */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#D81B60" }]}>
              <Feather name="disc" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Diafragma</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Copa flexible de silicona con forma de domo que se inserta en la vagina para cubrir el cérvix. Debe usarse
            con espermicida.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>• 94% con uso perfecto{"\n"}• 88% con uso típico</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No contiene hormonas{"\n"}• Puede colocarse hasta 2 horas antes del contacto sexual{"\n"}• Reutilizable
              (dura hasta 2 años){"\n"}• No se siente durante el acto sexual
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No protege contra ITS{"\n"}• Requiere ajuste por un profesional de salud{"\n"}• Debe dejarse en su lugar
              6-8 horas después del acto sexual{"\n"}• Puede aumentar el riesgo de infecciones urinarias{"\n"}• El
              espermicida puede causar irritación
            </Text>
          </View>

          <Text style={estilos.notaImportante}>
            Debe ser ajustado por un profesional de salud para asegurar el tamaño correcto.
          </Text>
        </View>

        {/* Capuchón Cervical */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#C2185B" }]}>
              <Feather name="bell" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Capuchón Cervical</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Dispositivo pequeño en forma de copa hecho de silicona que se ajusta firmemente alrededor del cérvix. Se usa
            con espermicida.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>
              • 86% con uso perfecto en mujeres que no han dado a luz{"\n"}• 71% con uso perfecto en mujeres que han
              dado a luz
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Más pequeño que el diafragma{"\n"}• Puede dejarse puesto hasta 48 horas{"\n"}• Reutilizable (dura hasta
              2 años){"\n"}• No interfiere con la sensación durante el acto sexual
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No protege contra ITS{"\n"}• Menos efectivo en mujeres que han dado a luz{"\n"}• Puede ser difícil de
              colocar y retirar{"\n"}• Menos disponible que otros métodos
            </Text>
          </View>
        </View>

        {/* Esponja Anticonceptiva */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#AD1457" }]}>
              <Feather name="circle" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Esponja Anticonceptiva</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Esponja de poliuretano suave impregnada con espermicida que se inserta en la vagina para cubrir el cérvix.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>
              • 91% con uso perfecto en mujeres que no han dado a luz{"\n"}• 80% con uso perfecto en mujeres que han
              dado a luz
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Disponible sin receta médica{"\n"}• Proporciona protección por 24 horas{"\n"}• No requiere ajuste
              profesional{"\n"}• No interfiere con la sensación
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No protege contra ITS{"\n"}• De un solo uso{"\n"}• Puede ser difícil de retirar{"\n"}• El espermicida
              puede causar irritación{"\n"}• Riesgo de Síndrome de Shock Tóxico si se deja más de 30 horas
            </Text>
          </View>
        </View>

        {/* Consideraciones Importantes */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#880E4F" }]}>
              <Feather name="alert-circle" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Consideraciones Importantes</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Protección contra ITS:</Text>
            <Text style={estilos.textoInfo}>
              • Solo los condones (masculinos y femeninos) ofrecen protección contra ITS{"\n"}• Los demás métodos de
              barrera solo previenen embarazos
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Alergias:</Text>
            <Text style={estilos.textoInfo}>
              • Si tienes alergia al látex, busca condones de poliuretano o poliisopreno{"\n"}• Los espermicidas pueden
              causar irritación en algunas personas
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>
              • La efectividad aumenta cuando se usan correctamente y en cada acto sexual{"\n"}• Considerar métodos
              adicionales o de respaldo para mayor protección
            </Text>
          </View>

          <Text style={estilos.notaImportante}>
            Consulta con un profesional de la salud para determinar el método más adecuado para ti.
          </Text>
        </View>

        {/* Recursos */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#F06292" }]}>
              <Feather name="book-open" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Recursos Adicionales</Text>
          </View>

          <TouchableOpacity
            style={estilos.enlace}
            onPress={() => abrirEnlace("https://www.plannedparenthood.org/es/temas-de-salud/anticonceptivos")}
          >
            <Feather name="external-link" size={18} color="#F06292" style={estilos.iconoEnlace} />
            <Text style={estilos.textoEnlace}>Planned Parenthood - Métodos Anticonceptivos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.enlace}
            onPress={() =>
              abrirEnlace("https://www.who.int/es/news-room/fact-sheets/detail/family-planning-contraception")
            }
          >
            <Feather name="external-link" size={18} color="#F06292" style={estilos.iconoEnlace} />
            <Text style={estilos.textoEnlace}>OMS - Planificación Familiar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.enlace}
            onPress={() =>
              abrirEnlace(
                "https://www.mayoclinic.org/es-es/healthy-lifestyle/birth-control/basics/barrier-methods/hlv-20049454",
              )
            }
          >
            <Feather name="external-link" size={18} color="#F06292" style={estilos.iconoEnlace} />
            <Text style={estilos.textoEnlace}>Mayo Clinic - Métodos de Barrera</Text>
          </TouchableOpacity>
        </View>

        {/* Espacio adicional al final */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  botonRegresar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5F7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  tituloEncabezado: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F06292",
  },
  contenido: {
    flex: 1,
    padding: 20,
  },
  seccion: {
    marginBottom: 20,
  },
  tituloSeccion: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 10,
  },
  textoNormal: {
    fontSize: 16,
    color: "#424242",
    lineHeight: 24,
    marginBottom: 10,
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
    alignItems: "center",
    marginBottom: 12,
  },
  iconoTarjeta: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tituloTarjeta: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#424242",
  },
  seccionInfo: {
    marginTop: 12,
    marginBottom: 12,
  },
  subtituloInfo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F06292",
    marginBottom: 6,
  },
  textoInfo: {
    fontSize: 15,
    color: "#424242",
    lineHeight: 22,
  },
  notaImportante: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#D81B60",
    backgroundColor: "#FCE4EC",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    textAlign: "center",
  },
  enlace: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  iconoEnlace: {
    marginRight: 10,
  },
  textoEnlace: {
    fontSize: 15,
    color: "#F06292",
    textDecorationLine: "underline",
  },
})

export default MetodosBarrera
