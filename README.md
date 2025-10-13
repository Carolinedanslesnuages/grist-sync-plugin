# 🔄 Grist Sync Plugin

Un plugin simple et intuitif pour synchroniser des données depuis n'importe quelle API vers une table Grist, avec une interface de mapping visuel inspirée d'Excel.

## 📋 Fonctionnalités

- **Interface simple et intuitive** : Conçue pour les utilisateurs non techniques
- **Mapping visuel** : Définissez la correspondance entre colonnes Grist et champs API comme dans Excel
- **Support API universelle** : Fonctionne avec n'importe quelle API REST JSON
- **Authentification flexible** : Support des tokens Bearer pour les APIs sécurisées
- **Aperçu en temps réel** : Visualisez les données avant la synchronisation
- **TypeScript** : Code entièrement typé pour plus de robustesse

## 🚀 Démarrage rapide

### Prérequis

- Node.js (version 16 ou supérieure)
- Un compte Grist avec un document et une table créés

### Installation

1. Clonez le repository :
```bash
git clone https://github.com/Carolinedanslesnuages/grist-sync-plugin.git
cd grist-sync-plugin
```

2. Installez les dépendances :
```bash
npm install
```

3. Lancez le serveur de développement :
```bash
npm run dev
```

4. Ouvrez votre navigateur à l'adresse indiquée (généralement http://localhost:5173)

### Build pour la production

```bash
npm run build
```

Les fichiers optimisés seront générés dans le dossier `dist/`.

## 📖 Guide d'utilisation

### Étape 1 : Configuration Grist

1. **Document ID** : Trouvez l'ID de votre document Grist dans l'URL
   - Exemple : `https://docs.getgrist.com/doc/abc123xyz` → ID = `abc123xyz`

2. **Table ID** : Le nom de votre table Grist
   - Exemple : `Users`, `Products`, `Orders`

3. **Token API** (optionnel) : Si votre document est privé
   - Générez un token dans les paramètres de votre compte Grist
   - Menu → Account → API → Create API Key

4. **URL API Grist** : Par défaut `https://docs.getgrist.com`
   - Modifiez si vous utilisez une instance auto-hébergée

### Étape 2 : Source API

1. Saisissez l'URL de votre API source
   - Exemple : `https://jsonplaceholder.typicode.com/users`
   
2. Ajoutez un token Bearer si nécessaire (optionnel)

3. Cliquez sur **"📥 Récupérer les données"**

### Étape 3 : Configuration du mapping

Une fois les données récupérées, vous verrez une table de mapping (style Excel) :

| # | Colonne Grist | → | Champ API |
|---|---------------|---|-----------|
| 1 | Name          | ← | user.name |
| 2 | Email         | ← | email     |
| 3 | Phone         | ← | phone     |

**Comment définir un mapping :**

- **Colonne Grist** : Le nom exact de la colonne dans votre table Grist
- **Champ API** : Le chemin vers le champ dans les données API
  - Simple : `email`, `name`, `id`
  - Imbriqué : `user.name`, `address.city`, `company.name`

**Astuce** 💡 : Si des données d'exemple sont disponibles, les champs API seront suggérés automatiquement !

### Étape 4 : Synchronisation

1. Vérifiez que vos mappings sont corrects
2. Cliquez sur **"🚀 Synchroniser vers Grist"**
3. Les données seront insérées dans votre table Grist

## ⚙️ Configuration avancée

### Personnalisation du fichier config.ts

Éditez le fichier `src/config.ts` pour définir des valeurs par défaut :

```typescript
export const defaultConfig: GristConfig = {
  docId: 'votre-doc-id',          // Votre ID de document
  tableId: 'VotreTable',           // Votre table par défaut
  apiTokenGrist: 'votre-token',    // Optionnel
  gristApiUrl: 'https://docs.getgrist.com'
};
```

### Transformation des données

Pour des transformations personnalisées, modifiez `src/utils/mapping.ts` :

