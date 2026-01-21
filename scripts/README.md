# Script de Synchronisation Quotidienne (API → Grist)

## 📋 Description

Ce script Python permet de synchroniser quotidiennement les données depuis une API source vers une flotte de documents Grist. Il est conçu pour une architecture multi-bureaux où chaque bureau (ville) possède son propre document Grist.

## 🎯 Fonctionnalités

- ✅ **Synchronisation multi-bureaux** : Distribution automatique des données vers plusieurs documents Grist
- ✅ **Méthode Upsert** : Évite les doublons en mettant à jour les enregistrements existants
- ✅ **Filtrage intelligent** : Filtre automatiquement les données par bureau
- ✅ **Logging détaillé** : Trace complète de chaque synchronisation
- ✅ **Rapports JSON** : Génération automatique de rapports pour chaque exécution
- ✅ **Gestion d'erreurs** : Isolation des erreurs par bureau

## 🚀 Installation

### Prérequis

- Python 3.7 ou supérieur
- pip

### Installation des dépendances

```bash
cd scripts
pip install -r requirements.txt
```

## ⚙️ Configuration

### 1. Créer le fichier de configuration

Copiez le fichier d'exemple et adaptez-le à votre environnement :

```bash
cp config.example.json config.json
```

### 2. Éditer le fichier `config.json`

```json
{
  "api_source": {
    "url": "https://votre-api.example.com/api/data",
    "headers": {
      "Authorization": "Bearer YOUR_API_TOKEN",
      "Content-Type": "application/json"
    },
    "filter_field": "bureau"
  },
  "grist": {
    "server": "https://docs.getgrist.com",
    "api_key": "YOUR_GRIST_API_KEY"
  },
  "bureaux": [
    {
      "name": "Paris",
      "grist_doc_id": "DOC_ID_PARIS",
      "grist_table_id": "TableName"
    },
    {
      "name": "Lyon",
      "grist_doc_id": "DOC_ID_LYON",
      "grist_table_id": "TableName"
    }
  ]
}
```

### 3. Paramètres de configuration

#### `api_source`
- `url` : URL de l'API source qui fournit les données
- `headers` : En-têtes HTTP pour l'authentification à l'API
- `filter_field` : Nom du champ utilisé pour filtrer les données par bureau (par défaut : "bureau")

#### `grist`
- `server` : URL du serveur Grist (ex: `https://docs.getgrist.com`)
- `api_key` : Clé API Grist (obtenue depuis votre profil Grist)

#### `bureaux`
Liste des bureaux à synchroniser. Chaque bureau doit avoir :
- `name` : Nom du bureau (doit correspondre aux valeurs dans le champ de filtrage)
- `grist_doc_id` : ID du document Grist pour ce bureau
- `grist_table_id` : ID de la table dans le document Grist

### 4. Obtenir les identifiants Grist

#### Clé API Grist
1. Connectez-vous à Grist
2. Cliquez sur votre profil (en haut à droite)
3. Allez dans "Profile Settings"
4. Générez une nouvelle API Key

#### ID de document
L'ID du document se trouve dans l'URL du document Grist :
```
https://docs.getgrist.com/doc/ABC123XYZ
                              ↑ Document ID
```

#### ID de table
1. Ouvrez le document dans Grist
2. Cliquez sur l'icône de code "</>" en bas à gauche
3. Sélectionnez "API" pour voir les IDs des tables

## 📦 Utilisation

### Exécution manuelle

```bash
python daily_sync.py
```

### Exécution avec un fichier de configuration personnalisé

```bash
export GRIST_SYNC_CONFIG=/chemin/vers/config.json
python daily_sync.py
```

### Automatisation avec Cron (Linux/Mac)

Pour exécuter le script tous les jours à 2h du matin :

```bash
crontab -e
```

Ajoutez la ligne suivante :

```cron
0 2 * * * cd /chemin/vers/scripts && /usr/bin/python3 daily_sync.py >> cron.log 2>&1
```

### Automatisation avec Task Scheduler (Windows)

1. Ouvrez le Planificateur de tâches
2. Créez une nouvelle tâche
3. Configurez le déclencheur pour une exécution quotidienne
4. Action : `python.exe` avec argument `C:\chemin\vers\daily_sync.py`

### Automatisation avec n8n

Créez un workflow n8n avec :
1. **Déclencheur** : Cron (quotidien)
2. **Action** : Execute Command
   - Command : `python3 /chemin/vers/daily_sync.py`

## 📊 Logs et Rapports

### Fichier de log

Le script génère un fichier `sync.log` avec toutes les informations de synchronisation :
- Horodatage de chaque opération
- Nombre d'enregistrements récupérés
- Statut de synchronisation par bureau
- Erreurs détaillées

### Rapports JSON

Un rapport JSON est généré après chaque exécution :
- Nom : `sync_report_YYYYMMDD_HHMMSS.json`
- Contenu : statistiques détaillées de la synchronisation

Exemple de rapport :
```json
{
  "start_time": "2024-01-15T02:00:00",
  "end_time": "2024-01-15T02:00:45",
  "duration_seconds": 45.23,
  "total_records": 250,
  "success_count": 4,
  "error_count": 0,
  "bureaux": [
    {
      "name": "Paris",
      "records_count": 120,
      "success": true
    },
    {
      "name": "Lyon",
      "records_count": 85,
      "success": true
    }
  ]
}
```

## 🔧 Dépannage

### Erreur : "Fichier de configuration non trouvé"
- Vérifiez que `config.json` existe dans le même dossier que le script
- Ou définissez la variable d'environnement `GRIST_SYNC_CONFIG`

### Erreur : "Erreur lors de l'upsert vers Grist"
- Vérifiez que votre clé API Grist est valide
- Vérifiez que les IDs de document et de table sont corrects
- Vérifiez que vous avez les permissions d'écriture sur le document

### Erreur : "Format de réponse API non supporté"
- Vérifiez que l'URL de votre API est correcte
- Vérifiez que l'API renvoie bien un format JSON
- Le script supporte les formats : `{"data": [...]}`, `{"records": [...]}`, `[...]`

## 📝 Notes importantes

### Format des données

L'API source doit renvoyer des données au format JSON avec un champ permettant de filtrer par bureau :

```json
[
  {
    "id": 1,
    "bureau": "Paris",
    "nom": "Dupont",
    "prenom": "Jean"
  },
  {
    "id": 2,
    "bureau": "Lyon",
    "nom": "Martin",
    "prenom": "Marie"
  }
]
```

### Méthode Upsert

Le script utilise la méthode Upsert de Grist qui :
- Crée un nouvel enregistrement si l'ID n'existe pas
- Met à jour l'enregistrement existant si l'ID existe déjà
- Évite ainsi les doublons

### Sécurité

- ⚠️ **Ne jamais committer `config.json`** (déjà dans `.gitignore`)
- Utilisez des variables d'environnement pour les secrets en production
- Restreignez les permissions de la clé API Grist au minimum nécessaire

## 🤝 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.
