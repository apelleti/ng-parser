# Guide d'Utilisation - Optimisation LLM

## Introduction

ng-parser offre maintenant plusieurs niveaux de détail et un système de chunking sémantique pour optimiser l'utilisation avec des LLM (Claude, GPT, etc.).

## Niveaux de Détail

### Vue d'ensemble (Overview)

**Utilisation:** Comprendre rapidement la structure d'un projet

```typescript
import { NgParser } from '@ttwtf/ng-parser';

const parser = new NgParser({ rootDir: './src/app' });
const result = await parser.parse();

// Génère un résumé ultra-compact (5-10% de la taille complète)
const overview = result.toMarkdown('overview');
console.log(overview);
```

**Contenu:**
- Métadonnées du projet
- Comptage des entités (components, services, modules)
- Liste des features détectées
- Patterns architecturaux

**Taille:** ~115 tokens pour 16 entités

### Features

**Utilisation:** Explorer les features d'un projet

```typescript
const features = result.toMarkdown('features');
```

**Contenu:**
- Regroupement par feature (auth/, products/, admin/, etc.)
- Liste compacte des composants et services
- Inputs/outputs principaux
- Dépendances entre features

**Taille:** ~313 tokens pour 16 entités (18% du complet)

### Detailed

**Utilisation:** Analyser en détail sans surcharge

```typescript
const detailed = result.toMarkdown('detailed');
```

**Contenu:**
- Détails complets de chaque entité
- **Architecture:** Relations (Injects, Used by, etc.)
- **Data Flow:** Flux de données pour les services
- Inputs/outputs avec types
- Lifecycle hooks
- **Pas de section Relationships** (économie de tokens)

**Taille:** ~1,248 tokens pour 16 entités (67% du complet)

### Complete

**Utilisation:** Export complet avec toutes les relations

```typescript
const complete = result.toMarkdown('complete');
// ou simplement
const complete = result.toMarkdown(); // défaut
```

**Contenu:**
- Tout ce qui est dans 'detailed'
- Section Relationships complète
- Hiérarchie du projet

**Taille:** ~2,234 tokens pour 16 entités (100%)

## Chunking Sémantique

Pour les projets avec > 100 entités, utilisez le chunking automatique:

```typescript
const { chunks, manifest } = await result.toMarkdownChunked('detailed');

console.log(`Projet divisé en ${chunks.length} chunks`);

// Sauvegarder chaque chunk
chunks.forEach((chunk, index) => {
  fs.writeFileSync(
    `output-chunk-${chunk.metadata.chunkId}.md`,
    chunk.content
  );

  console.log(`Chunk ${chunk.metadata.chunkId}:`);
  console.log(`  Feature: ${chunk.metadata.feature}`);
  console.log(`  Entities: ${chunk.metadata.entities.length}`);
  console.log(`  Tokens: ${chunk.metadata.tokenCount}`);
  console.log(`  Related: ${chunk.metadata.relatedChunks.join(', ')}`);
});

// Sauvegarder le manifest
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
```

### Structure du Manifest

```json
{
  "projectName": "My Angular App",
  "totalEntities": 250,
  "totalChunks": 5,
  "chunks": [
    {
      "chunkId": "chunk-000",
      "feature": "auth",
      "entities": ["LoginComponent", "AuthService", ...],
      "tokenCount": 95000,
      "relatedChunks": ["chunk-001"]
    },
    ...
  ],
  "generated": "2025-10-06T00:00:00.000Z"
}
```

## Stratégies d'Utilisation avec LLM

### Petits Projets (< 50 entités)

```typescript
// Utiliser le niveau 'detailed' directement
const output = result.toMarkdown('detailed');
// Envoyer à Claude/GPT pour analyse
```

### Projets Moyens (50-150 entités)

```typescript
// Option 1: Overview + questions ciblées
const overview = result.toMarkdown('overview');
// Envoyer overview au LLM
// Puis demander des détails sur une feature spécifique

// Option 2: Niveau features
const features = result.toMarkdown('features');
// Bonne vue d'ensemble avec détails modérés
```

### Grands Projets (> 150 entités)

```typescript
// Utiliser le chunking
const { chunks, manifest } = await result.toMarkdownChunked('detailed');

// Stratégie 1: Envoyer le manifest d'abord
// Le LLM comprend la structure globale

// Stratégie 2: Envoyer chunks liés ensemble
const authChunk = chunks.find(c => c.metadata.feature.includes('auth'));
const relatedChunks = authChunk.metadata.relatedChunks
  .map(id => chunks.find(c => c.metadata.chunkId === id));

// Envoyer authChunk + relatedChunks au LLM
```

## Cas d'Usage

### 1. Audit Rapide de Projet

```typescript
const overview = result.toMarkdown('overview');
```

**Prompt LLM:**
> "Voici le résumé d'un projet Angular. Identifie les problèmes architecturaux potentiels et les opportunités d'amélioration."

### 2. Analyse de Feature Spécifique

```typescript
const features = result.toMarkdown('features');
```

**Prompt LLM:**
> "Focus sur la feature 'auth'. Comment améliorer la sécurité et l'UX ?"

### 3. Refactoring

```typescript
const detailed = result.toMarkdown('detailed');
```

**Prompt LLM:**
> "Propose un plan de refactoring pour réduire le couplage entre les services."

