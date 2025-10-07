# ng-parser - Analyse pour Optimisation LLM/RAG

**Version**: 1.4.2
**Date**: 2025-10-06
**Objectif**: Parser Angular optimisé pour étude de code par LLM
**Cas d'usage**: Analyse de codebase Angular par IA (Claude, GPT, etc.)

---

## Table des Matières

1. [Objectif Redéfini](#objectif-redéfini)
2. [Besoins Spécifiques LLM](#besoins-spécifiques-llm)
3. [Analyse des Outputs Actuels](#analyse-des-outputs-actuels)
4. [Gaps Critiques pour LLM](#gaps-critiques-pour-llm)
5. [Améliorations Prioritaires](#améliorations-prioritaires)
6. [Architecture Optimale RAG](#architecture-optimale-rag)
7. [Roadmap Focalisée LLM](#roadmap-focalisée-llm)

---

## Objectif Redéfini

### Use Case Principal

**Vous avez**: Un projet Angular (50-500+ composants)
**Vous voulez**: Comprendre le code via LLM (Claude, GPT)
**Problème**: Le LLM ne peut pas lire 1000+ fichiers directement
**Solution**: ng-parser extrait et structure l'info pour le LLM

### Workflow Cible

```
1. Parser le projet Angular
   ng-parser parse ./src -o output.md

2. Injecter dans LLM
   cat output.md | llm "Explique l'architecture"

3. Questions sur le code
   "Quels composants utilisent HttpClient?"
   "Y a-t-il des problèmes de sécurité?"
   "Comment est organisé le routing?"
```

### Ce qui est CRITIQUE pour ce use case

✅ **ESSENTIEL**:
- Output compact et structuré (< context limit LLM)
- Information hiérarchisée (important → détails)
- Format lisible par LLM (Markdown > JSON)
- Relations explicites entre entities
- Code snippets dans contexte

❌ **PAS PRIORITAIRE**:
- Visualisation HTML interactive
- Quality gates / CI/CD
- Auto-fix suggestions
- Plugin ecosystem
- Business model

---

## Besoins Spécifiques LLM

### Besoin #1: Chunking Intelligent

**Problème**: Context window limité (200K tokens max)

**Exemple réel**:
```bash
# Projet moyen (200 composants)
ng-parser parse ./src -o full.md

# Taille: 15 MB (≈ 4M tokens)
# Context limit: 200K tokens
# Ratio: 20x trop gros ❌
```

**Besoin**:
```typescript
// Chunking sémantique
ng-parser parse ./src --chunk-size 100k --output ./chunks/

Output:
chunks/
├── 00-overview.md        (10K tokens)  ← Architecture globale
├── 01-core-modules.md    (80K tokens)  ← Modules principaux
├── 02-features-auth.md   (70K tokens)  ← Feature auth
├── 03-features-admin.md  (60K tokens)  ← Feature admin
├── 04-shared-ui.md       (50K tokens)  ← Composants UI
└── index.md              (5K tokens)   ← Table des matières
```

**Stratégie de chunking**:
1. **Par feature** (auth, admin, products)
2. **Par type** (core, shared, features)
3. **Par profondeur** (overview → details)
4. **Avec overlap** (context entre chunks)

---

### Besoin #2: Hiérarchie d'Information

**Problème**: Tout traité également → surcharge cognitive LLM

**Mauvais (actuel)**:
```markdown
## Components

### UserProfileComponent
**File**: src/app/user-profile.component.ts:15
**Selector**: app-user-profile
**Standalone**: true
**Inputs**: userId (string)
**Outputs**: userUpdated (EventEmitter<User>)
...

### ButtonComponent
**File**: src/app/button.component.ts:8
**Selector**: app-button
**Standalone**: true
...
```
→ UserProfile et Button ont même importance ❌

**Bon (souhaité)**:
```markdown
# Architecture Overview

## Core Features (Critical)
- **Authentication** (15 components, 8 services)
  - Login flow, JWT handling, guards
- **User Management** (12 components, 5 services)
  - CRUD users, roles, permissions
- **Product Catalog** (20 components, 10 services)
  - Browse, search, cart, checkout

## Shared Infrastructure (Important)
- **UI Library** (30 components)
  - Buttons, forms, tables (generic)
- **Data Layer** (12 services)
  - HTTP, state, cache

## Details
<détails complets seulement si demandés>
```

**Niveaux de granularité**:
1. **L0 - Overview** (1-2 pages) - Architecture, features, tech stack
2. **L1 - Features** (5-10 pages) - Modules, dependencies, flow
3. **L2 - Components** (20-50 pages) - Details par component
4. **L3 - Code** (full dump) - Code snippets complets

---

### Besoin #3: Context Enrichi

**Problème**: Relations implicites → LLM doit deviner

**Mauvais (actuel)**:
```json
{
  "entities": {
    "component:UserListComponent": {
      "name": "UserListComponent",
      "selector": "app-user-list"
    },
    "service:UserService": {
      "name": "UserService"
    }
  },
  "relationships": [
    {
      "source": "component:UserListComponent",
      "target": "UserService",
      "type": "injects"
    }
  ]
}
```
→ LLM doit reconstituer le lien ⚠️

**Bon (souhaité)**:
```markdown
## UserListComponent

**Purpose**: Displays paginated list of users with search/filter

**Architecture**:
- Injects: UserService (data), AuthService (permissions)
- Uses: UserCardComponent (display), PaginationComponent (nav)
- Called by: AdminDashboardComponent, UserManagementComponent
- Routes: /users, /admin/users

**Data Flow**:
1. Component loads → calls UserService.getUsers()
2. UserService → HTTP GET /api/users
3. Results displayed via UserCardComponent
4. User clicks → emits userSelected event

**Code Context**:
```typescript
// File: src/app/users/user-list.component.ts
export class UserListComponent {
  users$ = this.userService.getUsers();

  constructor(
    private userService: UserService,  // ← Data access
    private auth: AuthService          // ← Permissions check
  ) {}
}
```

**Dependencies**:
- UserService: Fetches user data from API
- AuthService: Checks if user can view user list
- UserCardComponent: Renders individual user
```

---

### Besoin #4: Exemples et Patterns

**Problème**: LLM manque de contexte sur l'usage réel

**Besoin**:
```markdown
## Common Patterns in This Codebase

### Authentication Pattern
All protected routes use `AuthGuard`:
```typescript
// Example: src/app/admin/admin-routing.module.ts
{
  path: 'admin',
  canActivate: [AuthGuard],  // ← Pattern utilisé partout
  component: AdminComponent
}
```

### Service Injection Pattern
Services use `providedIn: 'root'`:
```typescript
// Example: src/app/core/user.service.ts
@Injectable({ providedIn: 'root' })  // ← Singleton pattern
export class UserService { }
```

### State Management Pattern
Complex state uses BehaviorSubject + async pipe:
```typescript
// Example: src/app/store/auth.service.ts
private userSubject = new BehaviorSubject<User | null>(null);
user$ = this.userSubject.asObservable();  // ← Observable pattern
```

**Why this matters**: LLM peut identifier divergences
- "Ce composant n'utilise pas AuthGuard, est-ce normal?"
- "Pourquoi ce service n'est pas providedIn: 'root'?"
```

---

### Besoin #5: Semantic Search Metadata

**Problème**: LLM cherche dans texte brut → lent et imprécis

**Besoin**: Metadata pour filtrage sémantique

```markdown
---
entity_type: component
entity_name: UserListComponent
tags: [users, list, admin, crud]
complexity: medium
dependencies: [UserService, AuthService]
uses_http: true
uses_rxjs: true
has_tests: true
security_sensitive: true
performance_notes: [pagination, virtual-scroll]
---

# UserListComponent
...
```

**Usage LLM**:
```
User: "Trouve les composants qui font des appels HTTP sensibles"

LLM: *filtre metadata*
  → security_sensitive: true
  → uses_http: true
→ UserListComponent, PaymentComponent, etc.
```

---

## Analyse des Outputs Actuels

### Output JSON - ❌ Inadapté LLM

**Problème**:
```json
{
  "entities": {
    "component:app:src/app/user.component.ts:UserComponent": {
      "id": "component:app:src/app/user.component.ts:UserComponent",
      "type": "component",
      "name": "UserComponent",
      "location": {
        "filePath": "src/app/user.component.ts",
        "start": 450,
        "end": 1250,
        "line": 15,
        "column": 0
      },
      ...
    }
  }
}
```

**Problèmes pour LLM**:
- ❌ IDs verbeux (`component:app:src/...`)
- ❌ Info redondante (start/end + line/column)
- ❌ Pas hiérarchisé (flat structure)
- ❌ Manque de contexte (pourquoi ce component existe?)
- ❌ Relations dans tableau séparé (doit reconstruire)

**Taille**: 15 MB pour 200 composants → **100x trop gros**

---

### Output Markdown - ⚠️ Mieux mais incomplet

**Actuel**:
```markdown
## Components (42)

### UserComponent
**File**: `src/app/user.component.ts:15`
**Selector**: `app-user`
**Standalone**: true

**Inputs**:
- userId (string)

**Outputs**:
- userUpdated (EventEmitter<User>)
```

**Bon**:
- ✅ Lisible par humain/LLM
- ✅ Structure hiérarchique
- ✅ Format concis

**Manque**:
- ❌ Pas de chunking (1 gros fichier)
- ❌ Pas de hiérarchie (tous components égaux)
- ❌ Context limité (pourquoi? comment utilisé?)
- ❌ Pas d'exemples de code
- ❌ Pas de patterns/conventions

**Taille**: 5 MB pour 200 composants → **Encore 25x trop gros**

---

### Output GraphRAG (JSON-LD) - ❌ Sur-engineered

**Problème**:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareSourceCode",
      "@id": "component:UserComponent",
      "name": "UserComponent",
      "programmingLanguage": "TypeScript"
    }
  ]
}
```

**Problèmes**:
- ❌ Overhead schema.org (inutile pour LLM)
- ❌ Format verbose
- ❌ Pas utilisé par vector DBs populaires
- ❌ "GraphRAG" est buzzword marketing

**Verdict**: Supprimer ou simplifier drastiquement

---

### Output HTML - ❌ Hors sujet pour LLM

**Problème**: Interactive UI avec D3.js

**Verdict**: Utile pour humains, pas pour LLM → basse priorité

---

## Gaps Critiques pour LLM

### Gap #1: Pas de Chunking Sémantique 🔴 CRITIQUE

**Problème**: Output monolithique → inutilisable au-delà de 50 composants

**Impact**:
```
Projet 50 comp   → 2 MB output  → ✅ Ça passe (500K tokens)
Projet 200 comp  → 8 MB output  → ❌ Trop gros (2M tokens)
Projet 500 comp  → 20 MB output → ❌ Impossible (5M tokens)
```

**Solution nécessaire**:
```bash
ng-parser parse ./src --output-mode rag --chunk-size 100k

Output:
rag-output/
├── manifest.json              # Index des chunks
├── 00-overview.md             # Architecture générale
├── 01-core-auth.md            # Feature auth
├── 02-core-products.md        # Feature products
├── 03-shared-ui.md            # Composants UI
└── 04-services-data.md        # Data layer
```

**Algorithme de chunking**:
```typescript
interface Chunk {
  id: string;
  title: string;
  content: string;
  tokens: number;
  metadata: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    topics: string[];
    entities: string[];
  };
  relatedChunks: string[];  // IDs des chunks liés
}

// Chunking strategy
1. Analyse des features (via imports/exports)
2. Groupement par feature
3. Split si chunk > max_tokens
4. Overlap de 10% entre chunks (context)
5. Génération manifest (pour navigation)
```

---

### Gap #2: Pas de Niveaux de Détail 🔴 CRITIQUE

**Problème**: Tout dumped au même niveau

**Solution nécessaire**:
```bash
# Niveau 0: Quick overview (pour comprendre structure)
ng-parser parse ./src --level overview -o overview.md
# → 5 pages, 10K tokens

# Niveau 1: Features (pour comprendre domaines)
ng-parser parse ./src --level features -o features.md
# → 20 pages, 50K tokens

# Niveau 2: Components (pour détails implémentation)
ng-parser parse ./src --level detailed -o detailed.md
# → 100 pages, 250K tokens

# Niveau 3: Full dump (référence complète)
ng-parser parse ./src --level complete -o complete.md
# → 500 pages, 1M+ tokens (multi-fichiers)
```

**Structure par niveau**:

**Level 0 - Overview** (10K tokens):
```markdown
# Project Architecture

## Tech Stack
- Angular 19
- TypeScript 5.6
- RxJS 7
- Angular Material

## Features (6)
1. **Authentication** - Login, JWT, guards
2. **User Management** - CRUD users, roles
3. **Product Catalog** - Browse, search, cart
4. **Orders** - Checkout, payment, history
5. **Admin Dashboard** - Analytics, reports
6. **Settings** - Profile, preferences

## Architecture Patterns
- Feature modules (lazy loaded)
- Standalone components (90%)
- Services with providedIn: 'root'
- RxJS for async (BehaviorSubject pattern)

## Key Metrics
- 42 components
- 15 services
- 8 modules
- Complexity score: 6.5/10
```

**Level 1 - Features** (50K tokens):
```markdown
# Authentication Feature

## Components (5)
- LoginComponent - Main login form
- RegisterComponent - User registration
- ForgotPasswordComponent - Password reset
- VerifyEmailComponent - Email confirmation
- ProfileComponent - User profile view

## Services (3)
- AuthService - Authentication logic
- TokenService - JWT management
- AuthGuard - Route protection

## Flow
User → LoginComponent → AuthService → HTTP → Token → Store → Redirect

## Dependencies
- HttpClient (API calls)
- Router (navigation)
- JwtHelper (token decode)

## Code Patterns
```typescript
// Pattern: Guard pour routes protégées
@Injectable()
export class AuthGuard {
  canActivate() {
    return this.auth.isAuthenticated();
  }
}
```
```

**Level 2 - Detailed** (250K tokens):
```markdown
# LoginComponent (Detailed)

**Location**: src/app/auth/login/login.component.ts:15-89

**Purpose**: Handles user login with email/password

**Architecture**:
```typescript
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule]
})
export class LoginComponent {
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.auth.login(this.loginForm.value)
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err) => this.handleError(err)
      });
  }
}
```

**Data Flow**:
1. User enters email/password
2. Form validation (required, email format)
3. AuthService.login() called
4. HTTP POST to /api/auth/login
5. Token received → stored in localStorage
6. Redirect to /dashboard

**Dependencies**:
- FormBuilder (reactive forms)
- AuthService (authentication)
- Router (navigation)

**Template**:
```html
<form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
  <mat-form-field>
    <input matInput formControlName="email" placeholder="Email">
  </mat-form-field>
  <button mat-raised-button type="submit">Login</button>
</form>
```

**Tests**: ✅ 95% coverage

**Security Notes**:
- Password never logged
- HTTPS required
- Rate limiting on backend
```

---

### Gap #3: Manque de Context Business 🟡 IMPORTANT

**Problème**: LLM voit le code mais pas le "pourquoi"

**Exemple actuel**:
```markdown
### UserListComponent
- Displays list of users
- Has search and filter
```
→ OK mais manque contexte

**Solution**:
```markdown
### UserListComponent

**Business Purpose**:
Allow admins to browse and manage users. Critical for user management workflow.

**User Journey**:
1. Admin clicks "Users" in sidebar
2. List loads with pagination (100 users/page)
3. Admin can search by name/email
4. Admin clicks user → navigates to UserDetailComponent
5. Admin can delete/edit users (requires ADMIN role)

**Business Rules**:
- Only ADMIN and SUPER_ADMIN can access
- Deleted users marked inactive, not removed from DB
- Search is case-insensitive
- Results cached for 5 minutes

**Why This Matters**:
This is a core admin feature used 100+ times/day. Performance is critical.
Security is critical (user data exposure).
```

---

### Gap #4: Pas d'Extraction de Code Pertinent 🟡 IMPORTANT

**Problème**: LLM doit deviner où est le code important

**Solution**: Inclure snippets contextuels

```markdown
### PaymentService

**Key Methods**:

#### processPayment(amount, card)
**Purpose**: Process credit card payment via Stripe

**Code**:
```typescript
async processPayment(amount: number, card: CardInfo): Promise<PaymentResult> {
  // Validation
  if (amount <= 0) throw new Error('Invalid amount');

  // Call Stripe API
  const intent = await this.stripe.createPaymentIntent({
    amount: amount * 100,  // Stripe uses cents
    currency: 'eur',
    payment_method: card.token
  });

  // Confirm payment
  const result = await this.stripe.confirmPayment(intent.id);

  // Store transaction
  await this.db.saveTransaction({
    intentId: intent.id,
    amount,
    status: result.status
  });

  return result;
}
```

**Important Details**:
- Amount converted to cents for Stripe
- Transaction saved to DB even if payment fails (for audit)
- Errors logged to Sentry
- PCI compliance: never log card data

**Called By**: CheckoutComponent, SubscriptionComponent
**Calls**: StripeService, DatabaseService, LoggerService
```

---

### Gap #5: Pas de Vector Embeddings 🟢 NICE-TO-HAVE

**Problème**: Search sémantique lent

**Solution** (future):
```bash
ng-parser parse ./src --embeddings --vector-db chromadb

# Génère:
chunks/
├── chunk-001.md
├── chunk-002.md
└── embeddings.json  # Vectors pour chaque chunk

# Usage avec LLM
llm query "Trouve les composants qui gèrent les paiements"
→ Vector search dans embeddings
→ Retourne chunks pertinents
→ Envoie au LLM
```

**Architecture**:
```typescript
interface ChunkWithEmbedding {
  id: string;
  content: string;
  embedding: number[];  // Vector 1536 dimensions (OpenAI)
  metadata: {
    entity_types: string[];
    has_http: boolean;
    complexity: number;
    topics: string[];
  };
}

// Semantic search
function search(query: string): Chunk[] {
  const queryEmbedding = openai.embed(query);
  return vectorDB.similaritySearch(queryEmbedding, top_k: 5);
}
```

---

## Améliorations Prioritaires

### Priorité 1: Chunking Intelligent 🔴 MUST-HAVE

**Objectif**: Output utilisable pour projets 500+ composants

**Implémentation**:

```typescript
// src/chunking/chunker.ts
class SemanticChunker {
  private maxTokensPerChunk = 100_000;  // ~25K words

  async chunk(result: ParseResult): Promise<Chunk[]> {
    const chunks: Chunk[] = [];

    // 1. Overview chunk (toujours premier)
    chunks.push(this.createOverview(result));

    // 2. Grouper entities par feature
    const features = this.detectFeatures(result.entities);

    for (const feature of features) {
      const featureChunk = this.createFeatureChunk(feature);

      // Si chunk trop gros, split
      if (featureChunk.tokens > this.maxTokensPerChunk) {
        const subChunks = this.splitChunk(featureChunk);
        chunks.push(...subChunks);
      } else {
        chunks.push(featureChunk);
      }
    }

    // 3. Shared/infrastructure chunk
    chunks.push(this.createInfrastructureChunk(result));

    // 4. Ajouter overlap entre chunks
    this.addOverlap(chunks);

    // 5. Générer manifest
    this.generateManifest(chunks);

    return chunks;
  }

  private detectFeatures(entities: Map<string, Entity>): Feature[] {
    // Analyse des imports pour grouper par feature
    const features = new Map<string, Feature>();

    for (const entity of entities.values()) {
      const featureName = this.detectFeature(entity.location.filePath);
      // src/app/auth/** → feature "auth"
      // src/app/products/** → feature "products"

      if (!features.has(featureName)) {
        features.set(featureName, {
          name: featureName,
          entities: [],
          priority: this.calculatePriority(featureName)
        });
      }

      features.get(featureName).entities.push(entity);
    }

    return Array.from(features.values())
      .sort((a, b) => b.priority - a.priority);  // Critical first
  }

  private createOverview(result: ParseResult): Chunk {
    return {
      id: '00-overview',
      title: 'Project Overview',
      content: this.formatOverview(result),
      tokens: this.estimateTokens(content),
      metadata: {
        priority: 'critical',
        topics: ['architecture', 'overview'],
        entities: []
      }
    };
  }

  private addOverlap(chunks: Chunk[]): void {
    // Ajouter 10% de contexte du chunk précédent/suivant
    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1];
      const overlap = this.extractOverlap(prevChunk, 0.1);
      chunks[i].content = overlap + '\n\n---\n\n' + chunks[i].content;
    }
  }
}
```

**Usage**:
```bash
ng-parser parse ./src --chunk-mode semantic --chunk-size 100k -o ./chunks/

Output:
chunks/
├── manifest.json
├── 00-overview.md           (10K tokens)
├── 01-auth.md               (95K tokens)
├── 02-products.md           (98K tokens)
├── 03-orders.md             (85K tokens)
├── 04-admin.md              (92K tokens)
└── 05-shared.md             (70K tokens)
```

**Format manifest.json**:
```json
{
  "chunks": [
    {
      "id": "00-overview",
      "file": "00-overview.md",
      "title": "Project Overview",
      "tokens": 10000,
      "priority": "critical",
      "topics": ["architecture", "features"],
      "relatedChunks": ["01-auth", "02-products"]
    },
    {
      "id": "01-auth",
      "file": "01-auth.md",
      "title": "Authentication Feature",
      "tokens": 95000,
      "priority": "high",
      "topics": ["auth", "security", "login"],
      "entities": ["LoginComponent", "AuthService", "AuthGuard"],
      "relatedChunks": ["00-overview", "05-shared"]
    }
  ],
  "stats": {
    "totalChunks": 6,
    "totalTokens": 450000,
    "maxTokensPerChunk": 100000,
    "features": ["auth", "products", "orders", "admin"]
  }
}
```

**Effort**: 1 semaine
**Impact**: 🚀 **GAME CHANGER** - Rend l'outil utilisable

---

### Priorité 2: Levels of Detail 🔴 MUST-HAVE

**Objectif**: LLM peut choisir le niveau de détail

**Implémentation**:

```typescript
// src/formatters/hierarchical-markdown-formatter.ts
class HierarchicalMarkdownFormatter {
  format(result: ParseResult, level: DetailLevel): string {
    switch (level) {
      case 'overview':
        return this.formatOverview(result);

      case 'features':
        return this.formatFeatures(result);

      case 'detailed':
        return this.formatDetailed(result);

      case 'complete':
        return this.formatComplete(result);
    }
  }

  private formatOverview(result: ParseResult): string {
    return `
# ${result.metadata.projectName || 'Angular Project'}

## Tech Stack
${this.formatTechStack(result)}

## Features (${this.countFeatures(result)})
${this.listFeatures(result)}

## Architecture Patterns
${this.extractPatterns(result)}

## Metrics
- Components: ${this.countByType(result, 'component')}
- Services: ${this.countByType(result, 'service')}
- Modules: ${this.countByType(result, 'module')}
`;
  }

  private formatFeatures(result: ParseResult): string {
    const features = this.detectFeatures(result.entities);

    return features.map(feature => `
# ${feature.name} Feature

## Components (${feature.components.length})
${feature.components.map(c => `- **${c.name}** - ${this.summarize(c)}`).join('\n')}

## Services (${feature.services.length})
${feature.services.map(s => `- **${s.name}** - ${this.summarize(s)}`).join('\n')}

## Flow
${this.describeFlow(feature)}

## Dependencies
${this.listDependencies(feature)}
`).join('\n\n---\n\n');
  }

  private formatDetailed(result: ParseResult): string {
    return Array.from(result.entities.values())
      .map(entity => this.formatEntityDetailed(entity))
      .join('\n\n---\n\n');
  }

  private formatEntityDetailed(entity: Entity): string {
    return `
# ${entity.name}

**Type**: ${entity.type}
**File**: ${entity.location.filePath}:${entity.location.line}

## Purpose
${this.extractPurpose(entity)}

## Code
\`\`\`typescript
${this.extractCode(entity)}
\`\`\`

## Dependencies
${this.formatDependencies(entity)}

## Used By
${this.formatUsedBy(entity)}
`;
  }
}
```

**Usage**:
```bash
# Quick overview
ng-parser parse ./src --level overview -o overview.md

# Feature details
ng-parser parse ./src --level features -o features.md

# Full details
ng-parser parse ./src --level detailed -o detailed.md

# Everything (multi-file output)
ng-parser parse ./src --level complete -o ./complete/
```

**Effort**: 3-4 jours
**Impact**: 🚀 **ESSENTIEL** - Flexibilité LLM

---

### Priorité 3: Code Context Enrichment 🟡 IMPORTANT

**Objectif**: LLM comprend le "pourquoi" pas juste le "quoi"

**Implémentation**:

```typescript
class ContextEnricher {
  enrich(entity: Entity, result: ParseResult): EnrichedEntity {
    return {
      ...entity,

      // Business context
      purpose: this.extractPurpose(entity),
      userJourney: this.describeUserJourney(entity),
      businessRules: this.extractBusinessRules(entity),

      // Technical context
      dataFlow: this.describeDataFlow(entity, result),
      dependencies: this.enrichDependencies(entity, result),
      usedBy: this.findUsedBy(entity, result),

      // Code context
      codeSnippets: this.extractKeyCode(entity),
      patterns: this.identifyPatterns(entity),

      // Metadata
      complexity: this.calculateComplexity(entity),
      importance: this.calculateImportance(entity, result),
      securitySensitive: this.isSecuritySensitive(entity),
      performanceCritical: this.isPerformanceCritical(entity)
    };
  }

  private extractPurpose(entity: Entity): string {
    // 1. JSDoc comment
    if (entity.documentation) {
      return entity.documentation;
    }

    // 2. Infer from name
    // UserListComponent → "Lists users"
    // AuthService → "Handles authentication"

    // 3. Infer from usage
    // Used in AdminComponent → "Admin feature"

    return this.inferPurpose(entity);
  }

  private describeDataFlow(entity: Entity, result: ParseResult): string {
    if (entity.type !== 'component') return '';

    const component = entity as ComponentEntity;
    const flow: string[] = [];

    // Inputs
    if (component.inputs?.length) {
      flow.push(`Receives: ${component.inputs.map(i => i.name).join(', ')}`);
    }

    // Services called
    const services = this.findInjectedServices(component, result);
    if (services.length) {
      flow.push(`Calls: ${services.map(s => s.name).join(', ')}`);
    }

    // HTTP calls
    if (this.makesHttpCalls(component)) {
      flow.push(`Makes HTTP requests`);
    }

    // Outputs
    if (component.outputs?.length) {
      flow.push(`Emits: ${component.outputs.map(o => o.name).join(', ')}`);
    }

    return flow.join(' → ');
  }
}
```

**Output example**:
```markdown
### PaymentComponent

**Purpose**:
Handles credit card payment processing. Critical for checkout flow.

**User Journey**:
1. User fills shipping info → CheckoutComponent
2. User clicks "Pay Now" → PaymentComponent loads
3. User enters card details (Stripe form)
4. Component validates → calls PaymentService.processPayment()
5. Payment processed → success page OR error message

**Data Flow**:
Input: orderTotal (number), orderId (string)
→ Calls: PaymentService.processPayment()
→ PaymentService → HTTP POST /api/payments
→ Stripe API → payment processed
→ Emits: paymentComplete (PaymentResult)
→ Parent: CheckoutComponent → navigates to /order-success

**Code Context**:
```typescript
onSubmit() {
  this.payment.processPayment(this.total, this.cardInfo)
    .subscribe({
      next: (result) => {
        this.paymentComplete.emit(result);  // ← Notifie parent
      },
      error: (err) => {
        this.showError(err);  // ← Gère erreurs
      }
    });
}
```

**Security Notes**:
- Card data handled by Stripe (PCI compliant)
- Never logs sensitive data
- HTTPS required
- Rate limited (10 requests/minute)

**Performance Notes**:
- Payment can take 2-5 seconds
- Loading spinner shown
- Retry logic for network errors
```

**Effort**: 1 semaine
**Impact**: ⭐⭐⭐⭐ - LLM comprend mieux

---

### Priorité 4: Pattern Detection 🟡 IMPORTANT

**Objectif**: LLM voit les patterns du projet

**Implémentation**:

```typescript
class PatternDetector {
  detect(result: ParseResult): Pattern[] {
    const patterns: Pattern[] = [];

    // Authentication pattern
    patterns.push(this.detectAuthPattern(result));

    // State management pattern
    patterns.push(this.detectStatePattern(result));

    // HTTP pattern
    patterns.push(this.detectHttpPattern(result));

    // Routing pattern
    patterns.push(this.detectRoutingPattern(result));

    // Error handling pattern
    patterns.push(this.detectErrorPattern(result));

    return patterns;
  }

  private detectAuthPattern(result: ParseResult): Pattern {
    // Cherche AuthGuard, AuthService, etc.
    const authGuards = this.findByName(result, 'AuthGuard');
    const authServices = this.findByName(result, 'AuthService');

    if (authGuards.length && authServices.length) {
      return {
        name: 'Authentication',
        description: 'Route protection with AuthGuard',
        example: this.extractCodeExample(authGuards[0]),
        usage: `${authGuards.length} guards, ${authServices.length} services`,
        files: [
          ...authGuards.map(g => g.location.filePath),
          ...authServices.map(s => s.location.filePath)
        ]
      };
    }
  }
}
```

**Output**:
```markdown
# Common Patterns in This Project

## 1. Authentication Pattern

**Description**:
All protected routes use `AuthGuard` to check authentication.

**Implementation**:
```typescript
// Pattern used in 15 routes
{
  path: 'admin',
  canActivate: [AuthGuard],  // ← Standard pattern
  component: AdminComponent
}
```

**Files Using This Pattern**:
- src/app/admin/admin-routing.module.ts
- src/app/users/users-routing.module.ts
- src/app/settings/settings-routing.module.ts
- ... (12 more)

---

## 2. State Management Pattern

**Description**:
Services use BehaviorSubject for shared state.

**Implementation**:
```typescript
// Pattern used in 8 services
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();  // ← Observable pattern

  setUser(user: User) {
    this.userSubject.next(user);
  }
}
```

**Services Using This Pattern**:
- UserStateService
- AuthStateService
- CartStateService
- ... (5 more)

---

## 3. HTTP Error Handling

**Description**:
All HTTP errors handled with catchError + toast notification.

**Implementation**:
```typescript
// Pattern used in 20+ services
this.http.get('/api/users').pipe(
  catchError(err => {
    this.toast.error(err.message);  // ← Standard error handling
    return throwError(() => err);
  })
)
```

**Why This Matters for LLM**:
- If a component doesn't use AuthGuard, it's probably a bug
- If a service doesn't use BehaviorSubject, it diverges from pattern
- LLM can spot inconsistencies
```

**Effort**: 3-4 jours
**Impact**: ⭐⭐⭐ - Aide LLM à comprendre conventions

---

### Priorité 5: Metadata pour Filtering 🟢 NICE-TO-HAVE

**Objectif**: LLM peut filtrer avant de lire

**Implémentation**:

```typescript
class MetadataExtractor {
  extract(entity: Entity, result: ParseResult): EntityMetadata {
    return {
      // Basic
      type: entity.type,
      name: entity.name,
      file: entity.location.filePath,

      // Classification
      feature: this.detectFeature(entity),
      layer: this.detectLayer(entity),  // presentation, business, data

      // Flags
      hasHttp: this.hasHttpCalls(entity),
      hasRxjs: this.usesRxjs(entity),
      hasTests: this.hasTests(entity),
      securitySensitive: this.isSecuritySensitive(entity),
      performanceCritical: this.isPerformanceCritical(entity),

      // Metrics
      complexity: this.calculateComplexity(entity),
      dependencies: this.countDependencies(entity),
      usedByCount: this.countUsedBy(entity, result),

      // Tags
      tags: this.generateTags(entity),

      // Business
      importance: this.calculateImportance(entity, result)
    };
  }
}
```

**Output (YAML frontmatter)**:
```markdown
---
type: component
name: PaymentComponent
file: src/app/checkout/payment.component.ts
feature: checkout
layer: presentation
hasHttp: true
hasRxjs: true
hasTests: true
securitySensitive: true
performanceCritical: true
complexity: high
dependencies: 5
usedByCount: 2
tags: [payment, stripe, checkout, critical]
importance: critical
---

# PaymentComponent
...
```

**Usage LLM**:
```python
# Avant de lire, filtrer par metadata
chunks = load_chunks("./output/")

# Trouver composants critiques sécurité
security_critical = [
  c for c in chunks
  if c.metadata.securitySensitive
  and c.metadata.hasHttp
]

# Envoyer seulement ceux-là au LLM
llm.analyze(security_critical)
```

**Effort**: 2-3 jours
**Impact**: ⭐⭐⭐ - Efficacité LLM

---

## Architecture Optimale RAG

### Architecture Complète

```
┌─────────────────────────────────────────────┐
│  ng-parser (Enhanced for LLM)               │
├─────────────────────────────────────────────┤
│                                             │
│  INPUT: Angular Project                     │
│    │                                        │
│    ├─> Parse (existing)                    │
│    │   └─> Entities, Relationships         │
│    │                                        │
│    ├─> Analyze (existing)                  │
│    │   └─> Templates, Styles, Git          │
│    │                                        │
│    ├─> Enrich (NEW)                        │
│    │   ├─> Business context                │
│    │   ├─> Data flow                       │
│    │   ├─> Code snippets                   │
│    │   └─> Patterns                        │
│    │                                        │
│    ├─> Chunk (NEW)                         │
│    │   ├─> Semantic grouping               │
│    │   ├─> Token limit respect             │
│    │   └─> Overlap for context             │
│    │                                        │
│    └─> Format (IMPROVED)                   │
│        ├─> Hierarchical Markdown           │
│        ├─> Metadata (YAML)                 │
│        └─> Multi-level detail              │
│                                             │
│  OUTPUT:                                    │
│    ├─> chunks/ (Markdown files)            │
│    ├─> manifest.json (Navigation)          │
│    └─> metadata/ (Searchable info)         │
│                                             │
└─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│  LLM Processing                             │
├─────────────────────────────────────────────┤
│  1. Load manifest                           │
│  2. Select relevant chunks                  │
│  3. Inject in LLM context                   │
│  4. Ask questions                           │
│  5. Get architectural insights              │
└─────────────────────────────────────────────┘
```

### Workflow Utilisateur

```bash
# 1. Parse projet
ng-parser parse ./src \
  --output-mode llm \
  --chunk-size 100k \
  --level detailed \
  --output ./llm-output/

# Output:
llm-output/
├── manifest.json
├── 00-overview.md
├── 01-auth.md
├── 02-products.md
└── ...

# 2. Utiliser avec LLM

# 2a. Quick overview
cat llm-output/00-overview.md | llm "Résume l'architecture"

# 2b. Question spécifique
cat llm-output/manifest.json | jq '.chunks[] | select(.topics[] == "auth")'
cat llm-output/01-auth.md | llm "Y a-t-il des failles de sécurité?"

# 2c. Deep dive
cat llm-output/01-auth.md llm-output/05-shared.md | \
  llm "Explique comment fonctionne l'authentification"

# 3. Analyse globale (si projet petit)
cat llm-output/*.md | llm "Analyse complète du projet"
```

### Format Output Optimal

**Structure dossier**:
```
llm-output/
├── manifest.json           # Navigation
├── metadata/
│   ├── entities.json       # Index des entities
│   └── patterns.json       # Patterns détectés
├── chunks/
│   ├── 00-overview.md      # Vue d'ensemble
│   ├── 01-auth.md          # Feature auth
│   ├── 02-products.md      # Feature products
│   └── ...
└── complete/               # Full dump (si nécessaire)
    └── full-dump.md
```

**Format chunk**:
```markdown
---
id: 01-auth
title: Authentication Feature
tokens: 95000
priority: high
topics: [auth, security, login, jwt]
entities: [LoginComponent, AuthService, AuthGuard]
relatedChunks: [00-overview, 05-shared]
metadata:
  hasHttp: true
  hasSecurity: true
  complexity: medium
---

# Authentication Feature

## Table of Contents
- [Overview](#overview)
- [Components](#components)
- [Services](#services)
- [Flow](#flow)
- [Security](#security)
- [Code Examples](#code-examples)

## Overview

**Purpose**: Handle user authentication with JWT tokens

**User Journey**:
1. User visits /login
2. Enters credentials
3. LoginComponent → AuthService → HTTP POST /api/auth/login
4. Token received → stored
5. Redirect to dashboard

**Business Rules**:
- Email/password required
- Token expires after 24h
- Max 5 login attempts
- Password reset via email

## Components

### LoginComponent
**File**: src/app/auth/login/login.component.ts:15

**Purpose**: Login form with validation

**Code**:
```typescript
export class LoginComponent {
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  onSubmit() {
    this.auth.login(this.loginForm.value)
      .subscribe(/* ... */);
  }
}
```

**Dependencies**:
- AuthService (authentication logic)
- FormBuilder (reactive forms)
- Router (navigation)

**Used By**: AppComponent (main routing)

---

### RegisterComponent
...

## Services

### AuthService
**File**: src/app/core/auth/auth.service.ts:25

**Purpose**: Manages authentication state and API calls

**Key Methods**:

#### login(credentials)
```typescript
login(credentials: LoginCredentials): Observable<User> {
  return this.http.post<AuthResponse>('/api/auth/login', credentials)
    .pipe(
      map(response => {
        this.tokenService.saveToken(response.token);  // Store JWT
        this.userSubject.next(response.user);         // Update state
        return response.user;
      }),
      catchError(err => {
        this.logger.error('Login failed', err);       // Log error
        return throwError(() => err);
      })
    );
}
```

**Dependencies**:
- HttpClient (API calls)
- TokenService (JWT storage)
- LoggerService (error tracking)

**Called By**: LoginComponent, RegisterComponent

---

## Flow

```
User (browser)
  │
  ├─> LoginComponent
  │     │
  │     ├─> Validates form
  │     │
  │     └─> AuthService.login()
  │           │
  │           ├─> HTTP POST /api/auth/login
  │           │     │
  │           │     └─> Backend validates credentials
  │           │           │
  │           │           └─> Returns JWT token + user
  │           │
  │           ├─> TokenService.saveToken()
  │           │     └─> localStorage.setItem('token', ...)
  │           │
  │           └─> Updates user$ BehaviorSubject
  │
  └─> Router.navigate('/dashboard')
        │
        └─> AuthGuard checks token
              └─> Allows access
