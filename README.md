# grist-sync-plugin

> **Synchronisez facilement vos données API vers Grist avec support des mises à jour intelligentes.**

Ce plugin permet de transférer des données depuis une API vers la plateforme [Grist](https://www.getgrist.com).

---

## ✨ Fonctionnalités principales

- **Synchronisation flexible** : Trois modes de synchronisation disponibles
  - **Insert** : Ajoute uniquement de nouveaux enregistrements
  - **Update** : Met à jour uniquement les enregistrements existants
  - **Upsert** : Insère ou met à jour automatiquement selon la clé unique
- **Préservation des colonnes personnalisées** : Les colonnes ajoutées manuellement dans Grist ne sont jamais écrasées
- **Dry-run** : Simulez la synchronisation pour voir les changements avant de les appliquer
- **Création automatique des colonnes** : Les colonnes manquantes sont créées automatiquement (optionnel)
- **Mapping flexible** : Mappez les champs API vers les colonnes Grist selon vos besoins
- **Gestion des erreurs détaillée** : Messages d'erreur clairs et solutions suggérées

---

## 🚀 Pour les développeurs

### 🛠 Installation

Clonez le dépôt et installez les dépendances :

```bash
git clone https://github.com/dnum-mi/grist-sync-plugin.git
cd grist-sync-plugin
npm install
```

### ▶️ Lancement en développement

Pour démarrer le projet en mode développement :

```bash
npm run dev
```

### 🧪 Tests

Pour lancer les tests :

```bash
npm test
```

Pour lancer les tests avec la couverture :

```bash
npm run test:coverage
```

### 📦 Build

Pour construire le projet pour la production :

```bash
npm run build
```

### 📁 Structure du projet

- **Interface utilisateur** : [Vue.js](https://vuejs.org/)
- **Sources principales** : dossier `src/`
  - `src/utils/grist.ts` : Client API Grist avec fonctionnalités de synchronisation
  - `src/utils/mapping.ts` : Utilitaires de transformation et mapping des données
  - `src/config.ts` : Configuration et types TypeScript
  - `src/components/` : Composants Vue.js de l'interface

---

## 📖 Guide d'utilisation

### Configuration de la synchronisation

#### Modes de synchronisation

Le plugin propose trois modes de synchronisation :

1. **Upsert (recommandé)** : Insère les nouveaux enregistrements et met à jour les existants
   - Utilise un champ clé unique (par défaut `id`) pour identifier les enregistrements
   - Les colonnes personnalisées dans Grist sont préservées
   - Seules les colonnes mappées sont mises à jour

2. **Insert** : Ajoute uniquement de nouveaux enregistrements
   - N'affecte pas les enregistrements existants
   - Utile pour des logs ou données temporelles

3. **Update** : Met à jour uniquement les enregistrements existants
   - Les enregistrements sans correspondance sont ignorés
   - Utile pour actualiser des données existantes

#### Exemple de configuration

\`\`\`typescript
const config: GristConfig = {
  docId: 'your-doc-id',
  tableId: 'your-table-id',
  apiTokenGrist: 'your-api-token',
  gristApiUrl: 'https://docs.getgrist.com',
  
  // Options de synchronisation
  syncMode: 'upsert',           // 'insert', 'update', ou 'upsert'
  uniqueKeyField: 'id',         // Champ utilisé comme clé unique
  autoCreateColumns: true,      // Créer les colonnes manquantes
  dryRun: false                 // Mode simulation (ne modifie rien si true)
};
\`\`\`

### Utilisation programmatique

\`\`\`typescript
import { GristClient } from './utils/grist';
import type { GristConfig } from './config';

const config: GristConfig = {
  docId: 'abc123',
  tableId: 'Users',
  syncMode: 'upsert',
  uniqueKeyField: 'email'
};

const client = new GristClient(config);

// Synchroniser des données
const records = [
  { email: 'alice@example.com', name: 'Alice', role: 'Admin' },
  { email: 'bob@example.com', name: 'Bob', role: 'User' }
];

const result = await client.syncRecords(records);
console.log(\`\${result.inserted} insertions, \${result.updated} mises à jour\`);
\`\`\`

### Mode Dry-Run (Simulation)

Le mode dry-run permet de voir quels changements seraient appliqués sans les exécuter :

\`\`\`typescript
const config: GristConfig = {
  // ... autres configs
  dryRun: true
};

const client = new GristClient(config);
const result = await client.syncRecords(records);
// Aucune modification appliquée, mais vous voyez le résultat simulé
\`\`\`

### Préservation des colonnes personnalisées

Lors d'un upsert, seules les colonnes présentes dans vos données API sont mises à jour. Les colonnes que vous avez ajoutées manuellement dans Grist (notes, tags, statut, etc.) restent intactes.

**Exemple :**

Table Grist avant synchronisation :
| id | name | email | custom_note | custom_tag |
|----|------|-------|-------------|------------|
| 1  | Alice | alice@example.com | "Important" | "VIP" |

Données API à synchroniser :
\`\`\`json
[
  { "id": 1, "name": "Alice Updated", "email": "alice@example.com" }
]
\`\`\`

Table Grist après synchronisation (mode upsert) :
| id | name | email | custom_note | custom_tag |
|----|------|-------|-------------|------------|
| 1  | Alice Updated | alice@example.com | "Important" | "VIP" |

Les colonnes `custom_note` et `custom_tag` sont préservées ! ✅

---

## 🤝 Contribution

Les contributions sont les bienvenues !  
Pour proposer des améliorations, ouvrez une **issue** ou une **pull request** sur GitHub.

---

**Organisation** : [dnum-mi](https://github.com/dnum-mi)

*Pour toute question ou suggestion, ouvrez une issue sur GitHub.*
