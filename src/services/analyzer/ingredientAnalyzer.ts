// Analizador de ingredientes y alérgenos de NutriScan AI
// Módulo TypeScript puro, determinista y 100% testeable (sin dependencias nativas ni de React)

import rulesData from '@/../assets/rules/ingredient_rules.json';
import { HealthProfile } from '@/data/models/user';
import { ScanFlag } from '@/data/models/scan';
import { ScanStatusType } from '@/core/constants';

export interface IngredientRule {
  id: string;
  triggers: string[];
  aliases: string[];
  severity_by_trigger: Record<string, 'danger' | 'caution'>;
  reason: string;
}

export interface AnalysisResult {
  status: ScanStatusType;
  raw_text: string;
  ingredient_section_found: boolean;
  ingredients_text: string;
  traces_text: string;
  flags: ScanFlag[];
  summaryMessage: string;
}

const RULES: IngredientRule[] = rulesData as unknown as IngredientRule[];

/**
 * 1. Normalización de texto:
 * - Quita acentos y marcas diacríticas
 * - Convierte a minúsculas
 * - Une palabras partidas por guion al final de línea (ej: "ingre-\n dientos" -> "ingredientes")
 * - Colapsa espacios y saltos de línea repetidos
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return text
    // Unir palabras partidas por guion y salto de línea
    .replace(/(\w+)-\s*\r?\n\s*(\w+)/g, '$1$2')
    // Reemplazar saltos de línea por espacios
    .replace(/[\r\n]+/g, ' ')
    // Convertir a minúsculas
    .toLowerCase()
    // Normalizar NFD para separar acentos y diacríticos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Reemplazar signos de puntuación no alfanuméricos (manteniendo comas y puntos para separar ingredientes)
    .replace(/[^\w\s,.:;-]/g, ' ')
    // Colapsar espacios múltiples
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 2. Aislamiento de la sección de ingredientes y trazas
 */
export function isolateIngredientSection(normalizedText: string): {
  found: boolean;
  ingredientText: string;
  tracesText: string;
} {
  // Patrones tolerantes para el inicio de ingredientes (OCR suele leer "ingredientes:", "ingred.", "ingredientes :")
  const startPattern = /\b(?:ingredientes?|ingred(?:\.|\b)|ingredients?)\b[:\s-]*/i;
  const matchStart = normalizedText.match(startPattern);

  if (!matchStart || matchStart.index === undefined) {
    // Si el texto completo es razonablemente largo y parece directamente una lista de ingredientes
    // no podemos asegurar 100% que sea la sección de ingredientes oficial de la etiqueta.
    return {
      found: false,
      ingredientText: '',
      tracesText: '',
    };
  }

  const startIndex = matchStart.index + matchStart[0].length;
  let remainingText = normalizedText.slice(startIndex);

  // Patrones de fin de sección de ingredientes
  const endPattern = /\b(?:informacion\s+nutri\w+|declaracion\s+nutri\w+|tabla\s+nutri\w+|elaborado\s+por|hecho\s+en|fabricado\s+por|distribuido\s+por|conservese|fecha\s+de\s+caducidad|lote\s*:|caducidad|nutrition\s+facts)\b/i;
  const matchEnd = remainingText.match(endPattern);

  if (matchEnd && matchEnd.index !== undefined) {
    remainingText = remainingText.slice(0, matchEnd.index);
  }

  // Extraer sección de trazas o advertencias de contaminación cruzada
  // Ejemplos: "puede contener trazas de leche", "contiene: trigo", "elaborado en lineas que procesan mani"
  const tracePattern = /\b(?:puede\s+contener\s*(?:trazas\s*de)?|trazas\s*de|contiene\s*trazas\s*de|elaborado\s*en\s*(?:equipos|lineas)\s*que\s*procesan|may\s+contain)[^.;]+/gi;
  const traceMatches = remainingText.match(tracePattern);
  const tracesText = traceMatches ? traceMatches.join(' ') : '';

  // Remover la advertencia de trazas del cuerpo principal de ingredientes
  const pureIngredientText = remainingText.replace(tracePattern, ' ').trim();

  return {
    found: true,
    ingredientText: pureIngredientText,
    tracesText: tracesText.trim(),
  };
}

/**
 * Escapa caracteres especiales para expresión regular segura
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 3. Búsqueda de alias con límite de palabra estricto
 * Evita falsos positivos como 'sal' dentro de 'salsa' o 'soya' dentro de 'joyas'.
 * Soporta plurales simples en español ('s', 'es').
 */