```

## Security

**Vulnerabilities Checked**:
- ✅ Password never logged
- ✅ HTTPS enforced
- ✅ CSRF protection (tokens)
- ✅ XSS protection (Angular sanitization)

**Security Patterns**:
1. JWT stored in localStorage (considered secure for this use case)
2. Token validated on every request (AuthInterceptor)
3. Rate limiting on backend (10 requests/min)

**Known Issues**:
- ⚠️ Password reset link doesn't expire (TODO: add expiration)

## Code Examples

### Pattern: Protected Route
```typescript
// Used in 15 routes
{
  path: 'admin',
  canActivate: [AuthGuard],  // ← Check authentication
  component: AdminComponent
}
```

### Pattern: HTTP with Auth
```typescript
// AuthInterceptor adds token automatically
this.http.get('/api/users')  // ← Token added by interceptor
```

## Related Chunks
- [00-overview.md](00-overview.md) - Project architecture
- [05-shared.md](05-shared.md) - Shared services (HTTP, Logger)
```

---

## Roadmap Focalisée LLM

### Phase 1: Chunking & Hierarchy (2 semaines) 🔴 CRITIQUE

**Objectif**: Output utilisable pour projets 500+ composants

**Tasks**:
1. Implémenter SemanticChunker
   - Détection de features
   - Groupement par feature
   - Split si > max tokens
   - Overlap entre chunks
   - Effort: 1 semaine

