// Pruebas unitarias completas para el analizador de ingredientes (>= 12 casos)

import {
  analyzeIngredients,
  normalizeText,
  isolateIngredientSection,
  containsAlias,
} from '@/services/analyzer/ingredientAnalyzer';
import { HealthProfile } from '@/data/models/user';

describe('IngredientAnalyzer', () => {
  const baseProfile: HealthProfile = {
    allergies: [],
    lifestyles: [],
    custom_avoid: [],
  };

  describe('1. Normalización y limpieza de texto', () => {
    it('elimina acentos y convierte a minúsculas', () => {
      const input = 'LECHE DESCREMADA, AJONJOLÍ Y CACAHUATE';
      const output = normalizeText(input);
      expect(output).toBe('leche descremada, ajonjoli y cacahuate');
    });

    it('une palabras partidas por guion y salto de línea generadas por OCR', () => {
      const input = 'ingre-\n  dientes: harina de tri-\n  go, leche.';
      const output = normalizeText(input);
      expect(output).toContain('ingredientes:');
      expect(output).toContain('trigo');
    });

    it('colapsa múltiples espacios en blanco y saltos de línea', () => {
      const input = '  ingredientes:    agua,   sal.   \n\n  conservese   ';
      const output = normalizeText(input);
      expect(output).toBe('ingredientes: agua, sal. conservese');
    });
  });

  describe('2. Aislamiento de la sección de ingredientes', () => {
    it('extrae correctamente el contenido hasta la información nutrimental', () => {
      const text = normalizeText('Galletas Oro. Ingredientes: Harina de trigo, azúcar, sal. Información nutrimental por 100g.');
      const { found, ingredientText } = isolateIngredientSection(text);
      expect(found).toBe(true);
      expect(ingredientText).toBe('harina de trigo, azucar, sal.');
    });

    it('identifica y separa las frases de trazas o contaminación cruzada', () => {
      const text = normalizeText('Ingredientes: Maíz tostado, aceite vegetal. Puede contener trazas de leche y soya. Elaborado por Fábrica S.A.');
      const { found, ingredientText, tracesText } = isolateIngredientSection(text);
      expect(found).toBe(true);
      expect(tracesText).toContain('puede contener trazas de leche y soya');
    });

    it('devuelve found=false cuando la palabra ingredientes no está presente', () => {
      const text = normalizeText('Galletas horneadas sabor vainilla, ricas en fibra y minerales.');
      const { found } = isolateIngredientSection(text);
      expect(found).toBe(false);
    });
  });

  describe('3. Detección de alias y falsos positivos (Word Boundaries)', () => {
    it('evita falsos positivos como "sal" dentro de "salsa"', () => {
      const text = 'salsa de tomate tradicional con oregano y albahaca';
      expect(containsAlias(text, 'sal')).toBe(false);
    });

    it('detecta correctamente la palabra "sal" cuando aparece aislada o con puntuación', () => {
      const text = 'tomate triturado, sal, oregano y aceite';
      expect(containsAlias(text, 'sal')).toBe(true);
    });

    it('maneja plurales simples como "cacahuate/cacahuates" y "nuez/nueces"', () => {
      expect(containsAlias('mezcla con cacahuates tostados', 'cacahuate')).toBe(true);
      expect(containsAlias('mezcla con cacahuate tostado', 'cacahuate')).toBe(true);
    });
  });

  describe('4. Semáforo y Reglas de Salud', () => {
    it('DANGER: detecta alérgeno declarado (ej. Alergia a cacahuate)', () => {
      const profile: HealthProfile = {
        allergies: ['peanut'],
        lifestyles: [],
        custom_avoid: [],
      };
      const text = 'Ingredientes: Cacao en polvo, manteca de cacao, cacahuates tostados, azúcar.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('DANGER');
      expect(result.ingredient_section_found).toBe(true);
      expect(result.flags.some((f) => f.rule_id === 'peanut.peanut' && f.severity === 'danger')).toBe(true);
    });

    it('DANGER: detecta gluten para un usuario celíaco estricto', () => {
      const profile: HealthProfile = {
        allergies: [],
        lifestyles: ['celiac'],
        custom_avoid: [],
      };
      const text = 'Ingredientes: Hojuelas de avena integral, jarabe de agave, harina de trigo.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('DANGER');
      expect(result.flags.some((f) => f.category === 'allergen' && f.severity === 'danger')).toBe(true);
    });

    it('CAUTION: advierte a un usuario vegano sobre miel de abeja', () => {
      const profile: HealthProfile = {
        allergies: [],
        lifestyles: ['vegan'],
        custom_avoid: [],
      };
      const text = 'Ingredientes: Harina de almendras, miel de abeja pura, aceite de coco.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('CAUTION');
      expect(result.flags.some((f) => f.rule_id === 'vegan.honey' && f.severity === 'caution')).toBe(true);
    });

    it('CAUTION: advierte a un usuario hipertenso sobre glutamato monosódico (MSG) y sal', () => {
      const profile: HealthProfile = {
        allergies: [],
        lifestyles: ['hypertensive'],
        custom_avoid: [],
      };
      const text = 'Ingredientes: Papa deshidratada, aceite vegetal, sal, glutamato monosodico.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('CAUTION');
      expect(result.flags.some((f) => f.rule_id === 'hypertensive.msg')).toBe(true);
    });

    it('CAUTION: clasifica trazas de un alérgeno como precaución (no como peligro mortal directo)', () => {
      const profile: HealthProfile = {
        allergies: ['dairy'],
        lifestyles: [],
        custom_avoid: [],
      };
      const text = 'Ingredientes: Arroz inflado, azucar, canela. Puede contener trazas de leche y nueces.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('CAUTION');
      expect(result.flags.some((f) => f.category === 'trace' && f.severity === 'caution')).toBe(true);
    });

    it('CAUTION: detecta ingredientes de la lista personalizada custom_avoid', () => {
      const profile: HealthProfile = {
        allergies: [],
        lifestyles: [],
        custom_avoid: ['canela', 'colorante rojo'],
      };
      const text = 'Ingredientes: Harina de arroz, canela molida, azúcar refinada.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('CAUTION');
      expect(result.flags.some((f) => f.profile_trigger === 'custom_avoid')).toBe(true);
    });

    it('SAFE: producto sin conflictos con la sección de ingredientes encontrada', () => {
      const profile: HealthProfile = {
        allergies: ['dairy', 'gluten', 'peanut'],
        lifestyles: ['vegan'],
        custom_avoid: [],
      };
      const text = 'Ingredientes: Manzana deshidratada, agua purificada, jugo concentrado de uva.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('SAFE');
      expect(result.flags.length).toBe(0);
      expect(result.ingredient_section_found).toBe(true);
    });

    it('UNVERIFIED: etiqueta sin sección de ingredientes clara (NUNCA mostrar SAFE)', () => {
      const profile: HealthProfile = {
        allergies: ['dairy'],
        lifestyles: [],
        custom_avoid: [],
      };
      const text = 'Refresco espumoso sabor cola. Conservese en un lugar fresco y seco.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('UNVERIFIED');
      expect(result.ingredient_section_found).toBe(false);
      expect(result.summaryMessage).toContain('No se pudo');
    });

    it('UNVERIFIED: texto excesivamente corto o ilegible por desenfoque', () => {
      const text = 'ingred: ab';
      const result = analyzeIngredients(text, baseProfile);
      expect(result.status).toBe('UNVERIFIED');
    });
    it('DANGER: detecta intolerancia a la lactosa con etiqueta en inglés (whole milk)', () => {
      const profile: HealthProfile = {
        allergies: ['lactose'],
        lifestyles: [],
        custom_avoid: [],
      };
      const text = 'Ingredients: Whole milk, vitamin D3, sugar.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('DANGER');
      expect(result.flags.some((f) => f.rule_id === 'dairy.milk' && f.severity === 'danger')).toBe(true);
    });

    it('DANGER: detecta lácteos cuando el usuario escribió "intolerancia a la lactosa" en custom_avoid', () => {
      const profile: HealthProfile = {
        allergies: [],
        lifestyles: [],
        custom_avoid: ['intolerancia a la lactosa'],
      };
      const text = 'INGREDIENTS: Whole milk, cane sugar, cocoa.';
      const result = analyzeIngredients(text, profile);

      expect(result.status).toBe('DANGER');
      expect(result.flags.some((f) => f.rule_id === 'dairy.milk')).toBe(true);
    });
  });
});
