# Configuration Docker Compose pour tester le plugin Grist Sync

Ce guide explique comment démarrer une instance locale de Grist avec Docker Compose pour tester le plugin `grist-sync`.

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) installé
- [Docker Compose](https://docs.docker.com/compose/install/) installé (généralement inclus avec Docker Desktop)

**Note :** Les commandes utilisent `docker compose` (Compose V2). Si vous utilisez Compose V1, remplacez `docker compose` par `docker-compose`.

## Démarrage rapide

### 1. Démarrer Grist

À la racine du projet, exécutez :

```bash
docker-compose up -d
```

Cette commande va :
- Télécharger l'image officielle `gristlabs/grist:latest`
- Démarrer un conteneur Grist sur le port **8484**
- Créer un volume `grist-data/` pour la persistance des données

### 2. Accéder à Grist

Ouvrez votre navigateur et accédez à :

```
http://localhost:8484
```

### 3. Créer un document de test

1. Cliquez sur **"Create empty document"** ou **"Nouveau document"**
2. Créez une table avec quelques colonnes de test
3. Notez l'**ID du document** visible dans l'URL (ex: `http://localhost:8484/doc/YOUR_DOC_ID`)

### 4. Générer un token API (optionnel)

Si vous souhaitez utiliser l'authentification :

1. Cliquez sur votre profil (en haut à droite)
2. Allez dans **Profile Settings**
3. Dans l'onglet **API**, cliquez sur **"Create"**
4. Copiez le token généré

**Note :** Pour les tests locaux simples, vous pouvez travailler sans token API si votre document est public.

## Configuration du plugin

### Modifier `src/config.ts`

Mettez à jour la configuration par défaut pour pointer vers votre instance locale :

```typescript
export const defaultConfig: GristConfig = {
  docId: 'YOUR_DOC_ID',           // ID visible dans l'URL de votre document
  tableId: 'YOUR_TABLE_ID',       // Nom de votre table (ex: "Table1")
  apiTokenGrist: undefined,        // Token API si nécessaire (ou undefined)
  gristApiUrl: 'http://localhost:8484',  // URL de votre instance locale
  autoCreateColumns: true
};
```

### Exemple complet

```typescript
export const defaultConfig: GristConfig = {
  docId: 'sampleDoc123',
  tableId: 'Contacts',
  apiTokenGrist: 'your-api-token-here',  // Optionnel
  gristApiUrl: 'http://localhost:8484',
  autoCreateColumns: true
};
```

## Test de la connexion

### Via l'interface du plugin

1. Démarrez le plugin en mode développement :
   ```bash
   npm run dev
   ```

2. Dans l'interface (composant `ApiToGrist.vue`), renseignez :
   - **URL Grist** : `http://localhost:8484`
   - **Document ID** : votre ID de document
   - **Table ID** : le nom de votre table
   - **API Token** : votre token (si nécessaire)

3. Testez la connexion avec le bouton prévu à cet effet

### Via code

Vous pouvez tester la connexion programmatiquement :

```typescript
import { GristClient } from './src/utils/grist';
import type { GristConfig } from './src/config';

const config: GristConfig = {
  docId: 'your-doc-id',
  tableId: 'your-table',
  gristApiUrl: 'http://localhost:8484',
  apiTokenGrist: undefined  // ou votre token
};

const client = new GristClient(config);

// Test de connexion
const isConnected = await client.testConnection();
console.log('Connexion réussie:', isConnected);

// Insertion de données
const records = [
  { Name: 'Alice', Email: 'alice@example.com' },
  { Name: 'Bob', Email: 'bob@example.com' }
];

await client.addRecords(records);
```

## Commandes utiles

### Arrêter Grist

```bash
docker-compose down
```

### Arrêter et supprimer les données

```bash
docker-compose down -v
rm -rf grist-data/
```

### Voir les logs

```bash
docker-compose logs -f grist
```

### Redémarrer Grist

```bash
docker-compose restart
```

## Dépannage

### Port 8484 déjà utilisé

Si le port 8484 est déjà utilisé, vous pouvez modifier le mapping dans `docker-compose.yml` :

```yaml
ports:
  - "9090:8484"  # Utilisez le port 9090 sur l'hôte
```

N'oubliez pas de mettre à jour `gristApiUrl` dans votre configuration :

```typescript
gristApiUrl: 'http://localhost:9090'
```

### Problème de connexion

Si le plugin ne parvient pas à se connecter :

1. Vérifiez que Grist est bien démarré : `docker-compose ps`
2. Vérifiez les logs : `docker-compose logs grist`
3. Assurez-vous que l'URL est correcte : `http://localhost:8484`
4. Vérifiez que votre `docId` et `tableId` sont corrects

### Permissions insuffisantes

Si vous obtenez une erreur 403 :

1. Vérifiez que votre token API est valide
2. Vérifiez que le document permet l'accès avec ce token
3. Pour les tests locaux, vous pouvez créer un document public

## Structure des données persistées

Les données Grist sont stockées dans le répertoire `grist-data/` :

```
grist-data/
├── docs/          # Documents Grist
├── plugins/       # Plugins installés
└── ...
```

Ce répertoire est exclu du contrôle de version (`.gitignore`).

## Références

- [Documentation officielle de Grist](https://support.getgrist.com/)
- [API Grist](https://support.getgrist.com/api/)
- [Docker Hub - gristlabs/grist](https://hub.docker.com/r/gristlabs/grist)
- [Code source du plugin](https://github.com/Carolinedanslesnuages/grist-sync-plugin)

## Notes supplémentaires

### Variables d'environnement disponibles

Le fichier `docker-compose.yml` configure plusieurs variables d'environnement :

- `PORT=8484` : Port d'écoute de Grist
- `GRIST_SINGLE_ORG=docs` : Organisation unique pour simplifier les tests
- `GRIST_SANDBOX_FLAVOR=gvisor` : Active le mode sandbox sécurisé

Pour plus d'options de configuration, consultez la [documentation Docker de Grist](https://github.com/gristlabs/grist-core#environment-variables).

### Mise à jour de Grist

Pour utiliser la dernière version de Grist :

```bash
docker-compose pull
docker-compose up -d
```