2. Implémenter HierarchicalFormatter
   - Level overview
   - Level features
   - Level detailed
   - Level complete
   - Effort: 3 jours

3. Générer manifest.json
   - Index des chunks
   - Metadata par chunk
   - Navigation graph
   - Effort: 1 jour

4. Tests & validation
   - Tester sur small/medium/large projects
   - Vérifier token counts
   - Valider chunking quality
   - Effort: 2 jours

**Deliverable**: v2.0-llm

---

### Phase 2: Context Enrichment (1 semaine) 🟡 IMPORTANT

**Objectif**: LLM comprend le "pourquoi"

**Tasks**:
1. ContextEnricher
   - Extract purpose
   - Describe data flow
   - Business rules
   - Effort: 3 jours

2. PatternDetector
   - Detect common patterns
   - Code examples
   - Usage stats
   - Effort: 2 jours

3. CodeExtractor
   - Key method extraction
   - Relevant snippets
   - Context around code
   - Effort: 2 jours

**Deliverable**: v2.1-llm

---

### Phase 3: Metadata & Filtering (3 jours) 🟢 NICE-TO-HAVE

**Objectif**: LLM peut filtrer efficacement

**Tasks**:
1. MetadataExtractor
   - YAML frontmatter
   - Tags generation
   - Classification
   - Effort: 2 jours

