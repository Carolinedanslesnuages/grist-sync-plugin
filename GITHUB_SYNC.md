# Synchronisation Grist vers GitHub

Cette fonctionnalité permet d'exporter automatiquement les données d'une table Grist vers un dépôt GitHub via une Pull Request.

## 🎯 Objectif

Après avoir synchronisé des données depuis une API vers Grist (étapes 1-4), vous pouvez maintenant exporter ces données vers un dépôt GitHub pour :
- Créer un historique versionné des données
- Collaborer avec d'autres membres de l'équipe via des Pull Requests
- Intégrer les données dans des workflows CI/CD
- Archiver et sauvegarder les données

## 📋 Prérequis

### 1. Token d'accès personnel GitHub

Vous devez créer un token d'accès personnel (Personal Access Token) avec les permissions suivantes :

1. Allez sur GitHub : **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Cliquez sur **Generate new token**
3. Sélectionnez les permissions suivantes :
   - ✅ `repo` (Full control of private repositories)
     - Permet de créer des branches
     - Permet de créer des commits
     - Permet de créer des Pull Requests

4. Copiez le token généré (il commence par `ghp_`)

### 2. Dépôt GitHub

Vous devez avoir :
- Un dépôt GitHub existant
- Les permissions d'écriture sur ce dépôt
- Le nom du propriétaire (username ou organization)
- Le nom du dépôt

## 🚀 Utilisation

### Étape 5 : Export vers GitHub

Une fois que vous avez synchronisé vos données vers Grist (étapes 1-4), l'étape 5 vous permet d'exporter ces données vers GitHub.

#### Configuration

Remplissez les champs suivants :

1. **Token d'accès personnel GitHub** : Votre token `ghp_xxxxx`
2. **Propriétaire du dépôt** : Le username ou nom d'organisation (ex: `votre-username`)
3. **Nom du dépôt** : Le nom du repository (ex: `mon-depot`)
4. **Branche par défaut** : La branche cible pour la PR (généralement `main` ou `master`)
5. **Format d'export** : Choisissez entre JSON ou CSV

#### Test de connexion

Avant de lancer la synchronisation, vous pouvez cliquer sur **"Tester la connexion"** pour vérifier :
- Que le token est valide
- Que le dépôt existe
- Que vous avez les permissions nécessaires

#### Lancement de la synchronisation

Cliquez sur **"Synchroniser vers GitHub"** pour :

1. **Récupérer les données** depuis la table Grist configurée
2. **Créer une branche** avec le format `grist-sync/{table}-{timestamp}`
3. **Créer un fichier** dans `data-sync/grist-{table}-{timestamp}.{json|csv}`
4. **Commiter le fichier** avec un message descriptif
5. **Ouvrir une Pull Request** vers la branche par défaut

## 📁 Structure des fichiers exportés

Les fichiers sont créés dans le dépôt avec la structure suivante :

```
data-sync/
  ├── grist-Users-2024-01-15-143022.json
  ├── grist-Users-2024-01-16-091545.csv
  └── grist-Products-2024-01-15-143022.json
```

### Format JSON

```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "created_at": "2024-01-15T14:30:00Z"
  },
  {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com",
    "created_at": "2024-01-15T15:00:00Z"
  }
]
```

### Format CSV

```csv
"id","name","email","created_at"
"1","Alice","alice@example.com","2024-01-15T14:30:00Z"
"2","Bob","bob@example.com","2024-01-15T15:00:00Z"
```

## 🔄 Pull Request créée

La Pull Request générée contient :

- **Titre** : `[Grist Sync] Export de la table {TableName}`
- **Description** détaillée avec :
  - Nom de la table
  - Nombre d'enregistrements
  - Format d'export
  - Chemin du fichier
  - Date et heure de l'export

### Exemple de Pull Request

