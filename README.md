# grist-sync-plugin

> **Synchronisez facilement vos données API vers Grist.**

Ce plugin permet de transférer des données depuis une API vers la plateforme [Grist](https://www.getgrist.com).

## ✨ Nouveautés

### Auto-détection de la configuration

Le plugin peut désormais **détecter automatiquement** l'URL et le token d'API Grist lorsqu'il est utilisé comme Custom Widget dans Grist ! Plus besoin de saisir manuellement ces informations.

📖 **Consultez le [guide d'auto-détection](docs/AUTO_DETECTION.md)** pour plus de détails.

### Installation et configuration automatique (NEW!)

Le plugin dispose maintenant d'un **système CLI** pour configurer et exécuter automatiquement la synchronisation entre Grist et des sources externes.

---

## 🚀 Démarrage rapide

### Installation

Clonez le dépôt et installez les dépendances :

```bash
git clone https://github.com/dnum-mi/grist-sync-plugin.git
cd grist-sync-plugin
npm install
```

### Configuration automatique avec le CLI

Le plugin inclut un script CLI pour configurer automatiquement votre synchronisation :

```bash
# Configuration des variables d'environnement
export GRIST_API_URL="https://docs.getgrist.com"
export GRIST_DOC_ID="your-doc-id"
export GRIST_TABLE_ID="your-table-id"
export GRIST_API_TOKEN="your-api-token"
export SOURCE_URL="https://api.example.com/data"
export SOURCE_TYPE="rest"

# Lancer le setup
npm run cli:setup

# Test optionnel de la synchronisation
npm run cli:setup -- --test-sync
```

Le script va :
1. ✅ Vérifier l'accessibilité de Grist
2. ✅ Tester la connexion à votre source de données
3. ✅ Créer un fichier de configuration `config/grist-sync.json`
4. ✅ Valider que tout est prêt pour la synchronisation

### Lancer une synchronisation

Une fois configuré, lancez la synchronisation :

```bash
npm run sync
```

---

## 📖 Configuration détaillée

### Variables d'environnement

| Variable | Description | Obligatoire | Défaut |
|----------|-------------|-------------|--------|
| `GRIST_API_URL` | URL de l'API Grist | Non | `https://docs.getgrist.com` |
| `GRIST_DOC_ID` | ID du document Grist | **Oui** | - |
| `GRIST_TABLE_ID` | ID de la table Grist | **Oui** | - |
| `GRIST_API_TOKEN` | Token d'API Grist | Non* | - |
| `SOURCE_TYPE` | Type de source (`rest`, `mock`) | Non | `rest` |
| `SOURCE_URL` | URL de l'API source | Dépend du type | - |
| `SYNC_MODE` | Mode de sync (`add`, `update`, `upsert`) | Non | `upsert` |
| `SYNC_UNIQUE_KEY` | Clé unique pour déduplication | Non | `id` |
| `AUTO_CREATE_COLUMNS` | Créer colonnes automatiquement | Non | `true` |

\* Requis pour les documents privés

### Fichier de configuration

Le fichier `config/grist-sync.json` est généré automatiquement par le CLI. Exemple :

```json
{
  "grist": {
    "docId": "YOUR_DOC_ID",
    "tableId": "YOUR_TABLE_ID",
    "gristApiUrl": "https://docs.getgrist.com",
    "apiToken": "${GRIST_API_TOKEN}"
  },
  "source": {
    "type": "rest",
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}"
    }
  },
  "mapping": {
    "id": "id",
    "name": "name",
    "email": "email"
  },
  "sync": {
    "mode": "upsert",
    "uniqueKey": "id",
    "schedule": "0 */6 * * *",
    "autoCreateColumns": true
  }
}
```

⚠️ **Sécurité** : Les tokens sont remplacés par des références aux variables d'environnement (`${VAR_NAME}`). Ne commitez jamais de secrets en clair !

### Exemple de mapping

Un fichier d'exemple est fourni dans `config/mapping.example.json`. Vous pouvez le personnaliser :

```json
{
  "mapping": {
    "grist_field": "source_field",
    "user_id": "id",
    "full_name": "name",
    "contact_email": "email",
    "creation_date": "createdAt"
  }
}
```

Le mapping supporte les **champs imbriqués** avec la notation point :

```json
{
  "mapping": {
    "user_id": "data.user.id",
    "user_name": "data.user.profile.name",
    "company": "data.company.name"
  }
}
```

---

## 🎨 Interface utilisateur (Onboarding)

Le plugin inclut une interface Vue pour configurer visuellement votre synchronisation :

```bash
npm run dev
```

L'interface permet de :
- 📝 Saisir les credentials Grist et source
- 🔗 Tester les connexions
- 🗺️ Configurer le mapping JSON
- ▶️ Lancer une synchronisation manuelle
- 📊 Voir les résultats en temps réel

---

## 🔄 Modes de synchronisation

Le plugin supporte trois modes :

### Mode `add` (Ajouter uniquement)
Ajoute uniquement les nouveaux enregistrements. N'écrase jamais les données existantes.

```bash
export SYNC_MODE="add"
```

### Mode `update` (Mise à jour uniquement)
Met à jour uniquement les enregistrements existants (nécessite `uniqueKey`).

```bash
export SYNC_MODE="update"
export SYNC_UNIQUE_KEY="id"
```

### Mode `upsert` (Ajouter ou mettre à jour)
Ajoute les nouveaux enregistrements et met à jour les existants (nécessite `uniqueKey`).

```bash
export SYNC_MODE="upsert"
export SYNC_UNIQUE_KEY="id"
```

---

## 🛠 Développement

### Structure du projet

```
grist-sync-plugin/
├── src/
│   ├── cli/              # Scripts CLI
│   │   ├── setup.ts      # Configuration automatique
│   │   └── sync.ts       # Exécution de la sync
│   ├── sync/             # Service de synchronisation
│   │   ├── syncService.ts
│   │   ├── types.ts
│   │   └── providers/    # Providers de sources
│   │       └── restProvider.ts
│   ├── ui/               # Interface Vue
│   │   └── Onboarding.vue
│   ├── utils/            # Utilitaires existants
│   └── components/       # Composants Vue existants
├── config/
│   ├── mapping.example.json   # Exemple de mapping
│   └── grist-sync.json        # Config générée (ignoré par git)
├── tests/                # Tests unitaires et E2E
└── .github/workflows/    # CI/CD
```

### Lancement en développement

```bash
npm run dev
```

### 🐳 Tester avec Docker (Grist local)

Pour tester le plugin avec une instance Grist locale via Docker Compose :

```bash
docker-compose up -d
```

Grist sera accessible sur http://localhost:8484

📖 **Consultez le [guide de configuration Docker](docs/DOCKER_SETUP.md)** pour plus de détails.

---

## 🧪 Tests

Le projet dispose de trois types de tests :

### Tests unitaires (Vitest)

```bash
npm run test              # Exécution des tests
npm run test:ui          # Interface graphique
npm run test:coverage    # Rapport de couverture
```

### Tests d'intégration

Les tests d'intégration valident :
- ✅ Le service de synchronisation
- ✅ Les providers (REST, Mock)
- ✅ Le mapping de champs
- ✅ La création automatique de colonnes
- ✅ Les modes de synchronisation (add/update/upsert)

### Tests E2E (Playwright)

```bash
npm run test:e2e         # Exécution des tests E2E
npm run test:e2e:ui      # Interface graphique Playwright
npm run test:e2e:debug   # Mode debug
```

📖 **Consultez le [guide des tests Playwright](docs/PLAYWRIGHT_TESTS.md)** pour plus de détails.

---

## 🔐 Sécurité

### Gestion des secrets

- ⚠️ **Ne commitez jamais** de tokens ou credentials en clair
- ✅ Utilisez des **variables d'environnement** pour tous les secrets
- ✅ Le fichier `config/grist-sync.json` est automatiquement ignoré par git
- ✅ Les tokens dans la config sont remplacés par des références (`${VAR_NAME}`)

### Bonnes pratiques

1. Utilisez un fichier `.env` local (non commité)
2. Utilisez un gestionnaire de secrets en production (Vault, AWS Secrets Manager, etc.)
3. Limitez les permissions des tokens API au strict nécessaire
4. Auditez régulièrement les accès

---

## 🚀 Déploiement et automatisation

### Synchronisation planifiée

Le service supporte la synchronisation planifiée via expression cron :

```json
{
  "sync": {
    "schedule": "0 */6 * * *"
  }
}
```

Exemples d'expressions cron :
- `0 */6 * * *` - Toutes les 6 heures
- `0 0 * * *` - Tous les jours à minuit
- `*/30 * * * *` - Toutes les 30 minutes

### CI/CD

Le projet inclut un workflow GitHub Actions (`.github/workflows/ci.yml`) qui :
- ✅ Installe les dépendances
- ✅ Lance les tests unitaires
- ✅ Build le frontend
- ✅ Upload les rapports de tests

---

## 📋 Exemples d'utilisation

### Synchroniser depuis une API REST

```bash
export GRIST_DOC_ID="abc123"
export GRIST_TABLE_ID="Users"
export GRIST_API_TOKEN="grist_token_xyz"
export SOURCE_URL="https://jsonplaceholder.typicode.com/users"

npm run cli:setup
npm run sync
```

### Utiliser un mock pour tester

```bash
export GRIST_DOC_ID="abc123"
export GRIST_TABLE_ID="TestTable"
export SOURCE_TYPE="mock"

npm run cli:setup
npm run sync
```

---

## 🤝 Contribution

Les contributions sont les bienvenues !  
Pour proposer des améliorations, ouvrez une **issue** ou une **pull request** sur GitHub.

### Améliorations futures

- [ ] Support Google Sheets
- [ ] Support SQL (PostgreSQL, MySQL)
- [ ] OAuth pour sources externes
- [ ] Multi-tenant
- [ ] Webhook pour sync en temps réel
- [ ] Dashboard de monitoring
- [ ] Parser cron complet

---

## 📄 Licence

**Organisation** : [dnum-mi](https://github.com/dnum-mi)

*Pour toute question ou suggestion, ouvrez une issue sur GitHub.*