2. Manifest enrichment
   - Searchable metadata
   - Filtering helpers
   - Effort: 1 jour

**Deliverable**: v2.2-llm

---

### Phase 4: Vector Embeddings (future) 🟢 OPTIONAL

**Objectif**: Semantic search

**Tasks**:
1. Embedding generation
   - OpenAI API integration
   - Cohere API integration
   - Effort: 2 jours

2. Vector DB export
   - ChromaDB format
   - Pinecone format
   - Weaviate format
   - Effort: 3 jours

3. Search helpers
   - Semantic search CLI
   - Query interface
   - Effort: 2 jours

**Deliverable**: v2.3-llm

---

## Résumé: Ce qui Compte VRAIMENT

### Pour votre use case (LLM analysis)

**✅ ESSENTIEL (faire maintenant)**:
1. **Chunking intelligent** → Projets > 100 composants utilisables
2. **Levels of detail** → LLM choisit granularité
3. **Context enrichment** → LLM comprend le "pourquoi"

**⚠️ UTILE (faire bientôt)**:
4. **Pattern detection** → LLM voit conventions du projet
5. **Metadata filtering** → Efficacité accrue

**❌ PAS PRIORITAIRE (ignorer)**:
- HTML visualization
- Quality gates / CI/CD
- Plugin ecosystem
- GitHub integration
- Migration tools
- Business model

