# Tests - Grist Sync Plugin

Ce document décrit la stratégie de test du plugin Grist Sync.

## 📋 Vue d'ensemble

Le projet dispose de **110 tests unitaires et d'intégration** couvrant :
- **45 tests** pour les utilitaires de mapping et transformation de données
- **38 tests** pour les interactions avec l'API Grist
- **27 tests** pour la gestion des erreurs

## 🛠 Technologies utilisées

- **Vitest** : Framework de test moderne et rapide pour Vite
- **Happy-DOM** : Environnement de test léger pour les composants Vue
- **TypeScript** : Support complet du typage

## 🚀 Commandes de test

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests en mode watch (développement)
npm test -- --watch

# Exécuter les tests avec l'interface UI
npm run test:ui

# Générer un rapport de couverture
npm run test:coverage
```

## 📁 Structure des tests

```
src/utils/__tests__/
├── mapping.test.ts        # Tests des utilitaires de mapping
├── grist.test.ts          # Tests de l'API Grist
└── errorHandler.test.ts   # Tests de gestion d'erreurs
```

## ✅ Tests de mapping (mapping.test.ts)

### Fonctions testées

#### `serializeValue()`
Teste la sérialisation de différents types de données pour Grist :
- ✅ Valeurs null/undefined
- ✅ Dates → ISO string
- ✅ Tableaux → séparation avec `;`
- ✅ Objets → JSON
- ✅ Primitives (nombre, string, boolean)

#### `getNestedValue()`
Teste l'extraction de valeurs dans des objets imbriqués :
- ✅ Chemins simples (`user.name`)
- ✅ Chemins profonds (`user.profile.email`)
- ✅ Gestion des valeurs manquantes
- ✅ Gestion des valeurs null/undefined

#### `transformRecord()` et `transformRecords()`
Teste la transformation de données API vers format Grist :
- ✅ Mapping simple de champs
- ✅ Chemins imbriqués
- ✅ Sérialisation automatique
- ✅ Transformations personnalisées
- ✅ Mappings désactivés
- ✅ Traitement par lot

#### `isValidMapping()` et `getValidMappings()`
Teste la validation des mappings :
- ✅ Détection de mappings valides/invalides
- ✅ Filtrage des mappings valides

#### `extractAllKeys()` et `generateMappingsFromApiData()`
Teste la génération automatique de mappings :
- ✅ Extraction de clés simples et imbriquées
- ✅ Respect de la profondeur maximale
- ✅ Génération automatique de mappings
- ✅ Conversion des chemins en noms de colonnes

## 🌐 Tests d'intégration Grist (grist.test.ts)

### Utilitaires de parsing d'URL

#### `parseGristUrl()` et `isValidGristUrl()`
Teste le parsing d'URLs Grist :
- ✅ URLs Grist standard
- ✅ URLs avec organisation
- ✅ URLs self-hosted
- ✅ URLs avec ports
- ✅ URLs invalides

### Tests de la classe `GristClient`

#### Configuration et initialisation
- ✅ Création d'instance
- ✅ Callback de logging optionnel
- ✅ Headers d'authentification
- ✅ URL par défaut

#### `addRecords()`
Teste l'ajout d'enregistrements :
- ✅ Construction du payload JSON
- ✅ Headers d'authentification
- ✅ URL de l'API correcte
- ✅ Gestion des erreurs HTTP

#### `getRecords()`
Teste la récupération d'enregistrements :
- ✅ Récupération de tous les enregistrements
- ✅ Limite de résultats
- ✅ Gestion des erreurs

#### `getColumns()`
Teste la récupération de colonnes :
- ✅ Récupération de la liste des colonnes
- ✅ Gestion des erreurs

#### `testConnection()`
Teste la connexion à Grist :
- ✅ Connexion réussie
- ✅ Connexion échouée
- ✅ Erreurs réseau

#### `validateApiToken()`
Teste la validation du token API :
- ✅ Token valide
- ✅ Document public sans token
- ✅ Token requis (401)
- ✅ Token invalide (403)
- ✅ Erreurs réseau
- ✅ Codes d'erreur HTTP variés

## ⚠️ Tests de gestion d'erreurs (errorHandler.test.ts)

### `analyzeError()`

Teste l'analyse et le diagnostic d'erreurs :

#### Erreurs CORS
- ✅ Détection d'erreurs CORS explicites
- ✅ Détection via TypeError
- ✅ Solutions adaptées au contexte

#### Erreurs réseau
- ✅ Détection d'erreurs de connexion
- ✅ ECONNREFUSED
- ✅ Mode offline

#### Erreurs HTTP
- ✅ 401 Unauthorized (contextes API et Grist)
- ✅ 403 Forbidden
- ✅ 404 Not Found
- ✅ 422 Unprocessable Entity
- ✅ 500-504 Server Errors
- ✅ Codes d'erreur inconnus

#### Erreurs de format
- ✅ Erreurs de parsing JSON
- ✅ Données invalides

#### Erreurs de timeout
- ✅ Délais d'attente dépassés

#### Adaptation contextuelle
- ✅ Messages adaptés au contexte `grist_sync`
- ✅ Messages adaptés au contexte `api_fetch`

### `formatErrorForLog()` et `formatErrorShort()`

Teste le formatage des erreurs :
- ✅ Format complet pour les logs
- ✅ Format court pour les notifications
- ✅ Inclusion des solutions

## 📊 Couverture de code

Pour générer un rapport de couverture détaillé :

```bash
npm run test:coverage
```

Le rapport sera généré dans le dossier `coverage/` et inclura :
- Un rapport texte dans le terminal
- Un rapport JSON (`coverage/coverage.json`)
- Un rapport HTML interactif (`coverage/index.html`)

## 🔄 Intégration continue

Les tests sont automatiquement exécutés sur chaque commit et pull request via GitHub Actions (à configurer).

## 💡 Bonnes pratiques

1. **Tests isolés** : Chaque test est indépendant et ne dépend pas de l'état d'autres tests
2. **Mocks appropriés** : Utilisation de mocks pour `fetch` dans les tests d'intégration
3. **Tests descriptifs** : Noms de tests clairs en français
4. **Assertions explicites** : Vérifications précises des comportements attendus
5. **Gestion des erreurs** : Tests des cas d'erreur et des edge cases

## 🐛 Debugging

Pour déboguer un test spécifique :

```bash
# Exécuter un seul fichier de test
npm test src/utils/__tests__/mapping.test.ts

# Utiliser l'interface UI pour un debugging interactif
npm run test:ui

# Exécuter avec plus de détails
npm test -- --reporter=verbose
```

## 📝 Ajouter de nouveaux tests

1. Créer un fichier `*.test.ts` dans `src/utils/__tests__/`
2. Importer `describe`, `it`, `expect` depuis `vitest`
3. Structurer les tests par fonctionnalité
4. Exécuter `npm test` pour vérifier

Exemple :

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myModule';

describe('myFunction', () => {
  it('devrait faire quelque chose', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

## 🎯 Résumé

- ✅ **110 tests** couvrent les fonctionnalités principales
- ✅ Tests **unitaires** pour la logique métier
- ✅ Tests **d'intégration** pour l'API Grist
- ✅ Tests de **robustesse UX** via la gestion d'erreurs
- ✅ Tous les tests passent avec succès
