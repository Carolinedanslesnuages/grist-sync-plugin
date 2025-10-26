# Documentation de l'API Grist

Ce document décrit précisément les endpoints de l'API Grist utilisés par le plugin `grist-sync` pour synchroniser les données.

## Table des matières

- [Structure des URLs Grist](#structure-des-urls-grist)
- [Authentification](#authentification)
- [Endpoints utilisés](#endpoints-utilisés)
  - [POST /api/docs/{docId}/tables/{tableName}/records](#post-enregistrements)
  - [GET /api/docs/{docId}/tables/{tableName}/records](#get-enregistrements)
  - [GET /api/docs/{docId}/tables/{tableName}/columns](#get-colonnes)
  - [POST /api/docs/{docId}/tables/{tableName}/columns](#post-colonnes)
- [Gestion des erreurs](#gestion-des-erreurs)
- [Exemples complets](#exemples-complets)

---

## Structure des URLs Grist

### Format général d'une URL Grist

Les URLs de documents Grist suivent généralement ce format :

```
https://{host}/doc/{docId}
https://{host}/o/{orgId}/doc/{docId}
https://{host}/doc/{docId}/p/{pageId}
```

**Exemples :**
- `https://docs.getgrist.com/doc/abc123xyz`
- `https://docs.getgrist.com/o/myorg/doc/myDocId`
- `https://grist.example.com/doc/myDocId`
- `http://localhost:8484/doc/testDoc`

### Extraction du docId

Le plugin parse automatiquement l'URL pour extraire :
- **docId** : Identifiant unique du document (ex: `abc123xyz`)
- **gristApiUrl** : URL de base de l'instance Grist (ex: `https://docs.getgrist.com`)

**Fonction de parsing :**
```typescript
parseGristUrl('https://docs.getgrist.com/doc/abc123xyz')
// Retourne: { docId: 'abc123xyz', gristApiUrl: 'https://docs.getgrist.com' }
```

### Construction des URLs d'API

Les URLs de l'API sont construites selon le pattern :
```
{gristApiUrl}/api/docs/{docId}/tables/{tableId}/{endpoint}
```

**Exemple :**
```
https://docs.getgrist.com/api/docs/abc123/tables/Users/records
```

---

## Authentification

### Headers HTTP

L'API Grist utilise l'authentification par **Bearer Token** via le header `Authorization`.

**Headers requis pour toutes les requêtes :**

```http
Content-Type: application/json
Authorization: Bearer YOUR_API_TOKEN
```

### Obtention d'un token API

1. Connectez-vous à votre instance Grist
2. Accédez à **Profile Settings** (icône de profil en haut à droite)
3. Allez dans l'onglet **API**
4. Cliquez sur **"Create"** pour générer un nouveau token
5. Copiez et conservez le token en lieu sûr

### Documents publics

Pour les documents publics, le token API n'est pas nécessaire. Les requêtes peuvent être effectuées sans le header `Authorization`.

**Exemple de headers pour document public :**
```http
Content-Type: application/json
```

---

## Endpoints utilisés

### POST Enregistrements

#### `POST /api/docs/{docId}/tables/{tableName}/records`

Ajoute un ou plusieurs enregistrements à une table Grist.

#### URL complète
```
{gristApiUrl}/api/docs/{docId}/tables/{tableId}/records
```

#### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_API_TOKEN
```

#### Corps de la requête

**Structure du payload :**
```json
{
  "records": [
    {
      "fields": {
        "ColumnName1": "value1",
        "ColumnName2": "value2"
      }
    },
    {
      "fields": {
        "ColumnName1": "value3",
        "ColumnName2": "value4"
      }
    }
  ]
}
```

**Exemple réel :**
```json
{
  "records": [
    {
      "fields": {
        "Name": "Alice Dupont",
        "Email": "alice@example.com",
        "Age": 28,
        "Active": true
      }
    },
    {
      "fields": {
        "Name": "Bob Martin",
        "Email": "bob@example.com",
        "Age": 35,
        "Active": false
      }
    }
  ]
}
```

#### Réponse (200 OK)

**Structure de la réponse :**
```json
{
  "records": [
    {
      "id": 1
    },
    {
      "id": 2
    }
  ]
}
```

**Détails :**
- `records` : Tableau contenant les IDs des enregistrements créés
- `id` : Identifiant unique assigné par Grist à chaque enregistrement

#### Exemple complet avec curl

```bash
curl -X POST "https://docs.getgrist.com/api/docs/abc123/tables/Users/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "records": [
      {
        "fields": {
          "Name": "Alice Dupont",
          "Email": "alice@example.com"
        }
      }
    ]
  }'
```

#### Codes de statut HTTP

| Code | Signification | Description |
|------|---------------|-------------|
| 200  | OK | Enregistrements créés avec succès |
| 400  | Bad Request | Payload invalide ou colonnes inexistantes |
| 401  | Unauthorized | Token manquant ou invalide pour un document privé |
| 403  | Forbidden | Permissions insuffisantes |
| 404  | Not Found | Document ou table introuvable |

---

### GET Enregistrements

#### `GET /api/docs/{docId}/tables/{tableName}/records`

Récupère les enregistrements existants d'une table.

#### URL complète
```
{gristApiUrl}/api/docs/{docId}/tables/{tableId}/records
```

#### Paramètres de requête (optionnels)

| Paramètre | Type | Description |
|-----------|------|-------------|
| `limit` | number | Nombre maximum d'enregistrements à retourner |

**Exemple avec limite :**
```
GET /api/docs/abc123/tables/Users/records?limit=10
```

#### Headers
```http
Authorization: Bearer YOUR_API_TOKEN
```

#### Réponse (200 OK)

**Structure de la réponse :**
```json
{
  "records": [
    {
      "id": 1,
      "fields": {
        "Name": "Alice Dupont",
        "Email": "alice@example.com",
        "Age": 28,
        "Active": true
      }
    },
    {
      "id": 2,
      "fields": {
        "Name": "Bob Martin",
        "Email": "bob@example.com",
        "Age": 35,
        "Active": false
      }
    }
  ]
}
```

**Détails :**
- `records` : Tableau d'enregistrements
- `id` : Identifiant unique de l'enregistrement dans Grist
- `fields` : Objet contenant les valeurs des colonnes

#### Exemple avec curl

```bash
curl -X GET "https://docs.getgrist.com/api/docs/abc123/tables/Users/records?limit=5" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

---

### GET Colonnes

#### `GET /api/docs/{docId}/tables/{tableName}/columns`

Récupère la liste des colonnes d'une table avec leurs métadonnées.

#### URL complète
```
{gristApiUrl}/api/docs/{docId}/tables/{tableId}/columns
```

#### Headers
```http
Authorization: Bearer YOUR_API_TOKEN
```

#### Réponse (200 OK)

**Structure de la réponse :**
```json
{
  "columns": [
    {
      "id": "Name",
      "fields": {
        "colId": "Name",
        "label": "Name",
        "type": "Text"
      }
    },
    {
      "id": "Email",
      "fields": {
        "colId": "Email",
        "label": "Email Address",
        "type": "Text"
      }
    },
    {
      "id": "Age",
      "fields": {
        "colId": "Age",
        "label": "Age",
        "type": "Int"
      }
    },
    {
      "id": "Active",
      "fields": {
        "colId": "Active",
        "label": "Is Active",
        "type": "Bool"
      }
    }
  ]
}
```

**Détails :**
- `columns` : Tableau de colonnes
- `id` : Identifiant de la colonne
- `fields.colId` : Identifiant interne de la colonne
- `fields.label` : Libellé affiché de la colonne (peut être différent du colId)
- `fields.type` : Type de données de la colonne

#### Types de colonnes Grist

| Type | Description | Exemple |
|------|-------------|---------|
| `Text` | Texte libre | "Alice Dupont" |
| `Int` | Nombre entier | 42 |
| `Numeric` | Nombre décimal | 3.14 |
| `Bool` | Booléen | true, false |
| `Date` | Date | "2024-01-15" |
| `DateTime` | Date et heure | "2024-01-15T10:30:00Z" |

#### Exemple avec curl

```bash
curl -X GET "https://docs.getgrist.com/api/docs/abc123/tables/Users/columns" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

---

### POST Colonnes

#### `POST /api/docs/{docId}/tables/{tableName}/columns`

Crée une ou plusieurs nouvelles colonnes dans une table.

#### URL complète
```
{gristApiUrl}/api/docs/{docId}/tables/{tableId}/columns
```

#### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_API_TOKEN
```

#### Corps de la requête

**Structure du payload :**
```json
{
  "columns": [
    {
      "id": "ColumnId",
      "fields": {
        "colId": "ColumnId",
        "label": "Column Label",
        "type": "Text"
      }
    }
  ]
}
```

**Exemple réel :**
```json
{
  "columns": [
    {
      "id": "PhoneNumber",
      "fields": {
        "colId": "PhoneNumber",
        "label": "Phone Number",
        "type": "Text"
      }
    },
    {
      "id": "BirthDate",
      "fields": {
        "colId": "BirthDate",
        "label": "Date of Birth",
        "type": "Date"
      }
    }
  ]
}
```

**Détails des champs :**
- `id` : Identifiant de la colonne (même valeur que `colId`)
- `fields.colId` : Identifiant interne (sans espaces, CamelCase recommandé)
- `fields.label` : Libellé affiché (peut contenir espaces et caractères spéciaux)
- `fields.type` : Type de données (voir types disponibles ci-dessus)

#### Réponse (200 OK)

**Structure de la réponse :**
```json
{
  "columns": [
    {
      "id": "PhoneNumber"
    },
    {
      "id": "BirthDate"
    }
  ]
}
```

#### Exemple avec curl

```bash
curl -X POST "https://docs.getgrist.com/api/docs/abc123/tables/Users/columns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "columns": [
      {
        "id": "PhoneNumber",
        "fields": {
          "colId": "PhoneNumber",
          "label": "Phone Number",
          "type": "Text"
        }
      }
    ]
  }'
```

---

## Gestion des erreurs

### Codes d'erreur courants

| Code | Erreur | Cause probable | Solution |
|------|--------|----------------|----------|
| 400 | Bad Request | Payload invalide ou colonnes manquantes | Vérifier le format du JSON et les noms de colonnes |
| 401 | Unauthorized | Token manquant pour document privé | Fournir un token API valide |
| 403 | Forbidden | Token invalide ou permissions insuffisantes | Vérifier le token et les permissions du document |
| 404 | Not Found | Document ou table introuvable | Vérifier le docId et le tableId |
| 429 | Too Many Requests | Trop de requêtes | Attendre avant de réessayer (rate limiting) |
| 500 | Internal Server Error | Erreur serveur Grist | Réessayer plus tard |

### Format des réponses d'erreur

Les réponses d'erreur de l'API Grist sont généralement retournées en texte brut ou JSON selon le type d'erreur. Le format peut varier, mais inclut typiquement une description de l'erreur.

**Exemple générique :**
```json
{
  "error": "Description de l'erreur",
  "details": "Informations supplémentaires"
}
```

**Note :** Le format exact peut varier selon le type d'erreur. Vérifiez toujours le `response.status` et `response.text()` pour obtenir les détails complets.

### Stratégies de gestion des erreurs

**1. Vérification de la connexion :**
```typescript
const client = new GristClient(config);
const isConnected = await client.testConnection();
if (!isConnected) {
  console.error('Impossible de se connecter à Grist');
}
```

**2. Validation du token API :**
```typescript
const validation = await client.validateApiToken();
if (!validation.valid) {
  console.error(`Erreur d'authentification: ${validation.message}`);
}
```

**3. Gestion des erreurs lors de l'insertion :**
```typescript
try {
  await client.addRecords(records);
} catch (error) {
  console.error('Erreur lors de l\'insertion:', error.message);
  // Implémenter une logique de retry ou de notification
}
```

---

## Exemples complets

### Exemple 1 : Synchronisation complète avec création automatique de colonnes

```typescript
import { GristClient } from './utils/grist';
import type { GristConfig } from './config';

// Configuration
const config: GristConfig = {
  docId: 'abc123xyz',
  tableId: 'Users',
  apiTokenGrist: 'your-api-token-here',
  gristApiUrl: 'https://docs.getgrist.com',
  autoCreateColumns: true  // Crée automatiquement les colonnes manquantes
};

// Création du client
const client = new GristClient(config, (message, type) => {
  console.log(`[${type}] ${message}`);
});

// Données à synchroniser
const records = [
  {
    Name: 'Alice Dupont',
    Email: 'alice@example.com',
    Age: 28,
    Department: 'Engineering'
  },
  {
    Name: 'Bob Martin',
    Email: 'bob@example.com',
    Age: 35,
    Department: 'Sales'
  }
];

// Synchronisation
try {
  // Le client vérifie automatiquement les colonnes existantes
  // et crée celles qui sont manquantes (si autoCreateColumns: true)
  const result = await client.addRecords(records);
  console.log(`✅ ${result.records.length} enregistrements créés`);
} catch (error) {
  console.error('❌ Erreur de synchronisation:', error.message);
}
```

### Exemple 2 : Récupération et affichage des données

```typescript
// Récupérer les 10 premiers enregistrements
const records = await client.getRecords(10);

// Afficher les données
records.forEach(record => {
  console.log(`ID: ${record.id}`);
  console.log(`Nom: ${record.fields.Name}`);
  console.log(`Email: ${record.fields.Email}`);
  console.log('---');
});
```

### Exemple 3 : Gestion manuelle des colonnes

```typescript
// Configuration sans création automatique
const config: GristConfig = {
  docId: 'abc123xyz',
  tableId: 'Users',
  apiTokenGrist: 'your-api-token',
  gristApiUrl: 'https://docs.getgrist.com',
  autoCreateColumns: false  // Désactive la création automatique
};

const client = new GristClient(config);

// 1. Vérifier les colonnes existantes
const existingColumns = await client.getColumns();
console.log('Colonnes existantes:', existingColumns.map(c => c.fields.colId));

// 2. Créer les colonnes nécessaires manuellement
const newColumns = [
  { id: 'Department', label: 'Département', type: 'Text' },
  { id: 'Salary', label: 'Salaire', type: 'Numeric' }
];

await client.addColumns(newColumns);
console.log('✅ Colonnes créées');

// 3. Insérer les données
const records = [
  { Name: 'Alice', Department: 'IT', Salary: 50000 }
];

await client.addRecords(records);
console.log('✅ Données insérées');
```

### Exemple 4 : Parsing d'URL Grist

```typescript
import { parseGristUrl, isValidGristUrl } from './utils/grist';

// Exemples d'URLs
const urls = [
  'https://docs.getgrist.com/doc/abc123',
  'https://grist.example.com/o/myorg/doc/myDoc/p/5',
  'http://localhost:8484/doc/testDoc'
];

urls.forEach(url => {
  if (isValidGristUrl(url)) {
    const parsed = parseGristUrl(url);
    console.log(`URL: ${url}`);
    console.log(`  - docId: ${parsed.docId}`);
    console.log(`  - API Base: ${parsed.gristApiUrl}`);
  } else {
    console.log(`URL invalide: ${url}`);
  }
});
```

### Exemple 5 : Requête HTTP directe avec fetch

```typescript
// Sans utiliser GristClient, pour une requête directe
const docId = 'abc123xyz';
const tableId = 'Users';
const apiToken = 'your-api-token';
const gristApiUrl = 'https://docs.getgrist.com';

const url = `${gristApiUrl}/api/docs/${docId}/tables/${tableId}/records`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiToken}`
  },
  body: JSON.stringify({
    records: [
      {
        fields: {
          Name: 'Test User',
          Email: 'test@example.com'
        }
      }
    ]
  })
});

if (!response.ok) {
  const error = await response.text();
  throw new Error(`HTTP ${response.status}: ${error}`);
}

const result = await response.json();
console.log('Enregistrements créés:', result.records);
```

---

## Références

- [Documentation officielle de l'API Grist](https://support.getgrist.com/api/)
- [Guide de démarrage avec Docker](./DOCKER_SETUP.md)
- [Code source du client Grist](../src/utils/grist.ts)
- [Tests unitaires](../src/utils/__tests__/grist.test.ts)

---

## Notes importantes

### Sécurité
- **Ne jamais** commit les tokens API dans le code source
- Utiliser des variables d'environnement pour stocker les tokens sensibles
- Restreindre les permissions des tokens au strict nécessaire

### Performance
- L'API Grist a des limites de rate limiting (nombre de requêtes par minute)
- Pour des imports volumineux, considérer l'insertion par lots (batch)
- Utiliser des caches pour éviter de récupérer les colonnes à chaque requête

### Bonnes pratiques
- Toujours valider la connexion avant de commencer une synchronisation
- Implémenter une gestion d'erreurs robuste avec retry logic
- Logger les opérations importantes pour faciliter le débogage
- Utiliser `autoCreateColumns: true` pour simplifier les synchronisations initiales

---

*Documentation générée pour le plugin grist-sync - Dernière mise à jour : Octobre 2024*
