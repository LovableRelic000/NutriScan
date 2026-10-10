// Constantes, identificadores canónicos y diccionarios de traducción (ES-MX)

export const CANONICAL_ALLERGIES = [
  'lactose',
  'dairy',
  'gluten',
  'peanut',
  'tree_nut',
  'egg',
  'soy',
  'fish',
  'shellfish',
  'sesame',
] as const;

export type CanonicalAllergy = typeof CANONICAL_ALLERGIES[number];

export const ALLERGY_LABELS: Record<CanonicalAllergy, { name: string; vectorIcon: string; description: string }> = {
  lactose: { name: 'Intolerancia a la Lactosa', vectorIcon: 'cup-water', description: 'Leche (entera, descremada), suero lácteo, lactosa, crema y queso' },
  dairy: { name: 'Lácteos (Proteína de leche)', vectorIcon: 'cow', description: 'Caseína, caseinato, suero de leche, mantequilla y derivados' },
  gluten: { name: 'Gluten / Trigo', vectorIcon: 'barley', description: 'Trigo, harina, cebada, centeno, avena y malta' },
  peanut: { name: 'Cacahuate / Maní', vectorIcon: 'peanut', description: 'Cacahuates, aceite de maní y trazas' },
  tree_nut: { name: 'Frutos secos', vectorIcon: 'nut', description: 'Nueces, almendras, avellanas, pistaches, castañas' },
  egg: { name: 'Huevo', vectorIcon: 'egg', description: 'Huevo entero, clara, albúmina, lecitina de huevo' },
  soy: { name: 'Soya / Soja', vectorIcon: 'seed', description: 'Frijol de soya, lecitina de soya, proteína de soya' },
  fish: { name: 'Pescado', vectorIcon: 'fish', description: 'Atún, salmón, bacalao, aceite de pescado' },
  shellfish: { name: 'Mariscos', vectorIcon: 'jellyfish', description: 'Camarón, cangrejo, langosta, moluscos' },
  sesame: { name: 'Ajonjolí / Sésamo', vectorIcon: 'seed-outline', description: 'Semillas de sésamo, tahini, aceite de ajonjolí' },
};

export const CANONICAL_LIFESTYLES = [
  'vegan',
  'vegetarian',
  'celiac',
  'hypertensive',
  'diabetic',
] as const;

export type CanonicalLifestyle = typeof CANONICAL_LIFESTYLES[number];

export const LIFESTYLE_LABELS: Record<CanonicalLifestyle, { name: string; vectorIcon: string; description: string }> = {
  vegan: { name: 'Vegano', vectorIcon: 'leaf', description: 'Sin ingredientes de origen animal (gelatina, miel, carmín, carnes)' },
  vegetarian: { name: 'Vegetariano', vectorIcon: 'sprout', description: 'Sin carnes rojas, aves ni pescados' },
  celiac: { name: 'Celiaquía estricta', vectorIcon: 'shield-alert', description: 'Tolerancia cero a gluten y trazas' },
  hypertensive: { name: 'Hipertensión (Bajo en Sodio)', vectorIcon: 'heart-pulse', description: 'Alerta sobre sal, sodio añadido, glutamato monosódico (MSG)' },
  diabetic: { name: 'Diabetes (Azúcares controlados)', vectorIcon: 'water-percent', description: 'Alerta sobre jarabes, azúcares añadidos y dextrosa' },
};

export const SCAN_STATUS = {
  SAFE: 'SAFE',
  CAUTION: 'CAUTION',
  DANGER: 'DANGER',
  UNVERIFIED: 'UNVERIFIED',
} as const;

export type ScanStatusType = typeof SCAN_STATUS[keyof typeof SCAN_STATUS];

export const STATUS_DETAILS: Record<
  ScanStatusType,
  { title: string; colorKey: 'safe' | 'caution' | 'danger' | 'unverified'; badge: string; vectorIcon: string }
> = {
  SAFE: {
    title: 'Apto para tu perfil',
    colorKey: 'safe',
    badge: 'SEGURO',
    vectorIcon: 'shield-check',
  },
  CAUTION: {
    title: 'Revisar con precaución',
    colorKey: 'caution',
    badge: 'PRECAUCIÓN',
    vectorIcon: 'alert-circle',
  },
  DANGER: {
    title: 'Contiene alérgenos detectados',
    colorKey: 'danger',
    badge: 'PELIGRO',
    vectorIcon: 'alert-octagon',
  },
  UNVERIFIED: {
    title: 'No se pudo verificar',
    colorKey: 'unverified',
    badge: 'NO VERIFICADO',
    vectorIcon: 'help-circle',
  },
};
