# Guide d'utilisation du CLI

Ce guide explique comment utiliser les scripts CLI pour configurer et exécuter la synchronisation automatique vers Grist.

## Prérequis

- Node.js 20+
- npm
- Un document Grist avec un token d'API (optionnel pour documents publics)

## Installation

```bash
npm install
```

## Configuration

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet (ou définissez les variables d'environnement) :

```bash
cp .env.example .env
```

Éditez `.env` avec vos valeurs :

```env
# Grist Configuration
GRIST_API_URL=https://docs.getgrist.com
GRIST_DOC_ID=votre-doc-id
GRIST_TABLE_ID=votre-table-id
GRIST_API_TOKEN=votre-token-api

# Source Configuration
SOURCE_TYPE=rest
SOURCE_URL=https://api.example.com/data
SOURCE_METHOD=GET

# Sync Configuration
SYNC_MODE=upsert
SYNC_UNIQUE_KEY=id
AUTO_CREATE_COLUMNS=true
```

### 2. Exécuter le setup

```bash
npm run cli:setup
```

Le script va :
1. ✅ Vérifier les variables d'environnement
2. ✅ Tester la connexion à Grist
3. ✅ Créer le fichier de configuration `config/grist-sync.json`

#### Options du setup

```bash
# Test de la synchronisation après le setup
npm run cli:setup -- --test-sync
```

### 3. Personnaliser le mapping

Éditez `config/grist-sync.json` pour personnaliser le mapping des champs :

```json
{
  "mapping": {
    "grist_field_name": "source_field_name",
    "user_id": "id",
    "user_name": "name",
    "user_email": "email"
  }
}
```

#### Mapping avec champs imbriqués

Utilisez la notation point pour les champs imbriqués :

```json
{
  "mapping": {
    "user_id": "data.user.id",
    "user_name": "data.user.profile.fullName",
    "company": "data.organization.name"
  }
}
```

## Exécution de la synchronisation

### Synchronisation manuelle

```bash
npm run sync
```

Le script va :
1. 📖 Charger la configuration depuis `config/grist-sync.json`
2. 🔌 Se connecter à la source de données
3. 🗺️ Appliquer le mapping
4. 📊 Synchroniser vers Grist
5. ✅ Afficher les résultats

### Résultats de la synchronisation

```
🔄 Grist Sync - Starting synchronization

📊 Executing synchronization...

📈 Synchronization Results:
  Added: 5
  Updated: 3
  Unchanged: 12
  Errors: 0
  Duration: 1234ms

📋 Details:
  Fetching data from source...
  Fetched 20 records from source
  Applying field mapping...
  Mapped 20 records
  Ensuring columns exist in Grist...
  Syncing records to Grist...
  ✓ Synchronization completed successfully

✅ Synchronization completed successfully!
```

## Modes de synchronisation

### Mode `add` (Ajouter uniquement)

Ajoute uniquement les nouveaux enregistrements, sans modifier les existants.

```env
SYNC_MODE=add
```

**Utilisation :** Données en append-only, logs, historiques.

### Mode `update` (Mise à jour uniquement)

Met à jour uniquement les enregistrements existants. Nécessite `SYNC_UNIQUE_KEY`.

```env
SYNC_MODE=update
SYNC_UNIQUE_KEY=id
```

**Utilisation :** Mise à jour de statuts, corrections de données.

### Mode `upsert` (Ajouter ou mettre à jour)

Ajoute les nouveaux et met à jour les existants. Nécessite `SYNC_UNIQUE_KEY`.

```env
SYNC_MODE=upsert
SYNC_UNIQUE_KEY=id
```

**Utilisation :** Synchronisation complète, mode le plus courant.

## Configuration avancée

### Retry et backoff

Le service inclut automatiquement :
- 3 tentatives de retry par défaut
- Délai croissant entre les tentatives (1s, 2s, 3s)

Personnalisable dans `config/grist-sync.json` :

```json
{
  "sync": {
    "retryAttempts": 5,
    "retryDelay": 2000
  }
}
```

### Création automatique de colonnes

Par défaut activée. Pour désactiver :

```env
AUTO_CREATE_COLUMNS=false
```

Ou dans `config/grist-sync.json` :

```json
{
  "sync": {
    "autoCreateColumns": false
  }
}
```

### DataPath pour réponses API complexes

Si votre API retourne les données dans un champ spécifique :

```json
{
  "source": {
    "dataPath": "data.results"
  }
}
```

Exemple de réponse :
```json
{
  "status": "success",
  "data": {
    "results": [
      { "id": 1, "name": "Item 1" }
    ]
  }
}
```

## Débogage

### Vérifier la configuration

```bash
cat config/grist-sync.json
```

### Tester la connexion à Grist

```bash
curl -H "Authorization: Bearer $GRIST_API_TOKEN" \
  "$GRIST_API_URL/api/docs/$GRIST_DOC_ID/tables/$GRIST_TABLE_ID/columns"
```

### Tester la source REST

```bash
curl "$SOURCE_URL"
```

### Logs détaillés

Les scripts CLI affichent des logs détaillés pendant l'exécution.

## Sécurité

### ⚠️ Important

- **Ne commitez jamais** le fichier `.env` ou `config/grist-sync.json`
- Ces fichiers sont déjà dans `.gitignore`
- Utilisez un gestionnaire de secrets en production

### Variables d'environnement en production

```bash
# Docker
docker run -e GRIST_API_TOKEN=xxx -e SOURCE_URL=yyy ...

# Kubernetes
kubectl create secret generic grist-sync-env --from-env-file=.env

# CI/CD
# Définir les variables dans les secrets du CI
```

## Automatisation

### Cron (Linux/Mac)

```bash
# Synchroniser toutes les 6 heures
0 */6 * * * cd /path/to/grist-sync-plugin && npm run sync >> /var/log/grist-sync.log 2>&1
```

### Tâche planifiée (Windows)

```powershell
# Créer une tâche planifiée dans le Planificateur de tâches
schtasks /create /tn "GristSync" /tr "npm run sync" /sc hourly /mo 6
```

### Docker

```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npm", "run", "sync"]
```

## Exemples d'utilisation

### Synchroniser des utilisateurs depuis une API

```bash
export GRIST_DOC_ID="abc123"
export GRIST_TABLE_ID="Users"
export SOURCE_URL="https://jsonplaceholder.typicode.com/users"

npm run cli:setup
npm run sync
```

### Synchroniser avec headers personnalisés

Dans `config/grist-sync.json` :

```json
{
  "source": {
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}",
      "X-Custom-Header": "value"
    }
  }
}
```

### Mode test avec Mock provider

```bash
export SOURCE_TYPE=mock
npm run cli:setup
npm run sync
```

## Dépannage

### Erreur : "Cannot find module"

```bash
npm install
```

### Erreur : "GRIST_DOC_ID environment variable is required"

Vérifiez que les variables d'environnement sont définies :

```bash
echo $GRIST_DOC_ID
```

### Erreur : "Failed to connect to Grist"

- Vérifiez l'URL Grist
- Vérifiez le token d'API
- Testez manuellement avec curl

### Erreur : "Unable to extract array data"

- Vérifiez le format de réponse de votre API
- Utilisez `dataPath` si nécessaire
- Testez l'API directement

## Support

Pour toute question ou problème :
- Consultez le [README.md](../README.md)
- Ouvrez une issue sur GitHub
- Contactez l'équipe de développement