### Quick Wins Immédiats

**Cette semaine**:
```bash
# 1. Ajouter option --chunk-mode
ng-parser parse ./src --chunk-mode feature --chunk-size 100k -o ./chunks/

# 2. Ajouter option --level
ng-parser parse ./src --level overview -o overview.md
ng-parser parse ./src --level detailed -o detailed.md
```

**Impact**: 🚀 **Utilisable dès maintenant** pour projets moyens/grands

---

## Conclusion

### État Actuel pour LLM

**ng-parser v1.4**:
- ✅ Parse correctement les entities Angular
- ✅ Extract relationships
- ⚠️ Output trop gros (inutilisable > 100 composants)
- ⚠️ Manque contexte business
- ⚠️ Pas de chunking

**Score pour LLM**: 5/10

### État Cible pour LLM

**ng-parser v2.2-llm**:
- ✅ Chunking intelligent (projets 1000+ composants)
- ✅ Hierarchical output (overview → details)
- ✅ Context enrichment (business + technical)
- ✅ Pattern detection (conventions visibles)
- ✅ Metadata filtering (efficacité++)

**Score cible**: 9/10

### Effort Total

- **Phase 1** (chunking + hierarchy): 2 semaines
- **Phase 2** (context enrichment): 1 semaine
- **Phase 3** (metadata): 3 jours

**Total**: ~4 semaines de dev

**ROI**: Tool inutilisable → Tool indispensable pour LLM analysis

---

**Rapport généré**: 2025-10-06
**Focus**: LLM/RAG optimization
**Next step**: Implémenter SemanticChunker

*Fin de l'analyse focalisée LLM*
