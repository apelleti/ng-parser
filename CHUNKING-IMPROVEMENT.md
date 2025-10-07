# Amélioration du Chunking - v1.5.1

## Problème Identifié

Lors du parsing d'Angular Material Components (1,310 entités), le chunking initial produisait seulement **2 chunks**:
- ❌ `chunk-000`: 224K tokens (1,219 entities) → **TROP GROS** pour LLM
- ✓ `chunk-001`: 14K tokens (91 entities) → OK

**Problème**: Le chunk-000 dépassait largement la limite de 200K tokens des LLM et même la limite cible de 100K tokens.

## Solution Implémentée

Ajout d'une méthode `splitLargeFeature()` dans `SemanticChunker` qui:

1. **Détecte les features trop grandes** (> 100K tokens)
2. **Les subdivise automatiquement** en chunks plus petits (~50 entités par chunk)
3. **Maintient la cohérence** en gardant le nom de la feature avec partie (1/N, 2/N, etc.)

### Code Ajouté

```typescript
private splitLargeFeature(
  feature: string,
  entities: Entity[],
  level: DetailLevel,
  startIndex: number
): SemanticChunk[] {
  const chunks: SemanticChunk[] = [];
  const entitiesPerChunk = Math.ceil(entities.length / Math.ceil(entities.length / 50));

  for (let i = 0; i < entities.length; i += entitiesPerChunk) {
    const chunkEntities = entities.slice(i, i + entitiesPerChunk);
    const partNumber = Math.floor(i / entitiesPerChunk) + 1;
    const totalParts = Math.ceil(entities.length / entitiesPerChunk);

    // Créer chunk avec nom "feature (part X/Y)"
    // ...
  }

  return chunks;
}
```

## Résultats

### Angular Material Components (1,310 entités)

**AVANT (v1.5.0):**
```
2 chunks total
- chunk-000: 224K tokens (1,219 entities) ❌ Inutilisable
- chunk-001: 14K tokens (91 entities) ✓
```

**APRÈS (v1.5.1):**
```
26 chunks total
- chunk-000 à chunk-024: core (parts 1/25 à 25/25)
  → Range: 731 - 15,912 tokens
  → Moyenne: ~9,000 tokens
- chunk-025: autres features (14K tokens)

✅ TOUS les chunks < 100K tokens
✅ TOUS les chunks utilisables avec LLM
```

### Distribution des Tokens

| Chunk | Feature | Tokens | Entities |
|-------|---------|--------|----------|
| chunk-000 | core (part 1/25) | 5,878 | 49 |
| chunk-001 | core (part 2/25) | 6,077 | 49 |
| chunk-002 | core (part 3/25) | 12,416 | 49 |
| ... | ... | ... | ... |
| chunk-024 | core (part 25/25) | 13,791 | 43 |
| chunk-025 | scenes, shared, pages, scene-viewer | 14,103 | 91 |

**Total: 26 chunks | ~238K tokens au total | ~9K tokens par chunk**

## Impact

### Avant
- ❌ 1 chunk inutilisable (224K tokens > limite LLM)
- ✓ 1 chunk utilisable
- **Taux d'utilisabilité: 50%**

### Après
- ✅ 26 chunks utilisables (tous < 100K tokens)
- ✅ Taille optimale pour LLM (~9K tokens/chunk)
- **Taux d'utilisabilité: 100%**

### Bénéfices

1. **Utilisabilité totale**: Tous les chunks peuvent être envoyés à un LLM
2. **Granularité fine**: 26 chunks permettent une analyse ciblée
3. **Flexibilité**: Possibilité de combiner 10-15 chunks (~90-150K tokens)
4. **Navigation**: Parties numérotées facilitent la progression (1/25, 2/25...)

## Utilisation

### Analyse Séquentielle
```bash
# Analyser chunk par chunk
for i in {000..025}; do
  cat output-components/chunks/chunk-$i.md | analyze-with-llm
done
```

### Analyse Par Groupe
```bash
# Analyser les 10 premiers chunks du core (~90K tokens)
cat output-components/chunks/chunk-{000..009}.md | analyze-with-llm

# Analyser les autres features
cat output-components/chunks/chunk-025.md | analyze-with-llm
```

### Navigation Intelligente
```bash
# 1. Voir l'overview
cat output-components/angular-material.overview.md

# 2. Explorer les features
cat output-components/angular-material.features.md

# 3. Identifier chunks pertinents dans manifest
cat output-components/chunks/manifest.json

# 4. Analyser chunks ciblés
cat output-components/chunks/chunk-005.md  # Exemple: focus sur CDK
```

## Fichiers Modifiés

- `src/formatters/semantic-chunker.ts`:
  - Ajout méthode `splitLargeFeature()`
  - Modification de `createChunks()` pour appeler la subdivision
  - ~50 lignes ajoutées

## Tests

Les tests existants continuent de passer:
- ✅ `semantic-chunker.test.ts` (14 tests)
- ✅ Cas d'usage réels validés avec Angular Material

## Version

- **Précédente**: v1.5.0 (chunking basique)
- **Actuelle**: v1.5.1 (chunking avec subdivision automatique)
- **Breaking Changes**: Aucun
- **Backward Compatible**: Oui

## Prochaines Améliorations

1. **Chunking intelligent par module**: Regrouper par modules Angular plutôt que par nombre d'entités
2. **Overlap configurable**: Permettre de configurer le taux d'overlap entre chunks
3. **Stratégie de subdivision personnalisable**: Permettre différentes stratégies (par type, par dépendances, etc.)

## Conclusion

Le chunking amélioré permet maintenant d'analyser des projets Angular de toute taille avec un LLM, en garantissant que chaque chunk reste dans les limites de contexte.

**Amélioration mesurable:**
- 2 chunks → 26 chunks
- 50% utilisable → 100% utilisable
- 1 chunk inutilisable supprimé
- Granularité 13x meilleure
