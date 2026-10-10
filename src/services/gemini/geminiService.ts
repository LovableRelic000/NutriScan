// Servicio de Chat Inteligente Nutri-AI Pro utilizando Google Gemini REST API
// Cumple con la restricción de costo cero: llamadas REST puras con fetch y header x-goog-api-key

import { APP_CONFIG, GEMINI_API_KEY } from '@/core/config';
import { HealthProfile } from '@/data/models/user';
import { ScanDocument } from '@/data/models/scan';
import { ALLERGY_LABELS, LIFESTYLE_LABELS } from '@/core/constants';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface SendMessageOptions {
  userMessage: string;
  history: ChatMessage[];
  profile?: HealthProfile;
  lastScan?: ScanDocument | null;
}

export class GeminiService {
  /**
   * Construye el prompt de sistema personalizado según el perfil de salud y último escaneo
   */
  static buildSystemInstruction(profile?: HealthProfile, lastScan?: ScanDocument | null): string {
    const allergiesList = profile?.allergies?.length
      ? profile.allergies.map((a) => ALLERGY_LABELS[a]?.name || a).join(', ')
      : 'Ninguna alergia declarada';

    const lifestylesList = profile?.lifestyles?.length
      ? profile.lifestyles.map((l) => LIFESTYLE_LABELS[l]?.name || l).join(', ')
      : 'Dieta regular estándar';

    const customAvoidList = profile?.custom_avoid?.length
      ? profile.custom_avoid.join(', ')
      : 'Ninguno';

    let lastScanContext = 'Sin escaneos recientes en esta sesión.';
    if (lastScan) {
      const flagsText = lastScan.flags?.length
        ? lastScan.flags.map((f) => `${f.ingredient} (${f.reason})`).join('; ')
        : 'Sin alertas detectadas';
      lastScanContext = `Último producto escaneado: ${lastScan.product_name || 'Etiqueta'}, Estado: ${lastScan.status}, Alertas: [${flagsText}].`;
    }

    return `Eres Nutri-AI Pro, un asistente experto en nutrición, seguridad alimentaria y hábitos saludables para la app NutriScan AI.
Tu objetivo es orientar y acompañar al usuario de manera clara, concisa y empática.

PERFIL DE SALUD DEL USUARIO:
- Alergias e intolerancias declaradas (PRIORIDAD MÁXIMA): ${allergiesList}
- Estilo de vida / condición: ${lifestylesList}
- Ingredientes específicos a evitar: ${customAvoidList}
- Contexto de escaneo previo: ${lastScanContext}

REGLAS ESTRICTAS DE COMPORTAMIENTO:
1. Responde siempre en español (México), con tono profesional, cálido y conciso (máximo 2 a 3 párrafos cortos).
2. PRIORIZA SIEMPRE la seguridad ante alérgenos declarados. Si el usuario pregunta por un alimento que contenga o pueda contener sus alérgenos, adviértele enfáticamente.
3. NO diagnostiques enfermedades ni recetes medicamentos de ningún tipo.
4. Si el usuario describe síntomas agudos o sospecha de intoxicación/anafilaxia, indícale de inmediato acudir a urgencias médicas o llamar al 911.
5. Si te preguntan sobre temas totalmente ajenos a alimentación, nutrición, hidratación, actividad física o bienestar (ej. política, programación, etc.), declina amablemente respondiendo que solo estás capacitado en salud y bienestar.
6. Agrega un recordatorio sutil de que tus consejos no sustituyen la valoración médica o nutricional profesional cuando corresponda.`;
  }

  /**
   * Envía la consulta a Gemini API mediante llamada REST directa con fetch
   */
  static async sendMessage({
    userMessage,
    history,
    profile,
    lastScan,
  }: SendMessageOptions): Promise<string> {
    // 1. Validar presencia de API key
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '' || GEMINI_API_KEY.includes('your_gemini_api_key')) {
      throw new Error(
        'Falta configurar la clave de API de Gemini. Agrega tu clave en el archivo .env como EXPO_PUBLIC_GEMINI_API_KEY para habilitar el Asistente Pro.'
      );
    }

    // 2. Limitar turnos de historial en memoria (máximo 12 turnos)
    const recentHistory = history.slice(-APP_CONFIG.CHAT_LIMITS.MAX_HISTORY_TURNS);

    const formattedContents = recentHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // Agregar el mensaje actual del usuario
    formattedContents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${APP_CONFIG.GEMINI_MODEL}:generateContent`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: this.buildSystemInstruction(profile, lastScan) }],
      },
      contents: formattedContents,
      generationConfig: {
        temperature: APP_CONFIG.CHAT_LIMITS.TEMPERATURE,
        maxOutputTokens: APP_CONFIG.CHAT_LIMITS.MAX_OUTPUT_TOKENS,
      },
    };

    // 3. Configurar timeout con AbortController (20 s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, APP_CONFIG.CHAT_LIMITS.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 4. Manejo de códigos de estado HTTP
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Límite de cuota temporal excedido en Gemini. Por favor espera un momento e intenta de nuevo.');
        }
        if (response.status === 400 || response.status === 403) {
          throw new Error('La clave API de Gemini no es válida o no tiene permisos para este modelo.');
        }
        const errorText = await response.text();
        throw new Error(`Error en el servicio de IA (${response.status}): ${errorText.slice(0, 100)}`);
      }

      const data = await response.json();

      // 5. Verificar filtros de seguridad o respuestas bloqueadas
      const candidate = data.candidates?.[0];
      if (!candidate) {
        if (data.promptFeedback?.blockReason) {
          throw new Error(
            `La consulta fue bloqueada por políticas de seguridad: ${data.promptFeedback.blockReason}`
          );
        }
        throw new Error('No se recibió una respuesta válida del asistente.');
      }

      if (candidate.finishReason === 'SAFETY') {
        throw new Error('La respuesta fue bloqueada por políticas de seguridad del modelo.');
      }

      const responseText = candidate.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error('El modelo generó una respuesta vacía.');
      }

      return responseText.trim();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado (20 s). Por favor revisa tu conexión a internet.');
      }
      if (err.message && err.message.includes('Network request failed')) {
        throw new Error('Sin conexión a internet. Verifica tu conexión de red móvil o Wi-Fi.');
      }
      throw err;
    }
  }
}
