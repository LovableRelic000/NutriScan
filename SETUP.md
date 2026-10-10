# Guía de Configuración y Ejecución — NutriScan AI

Bienvenido al proyecto **NutriScan AI**. Esta guía detalla paso a paso cómo ejecutar la aplicación tanto en **Expo Go** como mediante un **Development Build** nativo en un dispositivo físico Android (ej. Samsung Galaxy S25 Ultra).

---

## 1. Requisitos Previos

- **Node.js**: Versión 18 o superior (recomendado Node 20 LTS o 22).
- **Git** instalado.
- Dispositivo móvil Android físico con depuración USB activada (o emulador Android).
- Cuenta gratuita en [Firebase Console](https://console.firebase.google.com) (Plan Spark).
- (Opcional para chat Pro) API Key de [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 2. Configuración de Variables de Entorno

1. Copia el archivo de ejemplo a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Completa los valores con la configuración web de tu proyecto Firebase:
   - Ve a Firebase Console -> Configuración del proyecto -> Tus aplicaciones -> Agregar app web (`</>`).
   - Copia las variables correspondientes a `EXPO_PUBLIC_FIREBASE_*`.
3. Agrega tu clave de Gemini en `EXPO_PUBLIC_GEMINI_API_KEY`. Si se deja vacía, el chat Pro indicará claramente que falta la configuración sin provocar fallas en la aplicación.

> **Nota sobre seguridad de variables `EXPO_PUBLIC_*`**:
> En Expo y React Native, las variables con prefijo `EXPO_PUBLIC_` se incrustan en el bundle compilado de la aplicación cliente. Para una demostración académica o prototipo esta es una limitación conocida y aceptada.

---

## 3. Modo 1: Ejecución en Expo Go (Rápido y sin herramientas nativas)

En este modo no necesitas instalar Android Studio ni compilar código nativo.

### Pasos:
1. Instala la app **Expo Go** desde Google Play Store en tu Samsung Galaxy.
2. Inicia el servidor de desarrollo:
   ```bash
   npx expo start
   ```
3. Escanea con la cámara de tu teléfono el código QR mostrado en la terminal (asegúrate de que el teléfono y la PC estén en la misma red Wi-Fi; si hay problemas de red, usa `npx expo start --tunnel`).

### ¿Qué funciona en Expo Go?
- Inicio de sesión anónimo con Firebase Auth y persistencia en AsyncStorage.
- Cloud Firestore (lectura/escritura de perfil, hidratación, actividad, historial).
- Escáner con cámara en vivo (`expo-camera`) y sensor de luz ambiental (`LightSensor`).
- **Modo OCR Manual**: Como el módulo nativo de ML Kit no está compilado dentro de Expo Go, el analizador se ejecuta usando la pantalla de OCR manual (pegar/escribir texto de etiqueta o usar presets), probando el 100% de la lógica de detección de alérgenos y semáforo nutricional.
- Contador de pasos diario con `expo-sensors` (`Pedometer`).
- Registro y recordatorios de hidratación (notificaciones locales).
- Suscripción Pro simulada con autenticación biométrica (`expo-local-authentication`).
- Chat de asistencia nutricional con Google Gemini vía REST.

---

## 4. Modo 2: Development Build (Experiencia Nativa Completa con ML Kit)

Para habilitar el OCR automático en tiempo real con `@react-native-ml-kit/text-recognition`, se genera un Development Build que compila las dependencias de código nativo.

### Requisitos en la PC:
1. **Android Studio**: Descárgalo e instálalo.
2. Durante la instalación de Android Studio, asegúrate de marcar:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (opcional si usas dispositivo físico)
3. Configura las variables de entorno de Windows:
   - Variable de sistema o usuario `ANDROID_HOME`: `C:\Users\<TU_USUARIO>\AppData\Local\Android\Sdk`
   - Agrega a tu `Path`:
     - `%ANDROID_HOME%\platform-tools`
     - `%ANDROID_HOME%\emulator`
4. En tu Samsung Galaxy S25 Ultra:
   - Ajustes -> Acerca del teléfono -> Información de software -> Toca 7 veces "Número de compilación" para activar Opciones de desarrollador.
   - Ajustes -> Opciones de desarrollador -> Activa **Depuración por USB**.
   - Conecta el teléfono a la PC mediante cable USB y autoriza la huella digital de la computadora cuando aparezca el diálogo.
   - Verifica la conexión en consola:
     ```bash
     adb devices
     ```
     (Debe aparecer tu dispositivo listado como `device`).

### Compilar y ejecutar la app en el teléfono:
```bash
npx expo run:android
```
Este comando generará la carpeta nativa Android mediante Continuous Native Generation (CNG), compilará el APK de desarrollo con ML Kit y lo instalará automáticamente en tu dispositivo.

---

## 5. Reglas de Seguridad en Cloud Firestore

En Firebase Console -> Firestore Database -> pestaña "Reglas", pega el contenido de `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## 6. Limitaciones Conocidas y Decisiones de Arquitectura

1. **Persistencia Offline de Firestore**:
   En React Native con el SDK Web de Firebase, la persistencia offline de Firestore está limitada al ciclo de memoria de la sesión (`memoryPersistence`), a diferencia de plataformas web con IndexedDB.
2. **Suscripción Pro Simulada**:
   El estado `is_pro` se actualiza directamente desde el cliente tras la confirmación biométrica simulada. No existen Cloud Functions ni Webhooks de pasarelas de pago reales.
3. **Conteo de Pasos en Segundo Plano**:
   En Android, el sensor `Pedometer` de `expo-sensors` reporta pasos únicamente mientras la aplicación permanece activa o en memoria. Los pasos dados con la aplicación totalmente cerrada no se registran mediante esta API estándar de Expo.
4. **Notificaciones Locales en Android 13+**:
   Se solicita el permiso en tiempo de ejecución `POST_NOTIFICATIONS`. No se utilizan alarmas exactas (`SCHEDULE_EXACT_ALARM`) para garantizar compatibilidad con las políticas de batería de Google Play.
