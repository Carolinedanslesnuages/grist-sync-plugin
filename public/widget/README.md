# Widget d'Export Grist → API

## 📋 Description

Ce widget personnalisé Grist permet d'exporter manuellement des données depuis Grist vers une API centrale. Il est conçu pour être utilisé dans une architecture multi-bureaux où chaque bureau possède son propre document Grist.

## 🎯 Fonctionnalités

- ✅ **Widget unique** : Un seul widget utilisable par tous les documents Grist
- ✅ **Détection automatique du bureau** : Lecture de la colonne "Origine_Bureau"
- ✅ **Style DSFR** : Respect du Système de Design de l'État Français
- ✅ **Sécurité** : Passe par un webhook intermédiaire (pas d'exposition des clés API)
- ✅ **Feedback visuel** : Messages de succès/erreur clairs
- ✅ **Sauvegarde automatique** : URL du webhook sauvegardée localement

## 🚀 Installation et Configuration

### 1. Hébergement du Widget

Le widget doit être hébergé sur un serveur web accessible. Deux options :

#### Option A : Hébergement avec ce projet (recommandé)

1. Compilez et déployez le projet :
```bash
npm run build
```

2. Le widget sera accessible à l'URL :
```
https://votre-domaine.com/widget/export-widget.html
```

#### Option B : Hébergement statique (GitHub Pages, Netlify, etc.)

1. Uploadez le fichier `export-widget.html` sur votre hébergement
2. Notez l'URL publique du fichier

### 2. Configuration dans Grist

Pour chaque document Grist (Paris, Lyon, etc.) :

#### Étape 1 : Créer la colonne "Origine_Bureau"

1. Ouvrez votre document Grist
2. Créez une nouvelle colonne nommée **exactement** `Origine_Bureau`
3. Type de colonne : **Text** (Texte)
4. Définissez la valeur par défaut :
   - Pour le document Paris : `Paris`
   - Pour le document Lyon : `Lyon`
   - Pour le document Marseille : `Marseille`
   - etc.

**Important** : Cette valeur doit correspondre au nom du bureau dans votre système.

#### Option 1 : Valeur par défaut pour toutes les lignes

Pour définir automatiquement le bureau pour toutes les nouvelles lignes :

1. Cliquez sur la colonne `Origine_Bureau`
2. Cliquez sur l'icône ⚙️ (options de colonne)
3. Dans "Default formula", entrez : `"Paris"` (avec les guillemets)
4. Toutes les nouvelles lignes auront automatiquement cette valeur

#### Option 2 : Formule basée sur un autre champ

Si vous avez déjà une information de bureau dans vos données :

```python
# Si vous avez un champ "site" ou "location"
$site

# Ou avec transformation
$site.upper()  # Pour convertir en majuscules

# Ou avec logique conditionnelle
if $code_postal.startswith("75"):
  return "Paris"
elif $code_postal.startswith("69"):
  return "Lyon"
else:
  return "Autre"
```

#### Étape 2 : Ajouter le Custom Widget

1. Créez une nouvelle page dans Grist ou utilisez une page existante
2. Cliquez sur "Add New" → "Add Widget to Page"
3. Sélectionnez "Custom Widget"
4. Dans les paramètres du widget :
   - **Widget URL** : `https://votre-domaine.com/widget/export-widget.html`
   - **Access Level** : "Read selected table" (Lecture de la table sélectionnée)
5. Configurez la colonne "Origine_Bureau" :
   - Cliquez sur "Configure" (Configurer)
   - Mappez la colonne `Origine_Bureau` de votre table vers le champ demandé

### 3. Configuration du Webhook Intermédiaire

Le widget ne communique **jamais directement** avec l'API finale pour des raisons de sécurité (CORS) et pour protéger les clés API.

#### Avec n8n (Recommandé)

1. Créez un nouveau workflow dans n8n
2. Ajoutez un nœud **Webhook** :
   - Method : POST
   - Path : `/grist-export` (ou autre)
   - Notez l'URL générée
3. Ajoutez un nœud **HTTP Request** :
   - Method : POST
   - URL : `https://votre-api.example.com/endpoint`
   - Authentication : selon votre API
   - Headers :
     ```json
     {
       "Authorization": "Bearer YOUR_API_KEY",
       "Content-Type": "application/json"
     }
     ```
4. Dans le corps de la requête, utilisez :
   ```json
   {
     "bureau": "{{$json.bureau}}",
     "data": "{{$json.record}}"
   }
   ```
5. Connectez Webhook → HTTP Request
6. Activez le workflow

#### Avec Pipedream

1. Créez un nouveau workflow
2. Sélectionnez "HTTP / Webhook" comme trigger
3. Ajoutez une action "HTTP Request"
4. Configurez l'authentification vers votre API
5. Déployez et notez l'URL du webhook

#### Avec Zapier

1. Créez un nouveau Zap
2. Trigger : "Webhooks by Zapier" → "Catch Hook"
3. Action : "Webhooks by Zapier" → "POST"
4. Configurez l'URL et les en-têtes de votre API

### 4. Utilisation du Widget

1. Dans Grist, sélectionnez une ligne dans votre table
2. Le widget affiche automatiquement :
   - Le bureau d'origine
   - Les données de la ligne
3. Entrez l'URL du webhook (sauvegardée automatiquement)
4. Cliquez sur "Exporter vers l'API"
5. Un message de succès ou d'erreur s'affiche

## 📊 Format des Données Envoyées

Le widget envoie au webhook un payload JSON :

```json
{
  "bureau": "Paris",
  "record": {
    "id": 123,
    "Origine_Bureau": "Paris",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com"
  },
  "timestamp": "2024-01-15T14:30:00.000Z",
  "source": "grist-widget"
}
```

Le webhook peut alors :
- Router les données vers la bonne API en fonction du `bureau`
- Transformer les données si nécessaire
- Ajouter des métadonnées
- Gérer l'authentification

## 🎨 Personnalisation du Style

Le widget utilise le DSFR (Système de Design de l'État Français). Pour personnaliser :

### Modifier les couleurs

Éditez les variables CSS dans `export-widget.html` :

```css
:root {
  --primary-color: #000091;  /* Bleu France */
  --success-color: #18753C;  /* Vert Bourgeon */
  --error-color: #CE0500;    /* Rouge Marianne */
}
```

### Modifier la disposition

Le widget utilise les classes DSFR. Consultez la documentation : https://www.systeme-de-design.gouv.fr/

## 🔧 Dépannage

### Le widget ne s'affiche pas dans Grist

- Vérifiez que l'URL du widget est accessible publiquement
- Vérifiez que le serveur web renvoie les bons headers CORS :
  ```
  Access-Control-Allow-Origin: https://docs.getgrist.com
  ```

### "La colonne Origine_Bureau n'est pas définie"

- Vérifiez que la colonne existe dans votre table
- Vérifiez l'orthographe exacte : `Origine_Bureau` (avec majuscules)
- Vérifiez que la colonne est mappée dans les paramètres du widget

### Erreur lors de l'export

- Vérifiez que l'URL du webhook est correcte
- Vérifiez que le webhook est actif et accessible
- Consultez les logs du webhook pour voir l'erreur

### CORS Error

- C'est normal ! Le widget **doit** passer par un webhook intermédiaire
- Ne tentez pas d'appeler directement votre API
- Configurez correctement le webhook n8n/Pipedream

## 📝 Exemples de Configuration

### Exemple 1 : Table avec ID unique

Si votre table a un champ `id` unique :

```python
# Formule dans Grist pour s'assurer que l'ID est transmis
# (généralement automatique)
$id
```

### Exemple 2 : Multi-bureaux avec code postal

```python
# Colonne Origine_Bureau avec formule
if $code_postal[:2] == "75":
  return "Paris"
elif $code_postal[:2] == "69":
  return "Lyon"
elif $code_postal[:2] == "13":
  return "Marseille"
else:
  return "Autre"
```

### Exemple 3 : Validation avant export

Créez une colonne calculée `Peut_Exporter` :

```python
# Vérifie que tous les champs requis sont remplis
bool($nom and $prenom and $email and $Origine_Bureau)
```

Puis dans le widget, ajoutez une vérification (modification du code) :

```javascript
if (!currentRecord.Peut_Exporter) {
  showStatus('Données incomplètes. Impossible d\'exporter.', 'error');
  return;
}
```

## 🔒 Sécurité

### Bonnes pratiques

✅ **À FAIRE :**
- Toujours utiliser HTTPS pour le widget et le webhook
- Utiliser un webhook intermédiaire (n8n, Pipedream)
- Limiter les permissions Grist au minimum (read table)
- Valider les données côté webhook avant envoi à l'API
- Logger les exports pour l'audit

❌ **À NE PAS FAIRE :**
- Ne jamais mettre de clés API dans le code du widget
- Ne jamais appeler directement l'API depuis le widget
- Ne pas exposer le widget sans authentification Grist
- Ne pas ignorer les erreurs de validation

## 📚 Ressources

- [Documentation Grist Custom Widgets](https://support.getgrist.com/widget-custom/)
- [DSFR - Système de Design](https://www.systeme-de-design.gouv.fr/)
- [n8n Documentation](https://docs.n8n.io/)
- [Pipedream Documentation](https://pipedream.com/docs/)
