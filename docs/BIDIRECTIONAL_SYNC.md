# Solution de Synchronisation Bi-directionnelle Grist

## 📋 Vue d'ensemble

Cette solution complète permet une synchronisation bi-directionnelle entre une API centrale et une flotte de documents Grist (un document par bureau/ville).

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API CENTRALE                             │
│                  (Source de vérité)                          │
└──────────────┬─────────────────────────────────┬────────────┘
               │                                 │
               │ Flux Entrant                    │ Flux Sortant
               │ (API → Grist)                   │ (Grist → API)
               │ Quotidien                       │ Manuel
               ▼                                 ▼
┌──────────────────────────┐         ┌──────────────────────┐
│  Script Python           │         │  Webhook n8n/        │
│  daily_sync.py           │         │  Pipedream           │
│                          │         │  (Middleware)        │
│  • Récupère données API  │         │                      │
│  • Filtre par bureau     │         │  • Contourne CORS    │
│  • Upsert vers Grist     │         │  • Sécurise API Key  │
└──────────┬───────────────┘         └──────────▲───────────┘
           │                                    │
           │ Répartition                        │
           │ par bureau                         │
           ▼                                    │
┌──────────────────────────────────────────────┼───────────┐
│                DOCUMENTS GRIST                │           │
│                (Multi-Tenants)                │           │
│                                              │           │
│  ┌─────────────┐  ┌─────────────┐  ┌───────┴────────┐  │
│  │  Paris      │  │  Lyon       │  │  Marseille     │  │
│  │  Doc 1      │  │  Doc 2      │  │  Doc 3         │  │
│  │             │  │             │  │                │  │
│  │  [Widget]───┼──┼─────────────┼──┘                │  │
│  └─────────────┘  └─────────────┘  └────────────────┘  │
│                                                          │
│  Widget unique : export-widget.html                      │
│  Colonne contextuelle : "Origine_Bureau"                 │
└──────────────────────────────────────────────────────────┘
```

## 🔄 Flux de Données

### Flux Entrant : API → Grist (Ingestion quotidienne)

**Objectif** : Mettre à jour quotidiennement les documents Grist avec les données de l'API centrale.

**Processus** :
1. Script Python récupère toutes les données de l'API source
2. Filtre les données par bureau (champ configurable)
3. Pour chaque bureau, effectue un upsert vers le document Grist correspondant
4. Génère un rapport de synchronisation

**Emplacement** : `/scripts/daily_sync.py`

**Documentation** : `/scripts/README.md`

### Flux Sortant : Grist → API (Export manuel)

**Objectif** : Permettre l'export ponctuel de données depuis Grist vers l'API centrale.

**Processus** :
1. Utilisateur sélectionne une ligne dans Grist
2. Widget lit la colonne "Origine_Bureau"
3. Utilisateur clique sur "Exporter"
4. Widget envoie les données au webhook intermédiaire
5. Webhook transmet à l'API avec authentification

**Emplacement** : `/public/widget/export-widget.html`

**Documentation** : `/public/widget/README.md`

## 📦 Livrables

### 1. Script Python de Répartition Quotidienne

✅ **Fichiers** :
- `scripts/daily_sync.py` - Script principal
- `scripts/config.example.json` - Template de configuration
- `scripts/requirements.txt` - Dépendances Python
- `scripts/README.md` - Documentation complète
- `scripts/.gitignore` - Fichiers à ignorer

✅ **Fonctionnalités** :
- Configuration multi-bureaux centralisée
- Méthode Upsert pour éviter les doublons
- Filtrage automatique par bureau
- Logging détaillé
- Rapports JSON de chaque exécution
- Gestion d'erreurs par bureau

### 2. Widget HTML/JS Générique

✅ **Fichiers** :
- `public/widget/export-widget.html` - Widget complet
- `public/widget/README.md` - Documentation et guide de configuration

✅ **Fonctionnalités** :
- Widget unique pour tous les documents
- Lecture automatique de "Origine_Bureau"
- Style DSFR complet
- Communication via webhook (sécurisé)
- Sauvegarde de l'URL du webhook
- Feedback visuel des opérations

### 3. Documentation de Configuration

✅ **Guides complets** :
- Configuration de la colonne "Origine_Bureau" dans Grist
- Installation et configuration du widget
- Configuration des webhooks intermédiaires (n8n, Pipedream, Zapier)
- Exemples de configuration
- Guide de dépannage

## 🚀 Guide de Démarrage Rapide

### Étape 1 : Configuration du Flux Entrant (API → Grist)

```bash
# 1. Installer Python 3.7+
cd scripts

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Configurer
cp config.example.json config.json
# Éditer config.json avec vos paramètres

# 4. Tester
python daily_sync.py

# 5. Planifier (cron)
crontab -e
# Ajouter : 0 2 * * * cd /chemin/vers/scripts && python3 daily_sync.py
```

### Étape 2 : Configuration du Flux Sortant (Grist → API)

```bash
# 1. Compiler et déployer le projet
npm run build

# 2. Le widget sera accessible à :
# https://votre-domaine.com/widget/export-widget.html
```

### Étape 3 : Configuration dans Grist

Pour chaque document Grist :

1. **Créer la colonne "Origine_Bureau"**
   - Type : Text
   - Valeur par défaut : `"Paris"` (ou `"Lyon"`, etc.)

2. **Ajouter le Custom Widget**
   - Add New → Custom Widget
   - URL : `https://votre-domaine.com/widget/export-widget.html`
   - Access : Read selected table
   - Mapper la colonne "Origine_Bureau"