```typescript
// Exemple de transformation
const mappings = [
  {
    gristColumn: 'FullName',
    apiField: 'name',
    transform: (value) => value.toUpperCase() // Mettre en majuscules
  },
  {
    gristColumn: 'Price',
    apiField: 'price',
    transform: (value) => parseFloat(value) * 1.2 // Ajouter 20%
  }
];
```

## 🗂️ Structure du projet

```
grist-sync-plugin/
├── src/
│   ├── components/
│   │   ├── ApiToGrist.vue      # Composant principal
│   │   └── MappingTable.vue    # Table de mapping visuel
│   ├── utils/
│   │   ├── mapping.ts          # Logique de transformation
│   │   └── grist.ts            # Client API Grist
│   ├── config.ts               # Configuration centralisée
│   ├── App.vue                 # Application racine
│   └── main.ts                 # Point d'entrée
├── public/                     # Fichiers statiques
├── index.html                  # Page HTML principale
├── package.json                # Dépendances
└── README.md                   # Ce fichier
```

## 📚 Exemples d'utilisation

### Exemple 1 : API publique simple

**API** : JSONPlaceholder (https://jsonplaceholder.typicode.com/users)

**Mapping** :
- `Name` ← `name`
- `Email` ← `email`
- `Phone` ← `phone`
- `Website` ← `website`

### Exemple 2 : API avec données imbriquées

**Données API** :
```json
{
  "user": {
    "profile": {
      "firstName": "Alice",
      "lastName": "Dupont"
    },
    "contact": {
      "email": "alice@example.com"
    }
  }
}
```

**Mapping** :
- `FirstName` ← `user.profile.firstName`
- `LastName` ← `user.profile.lastName`
- `Email` ← `user.contact.email`

### Exemple 3 : API paginée

Si votre API retourne des données paginées, assurez-vous d'utiliser l'URL complète avec les paramètres :

```
https://api.example.com/users?page=1&limit=100
```

Le plugin détecte automatiquement les formats courants :
- `{ data: [...] }`
- `{ results: [...] }`
- `{ items: [...] }`
- Tableaux directs `[...]`

## 🔧 Dépannage

### Erreur : "Impossible de se connecter à Grist"

**Solutions** :
- Vérifiez que votre Document ID est correct
- Vérifiez que votre Table ID correspond exactement au nom de la table
- Si le document est privé, assurez-vous d'avoir fourni un token API valide
- Testez la connexion avec le bouton "🔍 Tester la connexion Grist"

### Erreur : "CORS Policy"

**Solutions** :
- Certaines APIs publiques ne permettent pas les requêtes depuis le navigateur
- Utilisez un proxy CORS ou configurez l'API pour autoriser votre domaine
- Pour le développement, vous pouvez utiliser une extension de navigateur pour désactiver CORS (à utiliser avec prudence)

### Erreur : "Aucune donnée trouvée"

**Solutions** :
- Vérifiez que l'URL de l'API est correcte
- Vérifiez que l'API retourne bien des données JSON
- Consultez la console du navigateur (F12) pour plus de détails

### Les données ne s'insèrent pas correctement

**Solutions** :
- Vérifiez que les noms de colonnes Grist correspondent exactement (sensible à la casse)
- Assurez-vous que les types de données sont compatibles (texte, nombre, etc.)
- Vérifiez les chemins des champs API (utilisez la notation pointée pour les objets imbriqués)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- [Grist](https://www.getgrist.com/) - La plateforme de base de données flexible
- [Vue.js](https://vuejs.org/) - Le framework JavaScript progressif
- [Vite](https://vitejs.dev/) - L'outil de build ultra-rapide

## 📧 Support

Pour toute question ou problème :
- Ouvrez une [issue](https://github.com/Carolinedanslesnuages/grist-sync-plugin/issues)
- Consultez la [documentation Grist](https://support.getgrist.com/)

---

**Fait avec ❤️ pour rendre la synchronisation de données simple et accessible à tous**