### 4. Documentation Auto

```typescript
const complete = result.toMarkdown('complete');
```

**Prompt LLM:**
> "Génère une documentation technique complète pour ce projet, incluant les diagrammes de relations."

### 5. Code Review

```typescript
const { chunks, manifest } = await result.toMarkdownChunked('detailed');

// Envoyer chunk par chunk pour review
for (const chunk of chunks) {
  // Review de chaque feature indépendamment
}
```

## Estimation de Tokens

### Formule
```
tokens ≈ caractères × 0.25
```

### Limites LLM
- Claude 3.5 Sonnet: 200K tokens context
- GPT-4 Turbo: 128K tokens context
- GPT-4o: 128K tokens context

### Calcul pour votre projet

```typescript
const detailed = result.toMarkdown('detailed');
const estimatedTokens = Math.round(detailed.length * 0.25);
console.log(`Estimated tokens: ${estimatedTokens}`);

if (estimatedTokens > 100_000) {
  console.log('⚠️  Recommandé: Utiliser le chunking');
  const { chunks } = await result.toMarkdownChunked('detailed');
  console.log(`✓ Divisé en ${chunks.length} chunks`);
}
```

## Meilleures Pratiques

### 1. Commencer par l'Overview

Toujours envoyer l'overview en premier pour que le LLM comprenne la structure globale.

### 2. Features pour Navigation

Utiliser le niveau 'features' pour identifier quelle partie du code analyser en détail.

### 3. Detailed pour Analyse

Niveau optimal pour la plupart des analyses (architecture, data flow, relations).

### 4. Complete avec Parcimonie

Réserver pour les exports complets ou documentation finale.

### 5. Chunking pour Grands Projets

Au-delà de 100 entités, toujours utiliser le chunking pour éviter de dépasser les limites.

## API Reference

### DetailLevel

```typescript
type DetailLevel = 'overview' | 'features' | 'detailed' | 'complete';
```

### toMarkdown(level?)

```typescript
result.toMarkdown(level?: DetailLevel): string
```

### toMarkdownChunked(level?)

```typescript
result.toMarkdownChunked(level?: DetailLevel): Promise<{
  chunks: SemanticChunk[];
  manifest: ChunkManifest;
}>
```

### SemanticChunk

```typescript
interface SemanticChunk {
  content: string;
  metadata: {
    chunkId: string;
    feature: string;
    entities: string[];
    tokenCount: number;
    relatedChunks: string[];
  };
}
```

## Exemples Complets

### Exemple 1: CLI Simple

```typescript
#!/usr/bin/env node
import { NgParser } from '@ttwtf/ng-parser';
import { writeFileSync } from 'fs';

const [level = 'detailed'] = process.argv.slice(2);

const parser = new NgParser({ rootDir: './src' });
const result = await parser.parse();

const output = result.toMarkdown(level as any);
writeFileSync(`output-${level}.md`, output);

console.log(`✓ Generated ${level} output`);
console.log(`  Size: ${(output.length / 1024).toFixed(1)} KB`);
console.log(`  Tokens: ~${Math.round(output.length * 0.25).toLocaleString()}`);
```

### Exemple 2: Chunking avec Sauvegarde

```typescript
import { NgParser } from '@ttwtf/ng-parser';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const parser = new NgParser({ rootDir: './src' });
const result = await parser.parse();

// Créer dossier de sortie
const outputDir = './llm-chunks';
mkdirSync(outputDir, { recursive: true });

// Générer chunks
const { chunks, manifest } = await result.toMarkdownChunked('detailed');

// Sauvegarder chunks
chunks.forEach(chunk => {
  const path = join(outputDir, `${chunk.metadata.chunkId}.md`);
  writeFileSync(path, chunk.content);
});

// Sauvegarder manifest
writeFileSync(
  join(outputDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log(`✓ Generated ${chunks.length} chunks in ${outputDir}/`);
```

### Exemple 3: Intégration avec Claude API

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { NgParser } from '@ttwtf/ng-parser';

const anthropic = new Anthropic();
const parser = new NgParser({ rootDir: './src' });
const result = await parser.parse();

// Utiliser l'overview pour context initial
const overview = result.toMarkdown('overview');

const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: `Voici un projet Angular:\n\n${overview}\n\nQuelles sont les 3 principales améliorations à apporter ?`
  }]
});

console.log(message.content);
```

## Troubleshooting

### Output trop grand pour LLM

```typescript
// Problème
const output = result.toMarkdown('complete');
// 500K tokens -> dépasse limite

// Solution 1: Réduire le niveau
const output = result.toMarkdown('detailed'); // 67% plus petit

// Solution 2: Utiliser chunking
const { chunks } = await result.toMarkdownChunked('detailed');
// Traiter chunk par chunk
```

### Features non détectées

```typescript
// Vérifier la structure des paths
const features = result.toMarkdown('features');
// Si features ne correspondent pas, vérifier que les paths suivent:
// src/app/[feature-name]/...
```

### Chunks trop nombreux

```typescript
// Augmenter le niveau de détail diminue le nombre de chunks
// overview: plus de chunks (plus petit)
// complete: moins de chunks (plus gros)

const { chunks } = await result.toMarkdownChunked('features'); // Plus de chunks
const { chunks } = await result.toMarkdownChunked('complete'); // Moins de chunks
```