export function containsAlias(text: string, alias: string): boolean {
  const normAlias = normalizeText(alias);
  if (!normAlias) return false;

  // Si el alias ya tiene múltiples palabras (ej. "suero de leche")
  if (normAlias.includes(' ')) {
    const escaped = escapeRegex(normAlias);
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}(?:s|es)?(?=[^a-z0-9]|$)`, 'i');
    return regex.test(text);
  }

  // Palabra única: usar límite de palabra estricto con soporte de plurales simples
  const escaped = escapeRegex(normAlias);
  const regex = new RegExp(`(^|[^a-z0-9])${escaped}(?:s|es)?(?=[^a-z0-9]|$)`, 'i');
  return regex.test(text);
}

/**
 * 4. Analizador principal con generación de Semáforo:
 * - DANGER: coincide con alergia declarada o celíaco con gluten
 * - CAUTION: coincide con estilo de vida, ingrediente custom_avoid, o traza de alérgeno
 * - SAFE: sección encontrada y cero conflictos
 * - UNVERIFIED: no se encontró sección de ingredientes o texto ilegible/corto (< 15 caracteres)
 */
export function analyzeIngredients(
  rawText: string,
  healthProfile: HealthProfile
): AnalysisResult {
  const normalizedRaw = normalizeText(rawText);

  // Validar longitud mínima legible
  if (!rawText || normalizedRaw.length < 15) {
    return {
      status: 'UNVERIFIED',
      raw_text: rawText,
      ingredient_section_found: false,
      ingredients_text: '',
      traces_text: '',
      flags: [],
      summaryMessage: 'No se pudo verificar, intenta de nuevo con mejor enfoque/luz.',
    };
  }

  const { found, ingredientText, tracesText } = isolateIngredientSection(normalizedRaw);

  if (!found || ingredientText.length < 5) {
    return {
      status: 'UNVERIFIED',
      raw_text: rawText,
      ingredient_section_found: false,
      ingredients_text: '',
      traces_text: '',
      flags: [],
      summaryMessage: 'No se pudo localizar la sección de ingredientes en la etiqueta.',
    };
  }

  const flags: ScanFlag[] = [];
  const registeredRuleIds = new Set<string>();

  // Evaluar perfil del usuario
  const userAllergies = new Set(healthProfile.allergies || []);
  const userLifestyles = new Set(healthProfile.lifestyles || []);
  const userCustomAvoid = healthProfile.custom_avoid || [];

  // Mapeo inteligente: Si el usuario tiene intolerancia a lactosa o lácteos, activar ambos triggers
  if (userAllergies.has('lactose') || userAllergies.has('dairy')) {
    userAllergies.add('dairy');
    userAllergies.add('lactose');
  }

  // Mapeo inteligente de custom_avoid: Si el usuario escribió "intolerancia a la lactosa", "leche", "gluten", etc.,
  // vincular a los triggers canónicos para detectar todos los derivados asociados
  for (const customItem of userCustomAvoid) {
    const norm = normalizeText(customItem);
    if (norm.includes('lactos') || norm.includes('leche') || norm.includes('milk') || norm.includes('dairy')) {
      userAllergies.add('lactose');
      userAllergies.add('dairy');
    }
    if (norm.includes('gluten') || norm.includes('trigo') || norm.includes('wheat')) {
      userAllergies.add('gluten');
    }
    if (norm.includes('cacahuate') || norm.includes('mani') || norm.includes('peanut')) {
      userAllergies.add('peanut');
    }
    if (norm.includes('huevo') || norm.includes('egg')) {
      userAllergies.add('egg');
    }
    if (norm.includes('soya') || norm.includes('soja') || norm.includes('soy')) {
      userAllergies.add('soy');
    }
  }

  // Recorrer el diccionario de reglas
  for (const rule of RULES) {
    // Si esta regla ya fue registrada, saltar
    if (registeredRuleIds.has(rule.id)) continue;

    // Determinar si alguna regla aplica al usuario
    const matchingTriggers = rule.triggers.filter(
      (trigger) => userAllergies.has(trigger as any) || userLifestyles.has(trigger as any)
    );

    if (matchingTriggers.length === 0) continue;

    // Seleccionar el trigger prioritario para no duplicar alertas (ej. entre dairy y lactose)
    let selectedTrigger = matchingTriggers[0];
    if (matchingTriggers.includes('lactose') && (userAllergies.has('lactose') || healthProfile.allergies?.includes('lactose'))) {
      selectedTrigger = 'lactose';
    } else if (matchingTriggers.includes('dairy') && userAllergies.has('dairy')) {
      selectedTrigger = 'dairy';
    }

    // Ordenar alias por longitud descendente para preferir el más específico (ej. "whole milk" sobre "milk")
    const sortedAliases = [...rule.aliases].sort((a, b) => b.length - a.length);

    let ruleMatched = false;

    for (const alias of sortedAliases) {
      const matchInIngredients = containsAlias(ingredientText, alias);
      const matchInTraces = tracesText ? containsAlias(tracesText, alias) : false;

      if (matchInIngredients || matchInTraces) {
        const isAllergy = userAllergies.has(selectedTrigger as any);
        const isCeliacWithGluten = selectedTrigger === 'celiac' || (userLifestyles.has('celiac') && selectedTrigger === 'gluten');

        let category: 'allergen' | 'lifestyle' | 'trace';
        let severity: 'danger' | 'caution';

        if (matchInTraces && !matchInIngredients) {
          category = 'trace';
          severity = 'caution';
        } else if (isAllergy || isCeliacWithGluten) {
          category = 'allergen';
          severity = 'danger';
        } else {
          category = 'lifestyle';
          severity = rule.severity_by_trigger[selectedTrigger] || 'caution';
        }

        flags.push({
          ingredient: alias,
          rule_id: rule.id,
          profile_trigger: selectedTrigger,
          category,
          severity,
          reason: rule.reason,
        });

        registeredRuleIds.add(rule.id);
        ruleMatched = true;
        break; // Detener una vez encontrado el alias más específico para esta regla
      }
    }

    if (ruleMatched) continue;
  }

  // Verificar ingredientes personalizados a evitar (sin duplicar si ya se detectó por regla canónica)
  for (const customItem of userCustomAvoid) {
    const trimmed = customItem.trim();
    if (!trimmed) continue;

    const customKey = `custom.${trimmed.toLowerCase().replace(/\s+/g, '_')}`;
    if (registeredRuleIds.has(customKey)) continue;

    // Si ya existe una bandera con este mismo ingrediente, no duplicar
    const alreadyFlagged = flags.some((f) => f.ingredient.toLowerCase() === trimmed.toLowerCase());
    if (alreadyFlagged) continue;

    if (containsAlias(ingredientText, trimmed)) {
      flags.push({
        ingredient: trimmed,
        rule_id: customKey,
        profile_trigger: 'custom_avoid',
        category: 'lifestyle',
        severity: 'caution',
        reason: 'Ingrediente personalizado configurado en tu perfil para evitar',
      });
      registeredRuleIds.add(customKey);
    }
  }

  // Deduplicación final de banderas para garantizar que nunca se emita la misma advertencia dos veces
  const uniqueFlags: ScanFlag[] = [];
  for (const flag of flags) {
    const isDuplicate = uniqueFlags.some(
      (existing) =>
        existing.ingredient.toLowerCase() === flag.ingredient.toLowerCase() ||
        (existing.reason === flag.reason &&
          (existing.ingredient.toLowerCase().includes(flag.ingredient.toLowerCase()) ||
            flag.ingredient.toLowerCase().includes(existing.ingredient.toLowerCase())))
    );
    if (!isDuplicate) {
      uniqueFlags.push(flag);
    }
  }

  // Determinación del Semáforo
  let status: ScanStatusType = 'SAFE';
  let summaryMessage = 'Producto apto según tu perfil de salud y preferencias.';

  if (userAllergies.size === 0 && userLifestyles.size === 0 && userCustomAvoid.length === 0) {
    summaryMessage = 'Aviso: No tienes alérgenos ni restricciones configuradas en tu perfil. El producto fue verificado pero no hay restricciones activas con las cuales comparar.';
  }

  const hasDanger = uniqueFlags.some((f) => f.severity === 'danger');
  const hasCaution = uniqueFlags.some((f) => f.severity === 'caution');

  if (hasDanger) {
    status = 'DANGER';
    summaryMessage = '¡Cuidado! Se detectaron alérgenos o ingredientes prohibidos para tu perfil.';
  } else if (hasCaution) {
    status = 'CAUTION';
    summaryMessage = 'Revisa con precaución: se encontraron ingredientes contrarios a tu estilo de vida o trazas.';
  }

  return {
    status,
    raw_text: rawText,
    ingredient_section_found: true,
    ingredients_text: ingredientText,
    traces_text: tracesText,
    flags: uniqueFlags,
    summaryMessage,
  };
}