3. **Configurer le webhook intermédiaire** (n8n/Pipedream)
   - Créer un workflow qui reçoit les données
   - Transmettre à l'API avec authentification
   - Copier l'URL du webhook

4. **Utiliser le widget**
   - Sélectionner une ligne
   - Coller l'URL du webhook
   - Cliquer sur "Exporter"

## 🔧 Configuration Détaillée

### Configuration du Script Python

Fichier `scripts/config.json` :

```json
{
  "api_source": {
    "url": "https://api.example.com/data",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN"
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
      "grist_doc_id": "ABC123",
      "grist_table_id": "TableName"
    }
  ]
}
```

### Configuration de la Colonne "Origine_Bureau"

**Option 1 : Valeur fixe par document**
```python
# Dans Grist, formule par défaut de la colonne :
"Paris"
```

**Option 2 : Basée sur un autre champ**
```python
# Si vous avez déjà un champ 'site'
$site

# Avec logique conditionnelle
if $code_postal.startswith("75"):
  return "Paris"
elif $code_postal.startswith("69"):
  return "Lyon"
```

### Configuration du Webhook n8n

1. Créer un workflow n8n
2. Nœud Webhook (POST)
3. Nœud HTTP Request vers votre API :
   ```json
   {
     "url": "https://api.example.com/import",
     "method": "POST",
     "headers": {
       "Authorization": "Bearer YOUR_API_KEY"
     },
     "body": {
       "bureau": "{{$json.bureau}}",
       "data": "{{$json.record}}"
     }
   }
   ```

## 📊 Exemples d'Utilisation

### Exemple 1 : Synchronisation de données RH

**Contexte** : 4 bureaux (Paris, Lyon, Marseille, Toulouse)

**Configuration** :
- API source : Système RH centralisé
- Champ de filtrage : `localisation`
- Fréquence : Quotidienne à 6h
- Documents Grist : Un par ville

**Mise en place** :
1. Configurer `config.json` avec les 4 bureaux
2. Configurer cron : `0 6 * * * ...`
3. Dans chaque document Grist, colonne `Origine_Bureau` = nom de la ville
4. Widget pour permettre aux RH locaux de renvoyer des corrections

### Exemple 2 : Gestion d'inventaire multi-sites

**Contexte** : Plusieurs entrepôts

**Configuration** :
- API source : ERP central
- Champ de filtrage : `site_code`
- Export manuel : Pour signaler des anomalies

**Particularité** :
```python
# Colonne Origine_Bureau calculée depuis le code site
$site_code.replace("WH_", "").replace("_", " ").title()
# WH_PARIS → Paris
# WH_LYON_01 → Lyon 01
```

## 🔒 Sécurité

### Bonnes Pratiques Implémentées

✅ **API Keys jamais exposées côté client**
- Les clés restent dans `config.json` (serveur)
- Le widget passe par un webhook intermédiaire

✅ **Isolation des bureaux**
- Chaque document Grist ne voit que ses données
- Le filtrage se fait au niveau du script

✅ **Logs et Audit**
- Tous les syncs sont loggés
- Rapports JSON horodatés

✅ **Validation des données**
- Vérification des champs obligatoires
- Gestion d'erreurs robuste

### Checklist de Sécurité

- [ ] Fichier `config.json` dans `.gitignore`
- [ ] Clés API Grist avec permissions minimales
- [ ] Webhook n8n/Pipedream sécurisé (HTTPS)
- [ ] Logs régulièrement archivés
- [ ] Sauvegardes des documents Grist
- [ ] Monitoring des synchronisations

## 🐛 Dépannage

### Problème : Le script Python ne trouve pas les bureaux

**Solution** :
- Vérifiez que le `filter_field` correspond au champ de l'API
- Vérifiez que les noms de bureaux correspondent exactement

### Problème : Doublons dans Grist

**Solution** :
- La méthode upsert nécessite un champ ID unique
- Vérifiez que votre API renvoie un champ `id` cohérent

### Problème : Le widget ne s'affiche pas

**Solution** :
- Vérifiez l'URL du widget (doit être publique)
- Vérifiez les headers CORS du serveur web
- Vérifiez les permissions Grist

### Problème : Erreur CORS lors de l'export

**Solution** :
- C'est normal ! Utilisez le webhook intermédiaire
- Ne tentez pas d'appeler directement l'API

## 📚 Ressources et Documentation

### Documentation Principale
- [Script Python](/scripts/README.md)
- [Widget Export](/public/widget/README.md)

### Documentation Externe
- [API Grist](https://support.getgrist.com/api/)
- [Grist Custom Widgets](https://support.getgrist.com/widget-custom/)
- [DSFR](https://www.systeme-de-design.gouv.fr/)
- [n8n](https://docs.n8n.io/)

## 🤝 Support et Contribution

Pour toute question, problème ou suggestion :
- Ouvrir une issue sur GitHub
- Consulter les guides de dépannage
- Vérifier les logs de synchronisation

## 📝 Licence

Ce projet est sous licence selon les termes du dépôt parent.
