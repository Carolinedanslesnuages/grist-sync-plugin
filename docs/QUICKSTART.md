# 🚀 Guide de Démarrage Rapide - Synchronisation Bi-directionnelle Grist

## Vue d'ensemble en 2 minutes

Cette solution permet de synchroniser automatiquement les données entre une API centrale et plusieurs documents Grist (un par bureau/ville).

**Deux flux :**
1. **API → Grist** : Script Python quotidien automatique
2. **Grist → API** : Widget manuel avec bouton d'export

## ⚡ Installation Rapide

### 1. Flux Entrant (API → Grist) - 5 minutes

```bash
# 1. Configurer le script Python
cd scripts
cp config.example.json config.json

# 2. Éditer config.json avec vos paramètres
nano config.json

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Tester
python daily_sync.py

# 5. Planifier (cron)
crontab -e
# Ajouter : 0 2 * * * cd /chemin/vers/scripts && python3 daily_sync.py
```

**Configuration minimale dans `config.json` :**
```json
{
  "api_source": {
    "url": "https://votre-api.com/data",
    "headers": {"Authorization": "Bearer VOTRE_TOKEN"},
    "filter_field": "bureau"
  },
  "grist": {
    "server": "https://docs.getgrist.com",
    "api_key": "VOTRE_CLE_GRIST"
  },
  "bureaux": [
    {"name": "Paris", "grist_doc_id": "DOC_ID", "grist_table_id": "Table1"}
  ]
}
```

### 2. Flux Sortant (Grist → API) - 10 minutes

#### A. Préparer le widget

```bash
# Compiler et déployer
npm install
npm run build

# Le widget sera dans dist/widget/export-widget.html
# Déployez-le sur votre serveur web
```

**Ou utilisez un serveur local pour tester :**
```bash
cd public
python3 -m http.server 8000
# Widget accessible à : http://localhost:8000/widget/export-widget.html
```

#### B. Configurer dans Grist (pour chaque document)

**Étape 1 : Colonne "Origine_Bureau"**
1. Créez une colonne `Origine_Bureau` (type: Text)
2. Valeur par défaut : `"Paris"` (ou `"Lyon"`, etc.)

**Étape 2 : Ajouter le widget**
1. Add New → Custom Widget
2. URL : `https://votre-domaine.com/widget/export-widget.html`
3. Access : "Read selected table"
4. Mapper la colonne `Origine_Bureau`

#### C. Configurer le webhook n8n

1. Créez un workflow n8n (ou utilisez `docs/n8n-workflow.json`)
2. Nœud Webhook → Nœud HTTP Request vers votre API
3. Copiez l'URL du webhook
4. Collez-la dans le widget Grist

## 📋 Checklist de Vérification

### Script Python

- [ ] `config.json` créé et configuré
- [ ] Dépendances installées (`pip install -r requirements.txt`)
- [ ] Test manuel réussi (`python daily_sync.py`)
- [ ] Logs générés dans `sync.log`
- [ ] Rapport JSON créé (`sync_report_*.json`)
- [ ] Planification configurée (cron/n8n)

### Widget Grist

- [ ] Widget hébergé et accessible via HTTPS
- [ ] Colonne `Origine_Bureau` créée dans chaque document
- [ ] Valeurs par défaut configurées (Paris, Lyon, etc.)
- [ ] Widget ajouté à chaque document Grist
- [ ] Colonne `Origine_Bureau` mappée
- [ ] Webhook n8n configuré et testé
- [ ] URL du webhook saisie dans le widget

## 🔑 Où Trouver Quoi

### Clé API Grist
1. Profil → Profile Settings → API
2. Générer une nouvelle clé

### ID de Document Grist
Dans l'URL : `https://docs.getgrist.com/doc/ABC123XYZ`
→ ID = `ABC123XYZ`

### ID de Table Grist
1. Ouvrir le document
2. Icône `</>` en bas à gauche → API
3. Voir les IDs des tables

## 🧪 Tests

