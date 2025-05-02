import { Feather } from "@expo/vector-icons"
import { useEffect } from "react"
import { BackHandler, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"

const PrevencionETS = ({ navegarAMain }) => {

  useEffect(() => {
    const backAction = () => {
      navegarAMain()
      return true
    }

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction)

    return () => backHandler.remove()
  }, [navegarAMain])

  const abrirEnlace = (url) => {
    Linking.openURL(url).catch((err) => console.error("Error al abrir el enlace:", err))
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navegarAMain}>
          <Feather name="arrow-left" size={24} color="#F06292" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prevención de ETS</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Contenido */}
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Información sobre prevención de ETS</Text>
        <Text style={styles.paragraph}>
          La prevención es la mejor estrategia contra las Enfermedades de Transmisión Sexual. Aquí encontrarás
          información importante para proteger tu salud sexual.
        </Text>

        {/* Tarjeta 1 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Feather name="shield" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Uso correcto del condón</Text>
          </View>
          <Text style={styles.cardContent}>
            El condón es uno de los métodos más efectivos para prevenir ETS. Debe usarse en cada relación sexual desde
            el inicio hasta el final del contacto. Asegúrate de:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Verificar la fecha de caducidad</Text>
            <Text style={styles.bulletPoint}>• Abrir el empaque con cuidado</Text>
            <Text style={styles.bulletPoint}>• Colocarlo correctamente dejando espacio en la punta</Text>
            <Text style={styles.bulletPoint}>• Usar uno nuevo para cada acto sexual</Text>
          </View>
        </View>

        {/* Tarjeta 2 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Feather name="check-square" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Pruebas regulares</Text>
          </View>
          <Text style={styles.cardContent}>
            Realizarse pruebas de detección de ETS regularmente es fundamental, especialmente si tienes múltiples
            parejas sexuales. Se recomienda:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Pruebas anuales para VIH, sífilis, clamidia y gonorrea</Text>
            <Text style={styles.bulletPoint}>• Pruebas cada 3-6 meses si tienes múltiples parejas</Text>
            <Text style={styles.bulletPoint}>• Pruebas después de cada nueva pareja sexual</Text>
          </View>
        </View>

        {/* Tarjeta 3 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Feather name="message-circle" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Comunicación con la pareja</Text>
          </View>
          <Text style={styles.cardContent}>
            Hablar abiertamente sobre la salud sexual con tu pareja es esencial para la prevención de ETS:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Discutir el historial sexual y de pruebas</Text>
            <Text style={styles.bulletPoint}>• Acordar métodos de protección</Text>
            <Text style={styles.bulletPoint}>• Comunicar cualquier síntoma o preocupación</Text>
            <Text style={styles.bulletPoint}>• Apoyarse mutuamente en la búsqueda de atención médica</Text>
          </View>
        </View>

        {/* Tarjeta 4 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Feather name="alert-circle" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Síntomas comunes de ETS</Text>
          </View>
          <Text style={styles.cardContent}>Algunos síntomas que podrían indicar una ETS incluyen:</Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Secreción inusual del pene o vagina</Text>
            <Text style={styles.bulletPoint}>• Dolor o ardor al orinar</Text>
            <Text style={styles.bulletPoint}>• Llagas, verrugas o ampollas en genitales</Text>
            <Text style={styles.bulletPoint}>• Dolor durante las relaciones sexuales</Text>
            <Text style={styles.bulletPoint}>• Sangrado vaginal anormal</Text>
            <Text style={styles.bulletPoint}>• Dolor en la parte baja del abdomen</Text>
          </View>
          <Text style={styles.noteText}>
            Nota: Muchas ETS no presentan síntomas. La única forma de estar seguro es realizarse pruebas.
          </Text>
        </View>

        {/* Tarjeta 5 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Feather name="info" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Métodos de prevención adicionales</Text>
          </View>
          <Text style={styles.cardContent}>Además del condón, existen otros métodos preventivos:</Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Vacunación contra VPH y Hepatitis B</Text>
            <Text style={styles.bulletPoint}>• Uso de barreras bucales para sexo oral</Text>
            <Text style={styles.bulletPoint}>• PrEP (profilaxis pre-exposición) para prevenir el VIH</Text>
            <Text style={styles.bulletPoint}>• Abstinencia o relaciones monógamas</Text>
          </View>
        </View>

        {/* Tarjeta 6 - Recursos */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Feather name="link" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Recursos útiles</Text>
          </View>
          <Text style={styles.cardContent}>
            Estos enlaces te pueden proporcionar más información sobre prevención y tratamiento de ETS:
          </Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() =>
              abrirEnlace("https://www.plannedparenthood.org/es/temas-de-salud/enfermedades-de-transmision-sexual-ets")
            }
          >
            <Text style={styles.linkText}>Planned Parenthood - ETS</Text>
            <Feather name="external-link" size={16} color="#F06292" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() =>
              abrirEnlace("https://www.who.int/es/news-room/fact-sheets/detail/sexually-transmitted-infections-(stis)")
            }
          >
            <Text style={styles.linkText}>OMS - Infecciones de transmisión sexual</Text>
            <Feather name="external-link" size={16} color="#F06292" />
          </TouchableOpacity>
        </View>

        {/* Espacio adicional al final */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#424242",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F06292",
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: "#424242",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#F8BBD0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F06292",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#424242",
  },
  cardContent: {
    fontSize: 14,
    lineHeight: 22,
    color: "#616161",
    marginBottom: 8,
  },
  bulletPoints: {
    marginLeft: 8,
    marginTop: 4,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    color: "#616161",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#F06292",
    marginTop: 8,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FCE4EC",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
    color: "#F06292",
    fontWeight: "500",
  },
})

export default PrevencionETS
