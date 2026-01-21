# Test du Widget Localement

## Option 1 : Avec le serveur de développement Vite

```bash
# Installer les dépendances si ce n'est pas déjà fait
npm install

# Lancer le serveur de développement
npm run dev
```

Le widget sera accessible à :
```
http://localhost:5173/widget/export-widget.html
```

## Option 2 : Avec un serveur HTTP simple (Python)

```bash
# Depuis la racine du projet
cd public
python3 -m http.server 8000
```

Le widget sera accessible à :
```
http://localhost:8000/widget/export-widget.html
```

## Option 3 : Avec un serveur HTTP simple (Node.js)

```bash
# Installer http-server globalement
npm install -g http-server

# Depuis la racine du projet
cd public
http-server -p 8000
```

Le widget sera accessible à :
```
http://localhost:8000/widget/export-widget.html
```

## Test dans Grist

1. Ouvrez votre document Grist de test
2. Ajoutez un Custom Widget
3. URL du widget : `http://localhost:5173/widget/export-widget.html` (ou le port correspondant)
4. Accès : "Read selected table"
5. Mappez la colonne `Origine_Bureau`

⚠️ **Note** : Pour que Grist puisse accéder au widget local, vous devrez peut-être :
- Utiliser ngrok pour exposer votre serveur local : `ngrok http 5173`
- Ou configurer HTTPS localement
- Ou utiliser une version déployée du widget

## Test du Widget en Mode Standalone

Pour tester le widget hors de Grist :

1. Ouvrez `public/widget/export-widget.html` directement dans votre navigateur
2. Le widget affichera "Aucune ligne sélectionnée" car il n'est pas dans Grist
3. Vous pouvez vérifier :
   - Le chargement des styles DSFR
   - L'affichage de l'interface
   - La validation du formulaire

## Exemple de Payload Envoyé

Quand vous cliquez sur "Exporter", le widget envoie :

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
  "timestamp": "2024-01-21T15:30:00.000Z",
  "source": "grist-widget"
}
```

## Test avec un Webhook de Test

Vous pouvez utiliser webhook.site pour tester :

1. Allez sur https://webhook.site
2. Copiez l'URL unique générée
3. Collez-la dans le champ "URL du Webhook" du widget
4. Effectuez un export
5. Vérifiez la réception sur webhook.site