### Tester le script Python

```bash
cd scripts
python test_daily_sync.py
# Doit afficher : ✓ TOUS LES TESTS RÉUSSIS
```

### Tester le widget

1. Utilisez https://webhook.site pour créer un webhook de test
2. Copiez l'URL
3. Sélectionnez une ligne dans Grist
4. Collez l'URL dans le widget
5. Cliquez sur "Exporter"
6. Vérifiez la réception sur webhook.site

## 📚 Documentation Complète

- **[Guide Complet](docs/BIDIRECTIONAL_SYNC.md)** - Documentation principale
- **[Architecture](docs/ARCHITECTURE.md)** - Diagrammes et flux détaillés
- **[Script Python](scripts/README.md)** - Documentation du script quotidien
- **[Widget Export](public/widget/README.md)** - Documentation du widget
- **[Tests Widget](public/widget/TESTING.md)** - Guide de test du widget

## ⚠️ Erreurs Courantes

### "Fichier de configuration non trouvé"
→ Créez `scripts/config.json` depuis `config.example.json`

### "Erreur lors de l'upsert vers Grist"
→ Vérifiez votre clé API Grist et les IDs de document/table

### "CORS Error" dans le widget
→ C'est normal ! Utilisez le webhook intermédiaire (n8n/Pipedream)

### "La colonne Origine_Bureau n'est pas définie"
→ Vérifiez l'orthographe exacte : `Origine_Bureau` (avec majuscules)

## 💡 Cas d'Usage Typiques

### Cas 1 : 4 bureaux (Paris, Lyon, Marseille, Toulouse)

**Configuration :**
```json
{
  "bureaux": [
    {"name": "Paris", "grist_doc_id": "DOC_PARIS", "grist_table_id": "Employes"},
    {"name": "Lyon", "grist_doc_id": "DOC_LYON", "grist_table_id": "Employes"},
    {"name": "Marseille", "grist_doc_id": "DOC_MARSEILLE", "grist_table_id": "Employes"},
    {"name": "Toulouse", "grist_doc_id": "DOC_TOULOUSE", "grist_table_id": "Employes"}
  ]
}
```

**Dans chaque document Grist :**
- Document Paris : `Origine_Bureau` = `"Paris"`
- Document Lyon : `Origine_Bureau` = `"Lyon"`
- etc.

### Cas 2 : Bureau calculé depuis le code postal

**Formule dans la colonne `Origine_Bureau` :**
```python
if $code_postal[:2] == "75":
  return "Paris"
elif $code_postal[:2] == "69":
  return "Lyon"
elif $code_postal[:2] == "13":
  return "Marseille"
elif $code_postal[:2] == "31":
  return "Toulouse"
else:
  return "Autre"
```

## 🔒 Sécurité - Points Clés

✅ **Bonnes pratiques implémentées :**
- Clés API jamais dans le code du widget
- Communication via webhook intermédiaire
- `config.json` dans `.gitignore`
- HTTPS requis pour le widget et le webhook

❌ **À ne JAMAIS faire :**
- Mettre des secrets dans le code JavaScript
- Appeler l'API directement depuis le widget
- Committer `config.json` dans Git
- Utiliser HTTP (non sécurisé)

## 📞 Support

**Documentation :**
- Voir les fichiers README dans chaque dossier
- Consulter `docs/BIDIRECTIONAL_SYNC.md` pour les détails

**Problèmes :**
- Ouvrir une issue sur GitHub
- Consulter les logs : `scripts/sync.log`
- Vérifier les rapports : `scripts/sync_report_*.json`

## 🎯 Prochaines Étapes

Maintenant que tout est configuré :

1. ✅ Laissez le script s'exécuter quotidiennement
2. ✅ Surveillez les logs pour détecter les erreurs
3. ✅ Utilisez le widget pour les exports ponctuels
4. ✅ Consultez les rapports JSON pour les statistiques

**Bravo ! Votre synchronisation bi-directionnelle est opérationnelle ! 🎉**