```markdown
## 📊 Synchronisation Grist

Cette Pull Request contient l'export des données de la table **Users**.

### Détails
- **Table**: Users
- **Nombre d'enregistrements**: 150
- **Format**: JSON
- **Fichier**: `data-sync/grist-Users-2024-01-15-143022.json`
- **Date**: 15/01/2024 à 14:30:22

### Fichiers modifiés
- `data-sync/grist-Users-2024-01-15-143022.json` - Export des données

---
*Généré automatiquement par Grist Sync Plugin*
```

## 🔐 Sécurité

### Bonnes pratiques

1. **Ne commitez jamais votre token GitHub dans le code**
   - Le token est saisi uniquement dans l'interface
   - Il n'est pas stocké de manière persistante

2. **Utilisez des tokens avec permissions minimales**
   - Donnez uniquement l'accès `repo` nécessaire
   - Créez des tokens spécifiques pour chaque usage

3. **Gérez les secrets sensibles**
   - Ne synchronisez pas de données sensibles (mots de passe, tokens, etc.)
   - Utilisez des filtres ou transformations si nécessaire

4. **Révoquez les tokens non utilisés**
   - Supprimez les tokens qui ne sont plus nécessaires
   - Renouvelez régulièrement vos tokens

## 🐛 Dépannage

### Erreur : "Token GitHub invalide ou expiré"

**Cause** : Le token fourni n'est pas valide ou a expiré.

**Solution** :
1. Vérifiez que vous avez copié le token complet
2. Générez un nouveau token si nécessaire
3. Assurez-vous que le token n'a pas expiré

### Erreur : "Dépôt introuvable ou accès non autorisé"

**Cause** : Le dépôt n'existe pas ou vous n'avez pas les permissions.

**Solution** :
1. Vérifiez le nom du propriétaire et du dépôt
2. Assurez-vous que le dépôt existe
3. Vérifiez que votre token a les permissions `repo`

### Erreur : "Branche par défaut 'xxx' introuvable"

**Cause** : La branche spécifiée n'existe pas dans le dépôt.

**Solution** :
1. Vérifiez le nom de la branche par défaut (généralement `main` ou `master`)
2. Créez la branche si elle n'existe pas

### Erreur lors de la récupération des données Grist

**Cause** : Impossible de récupérer les données depuis Grist.

**Solution** :
1. Vérifiez que la configuration Grist est correcte (étape 3)
2. Assurez-vous que la table contient des données
3. Vérifiez que le token API Grist est valide

## 💡 Cas d'usage

### 1. Backup régulier des données

Utilisez cette fonctionnalité pour créer des backups réguliers de vos tables Grist dans GitHub, avec un historique versionné.

### 2. Collaboration d'équipe

Les Pull Requests permettent à votre équipe de reviewer les changements de données avant de les merger.

### 3. Intégration CI/CD

Automatisez des workflows basés sur les exports de données (génération de rapports, analyses, etc.).

### 4. Documentation des changements

Chaque export crée un commit avec timestamp, facilitant le suivi des évolutions de données.

## 🔗 API GitHub utilisée

Cette fonctionnalité utilise l'API REST GitHub v3 pour :

- `GET /repos/{owner}/{repo}` - Vérifier l'existence du dépôt
- `GET /repos/{owner}/{repo}/git/ref/heads/{branch}` - Récupérer les références de branche
- `POST /repos/{owner}/{repo}/git/refs` - Créer une nouvelle branche
- `POST /repos/{owner}/{repo}/git/blobs` - Créer des blobs (fichiers)
- `POST /repos/{owner}/{repo}/git/trees` - Créer un arbre Git
- `POST /repos/{owner}/{repo}/git/commits` - Créer un commit
- `PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}` - Mettre à jour une branche
- `POST /repos/{owner}/{repo}/pulls` - Créer une Pull Request

Documentation complète : https://docs.github.com/en/rest

## 📝 Changelog

### Version 1.0.0 (2024)

- ✨ Ajout de l'étape 5 : Synchronisation vers GitHub
- ✨ Support des formats JSON et CSV
- ✨ Création automatique de branches et Pull Requests
- ✨ Logs détaillés de synchronisation
- ✨ Test de connexion GitHub
- ✅ Tests unitaires pour les utilitaires GitHub
