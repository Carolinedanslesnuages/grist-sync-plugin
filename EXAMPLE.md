# Exemple d'utilisation : Synchronisation complète

Ce guide vous montre comment utiliser le plugin Grist Sync de bout en bout, de la récupération des données API jusqu'à l'export vers GitHub.

## 📝 Scénario

Nous allons :
1. Récupérer des données utilisateurs depuis une API
2. Les mapper vers une table Grist
3. Les synchroniser vers Grist
4. Les exporter vers GitHub

## 🎬 Étape par étape

### Étape 1 : Récupération des données API

1. **URL du backend** : `https://jsonplaceholder.typicode.com/users`
2. **Token d'authentification** : *(laisser vide pour cet exemple)*
3. Cliquez sur **"Récupérer les données"**

✅ **Résultat** : 10 utilisateurs récupérés depuis l'API

### Étape 2 : Mapping des champs

Le plugin détecte automatiquement les champs disponibles. Configurez le mapping :

| Champ API | Colonne Grist | Activé |
|-----------|---------------|--------|
| `id` | `api_id` | ✅ |
| `name` | `name` | ✅ |
| `username` | `username` | ✅ |
| `email` | `email` | ✅ |
| `address.city` | `address_city` | ✅ |
| `company.name` | `company_name` | ✅ |

💡 **Astuce** : Les champs imbriqués (comme `address.city`) sont automatiquement détectés et convertis avec des underscores.

### Étape 3 : Configuration Grist

Configurez votre document Grist :

1. **Document ID** : Trouvez-le dans l'URL de votre document Grist
   - URL : `https://docs.getgrist.com/doc/abc123xyz/Users`
   - Document ID : `abc123xyz`

2. **Table ID** : Le nom de votre table (par exemple : `Users`)

3. **URL API Grist** : `https://docs.getgrist.com` (par défaut)

4. **Token API Grist** : *(facultatif si document public)*

5. Cliquez sur **"Tester la connexion"** pour valider

✅ **Résultat** : Configuration validée

### Étape 4 : Synchronisation vers Grist

1. Vérifiez le résumé :
   - 📊 **Enregistrements** : 10
   - 🔗 **Mappings** : 6
   - 📄 **Document** : abc123xyz
   - 📊 **Table** : Users

2. Cliquez sur **"Lancer la synchronisation"**

✅ **Résultat** : 10 enregistrements synchronisés avec succès dans Grist

**Journal de synchronisation** :
```
14:30:15 🚀 Démarrage de la synchronisation...
14:30:15 📊 10 enregistrement(s) à synchroniser
14:30:15 🔗 6 mapping(s) configuré(s)
14:30:16 🔄 Transformation des données...
14:30:16 ✓ 10 enregistrement(s) transformé(s)
14:30:16 📋 6 colonne(s) détectée(s): api_id, name, username, email, address_city, company_name
14:30:16 📤 Envoi vers Grist...
14:30:17 🔧 Vérification et création automatique des colonnes manquantes...
14:30:18 ✅ 10 enregistrement(s) synchronisé(s) avec succès!
```

### Étape 5 : Export vers GitHub

Maintenant, exportons ces données vers GitHub pour les archiver.

#### Configuration GitHub

1. **Token d'accès personnel** : `ghp_xxxxxxxxxxxx`
   - Créez-le sur GitHub : Settings → Developer settings → Personal access tokens
   - Permissions requises : `repo` (full control)

2. **Propriétaire du dépôt** : `votre-username`

3. **Nom du dépôt** : `grist-data-export`

4. **Branche par défaut** : `main`

5. **Format d'export** : `JSON` *(ou CSV selon vos préférences)*

6. Cliquez sur **"Tester la connexion"**

✅ **Résultat** : Connexion réussie au dépôt votre-username/grist-data-export

#### Lancement de l'export

Cliquez sur **"Synchroniser vers GitHub"**

**Journal de synchronisation** :
```
14:35:20 🚀 Démarrage de la synchronisation vers GitHub...
14:35:20 📊 10 enregistrement(s) à synchroniser
14:35:20 📥 Récupération des données depuis Grist...
14:35:21 ✅ 10 enregistrement(s) récupéré(s)
14:35:21 📝 Création de la branche grist-sync/Users-2024-01-15-143520...
14:35:22 ✅ Branche grist-sync/Users-2024-01-15-143520 créée avec succès
14:35:22 📝 Création du commit sur grist-sync/Users-2024-01-15-143520...
14:35:24 ✅ Commit créé avec succès: a7b3c9d
14:35:24 📝 Création de la Pull Request...
14:35:25 ✅ Pull Request créée: https://github.com/votre-username/grist-data-export/pull/42
14:35:25 ✅ Synchronisation terminée avec succès!
```

✅ **Résultat** : Pull Request créée avec succès !

## 📂 Résultat final

### Dans Grist

Votre table `Users` contient maintenant 10 enregistrements avec les colonnes :
- api_id
- name
- username
- email
- address_city
- company_name

### Sur GitHub

Une Pull Request a été créée :

**Titre** : `[Grist Sync] Export de la table Users`

**Fichier créé** : `data-sync/grist-Users-2024-01-15-143520.json`

**Contenu du fichier** :
```json
[
  {
    "api_id": 1,
    "name": "Leanne Graham",
    "username": "Bret",
    "email": "Sincere@april.biz",
    "address_city": "Gwenborough",
    "company_name": "Romaguera-Crona"
  },
  {
    "api_id": 2,
    "name": "Ervin Howell",
    "username": "Antonette",
    "email": "Shanna@melissa.tv",
    "address_city": "Wisokyburgh",
    "company_name": "Deckow-Crist"
  },
  // ... 8 autres utilisateurs
]
```

## 🎉 Félicitations !

Vous avez réussi à :
- ✅ Récupérer des données depuis une API
- ✅ Les mapper et synchroniser vers Grist
- ✅ Les exporter vers GitHub via une Pull Request

## 🔄 Prochaines étapes

1. **Reviewez la Pull Request** sur GitHub
2. **Mergez-la** si les données sont correctes
3. **Répétez le processus** pour synchroniser régulièrement vos données
4. **Automatisez** en créant un script ou un workflow GitHub Actions

## 💡 Conseils

### Pour une utilisation régulière

1. **Créez un token GitHub dédié** avec uniquement les permissions nécessaires
2. **Documentez votre mapping** pour que votre équipe puisse le reproduire
3. **Utilisez des noms de tables explicites** pour faciliter l'identification des exports
4. **Configurez des alertes** pour être notifié des nouvelles Pull Requests

### Pour des exports de grande taille

1. **Privilégiez le format CSV** si vous n'avez besoin que de données tabulaires (plus léger)
2. **Segmentez vos données** en plusieurs tables si nécessaire
3. **Utilisez des filtres** dans Grist pour n'exporter que les données pertinentes

### Pour la collaboration

1. **Ajoutez des reviewers** à vos Pull Requests
2. **Utilisez des labels GitHub** pour catégoriser les exports
3. **Créez des issues** pour suivre les anomalies dans les données
