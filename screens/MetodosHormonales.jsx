import { Feather } from "@expo/vector-icons"
import { useEffect } from "react"
import { BackHandler, Linking, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, } from "react-native"

const MetodosHormonales = ({ navegarAMain }) => {
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
        <Text style={estilos.tituloEncabezado}>Métodos Hormonales</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={estilos.contenido} showsVerticalScrollIndicator={false}>
        {/* Introducción */}
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>¿Qué son los métodos hormonales?</Text>
          <Text style={estilos.textoNormal}>
            Los métodos anticonceptivos hormonales utilizan hormonas sintéticas similares a las que produce el cuerpo
            femenino (estrógeno y/o progesterona) para prevenir el embarazo. Actúan principalmente evitando la
            ovulación, espesando el moco cervical y alterando el endometrio.
          </Text>
        </View>

        {/* Píldoras Anticonceptivas */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#EC407A" }]}>
              <Feather name="circle" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Píldoras Anticonceptivas</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Medicamentos orales que contienen hormonas sintéticas. Existen dos tipos principales: combinadas (estrógeno
            y progestina) y minipíldoras (solo progestina).
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>• 99% con uso perfecto{"\n"}• 91% con uso típico</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Alta efectividad cuando se toman correctamente{"\n"}• Regulan el ciclo menstrual{"\n"}• Reducen los
              dolores menstruales{"\n"}• Pueden mejorar el acné{"\n"}• Disminuyen el riesgo de cáncer de ovario y
              endometrio
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Requieren toma diaria a la misma hora{"\n"}• No protegen contra ITS{"\n"}• Pueden causar efectos
              secundarios (náuseas, dolor de cabeza, cambios de humor){"\n"}• Contraindicadas para mujeres con ciertos
              problemas de salud{"\n"}• Pueden interactuar con otros medicamentos
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Uso correcto:</Text>
            <Text style={estilos.textoInfo}>
              • Tomar una píldora diaria a la misma hora{"\n"}• En caso de olvido, seguir las instrucciones del
              prospecto{"\n"}• Consultar con un médico sobre posibles interacciones con otros medicamentos
            </Text>
          </View>

          <Text style={estilos.notaImportante}>
            Requiere prescripción médica. No es recomendable para mujeres mayores de 35 años que fuman o tienen ciertos
            problemas de salud.
          </Text>
        </View>

        {/* Parche Anticonceptivo */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#D81B60" }]}>
              <Feather name="square" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Parche Anticonceptivo</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Parche adhesivo que se coloca en la piel y libera hormonas (estrógeno y progestina) que son absorbidas a
            través de la piel.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>• 99% con uso perfecto{"\n"}• 91% con uso típico</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No requiere uso diario (se cambia semanalmente){"\n"}• Fácil de usar{"\n"}• Efectividad no afectada por
              vómitos o diarrea{"\n"}• Beneficios similares a las píldoras combinadas
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Visible en la piel{"\n"}• No protege contra ITS{"\n"}• Puede despegarse{"\n"}• Puede causar irritación
              en la piel{"\n"}• Mismas contraindicaciones que las píldoras combinadas{"\n"}• Puede ser menos efectivo en
              mujeres con peso superior a 90 kg
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Uso correcto:</Text>
            <Text style={estilos.textoInfo}>
              • Aplicar un nuevo parche cada semana durante 3 semanas{"\n"}• Semana 4 sin parche (período menstrual)
              {"\n"}• Colocar en nalgas, abdomen, parte superior del torso o parte superior externa del brazo{"\n"}•
              Rotar el sitio de aplicación para evitar irritación
            </Text>
          </View>
        </View>

        {/* Anillo Vaginal */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#C2185B" }]}>
              <Feather name="circle" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Anillo Vaginal</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Anillo flexible que se inserta en la vagina y libera hormonas (estrógeno y progestina) que son absorbidas a
            través de la mucosa vaginal.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>• 99% con uso perfecto{"\n"}• 91% con uso típico</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Se cambia solo una vez al mes{"\n"}• No interfiere con el acto sexual{"\n"}• No se siente durante su uso
              {"\n"}• Efectividad no afectada por vómitos o diarrea{"\n"}• Beneficios similares a las píldoras
              combinadas
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No protege contra ITS{"\n"}• Puede causar aumento de flujo vaginal{"\n"}• Algunas mujeres tienen
              dificultad para insertarlo o retirarlo{"\n"}• Mismas contraindicaciones que las píldoras combinadas
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Uso correcto:</Text>
            <Text style={estilos.textoInfo}>
              • Insertar en la vagina y dejar durante 3 semanas{"\n"}• Retirar durante la semana 4 (período menstrual)
              {"\n"}• Insertar un nuevo anillo después de la semana sin anillo
            </Text>
          </View>
        </View>

        {/* Inyección Anticonceptiva */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#AD1457" }]}>
              <Feather name="droplet" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Inyección Anticonceptiva</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Inyección de progestina que previene el embarazo durante 1-3 meses, dependiendo del tipo.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>• 99% con uso perfecto{"\n"}• 94% con uso típico</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No requiere uso diario{"\n"}• Privacidad (nadie sabe que la usas){"\n"}• Puede reducir los dolores
              menstruales{"\n"}• Puede reducir o eliminar los períodos menstruales{"\n"}• Segura durante la lactancia
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No protege contra ITS{"\n"}• Puede causar sangrados irregulares{"\n"}• Puede causar aumento de peso
              {"\n"}• Retorno a la fertilidad puede demorar hasta 10 meses{"\n"}• Requiere visitas regulares al médico
              para las inyecciones
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Tipos comunes:</Text>
            <Text style={estilos.textoInfo}>• Depo-Provera (cada 3 meses){"\n"}• Cyclofem (mensual)</Text>
          </View>
        </View>

        {/* Implante Subdérmico */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#880E4F" }]}>
              <Feather name="minus" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>Implante Subdérmico</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Pequeña varilla flexible que se inserta bajo la piel del brazo y libera progestina de forma continua.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>• Más del 99% (uno de los métodos más efectivos)</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Dura hasta 3-5 años (dependiendo del tipo){"\n"}• No requiere mantenimiento{"\n"}• Muy efectivo{"\n"}•
              Retorno rápido a la fertilidad tras su extracción{"\n"}• Discreto
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No protege contra ITS{"\n"}• Requiere procedimiento médico para inserción y extracción{"\n"}• Puede
              causar sangrados irregulares{"\n"}• Puede causar efectos secundarios como acné, dolor de cabeza o cambios
              de humor
            </Text>
          </View>

          <Text style={estilos.notaImportante}>Es uno de los métodos anticonceptivos más efectivos disponibles.</Text>
        </View>

        {/* DIU Hormonal */}
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezadoTarjeta}>
            <View style={[estilos.iconoTarjeta, { backgroundColor: "#F06292" }]}>
              <Feather name="plus" size={24} color="#FFFFFF" />
            </View>
            <Text style={estilos.tituloTarjeta}>DIU Hormonal</Text>
          </View>

          <Text style={estilos.textoNormal}>
            Dispositivo en forma de T que se coloca dentro del útero y libera progestina localmente.
          </Text>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectividad:</Text>
            <Text style={estilos.textoInfo}>• Más del 99%</Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Ventajas:</Text>
            <Text style={estilos.textoInfo}>
              • Dura entre 3-7 años (dependiendo del tipo){"\n"}• No requiere mantenimiento{"\n"}• Muy efectivo{"\n"}•
              Puede reducir significativamente el sangrado menstrual{"\n"}• Puede eliminar los períodos en algunas
              mujeres{"\n"}• Retorno rápido a la fertilidad tras su extracción
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Desventajas:</Text>
            <Text style={estilos.textoInfo}>
              • No protege contra ITS{"\n"}• Requiere inserción por un profesional médico{"\n"}• Puede causar sangrados
              irregulares inicialmente{"\n"}• Riesgo pequeño de perforación uterina o expulsión{"\n"}• Puede causar
              efectos secundarios hormonales
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Tipos comunes:</Text>
            <Text style={estilos.textoInfo}>
              • Mirena (5-7 años){"\n"}• Kyleena (5 años){"\n"}• Skyla/Jaydess (3 años)
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
            <Text style={estilos.subtituloInfo}>Contraindicaciones:</Text>
            <Text style={estilos.textoInfo}>
              Los métodos hormonales combinados (con estrógeno) no son recomendables para mujeres:{"\n\n"}• Mayores de
              35 años que fuman{"\n"}• Con antecedentes de trombosis o problemas cardiovasculares{"\n"}• Con cáncer de
              mama o antecedentes{"\n"}• Con migrañas con aura{"\n"}• Con presión arterial alta no controlada{"\n"}• Con
              diabetes complicada{"\n"}• Durante la lactancia (primeras 6 semanas)
            </Text>
          </View>

          <View style={estilos.seccionInfo}>
            <Text style={estilos.subtituloInfo}>Efectos secundarios comunes:</Text>
            <Text style={estilos.textoInfo}>
              • Sangrado irregular{"\n"}• Náuseas{"\n"}• Dolor de cabeza{"\n"}• Sensibilidad en los senos{"\n"}• Cambios
              de humor{"\n"}• Cambios en el peso{"\n"}• Acné o mejora del acné
            </Text>
          </View>

          <Text style={estilos.notaImportante}>
            Consulta siempre con un profesional de la salud antes de iniciar o cambiar un método anticonceptivo
            hormonal.
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
            onPress={() =>
              abrirEnlace("https://www.plannedparenthood.org/es/temas-de-salud/anticonceptivos/pildora-anticonceptiva")
            }
          >
            <Feather name="external-link" size={18} color="#F06292" style={estilos.iconoEnlace} />
            <Text style={estilos.textoEnlace}>Planned Parenthood - Métodos Hormonales</Text>
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

export default MetodosHormonales
