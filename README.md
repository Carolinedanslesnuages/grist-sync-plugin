# grist-sync-plugin

> **Synchronisez facilement vos données API vers Grist.**

Ce plugin permet de transférer des données depuis une API vers la plateforme [Grist](https://www.getgrist.com).

## ✨ Nouveauté : Auto-détection de la configuration

Le plugin peut désormais **détecter automatiquement** l'URL et le token d'API Grist lorsqu'il est utilisé comme Custom Widget dans Grist ! Plus besoin de saisir manuellement ces informations.

📖 **Consultez le [guide d'auto-détection](docs/AUTO_DETECTION.md)** pour plus de détails.

## 🔗 Formats d'URL Grist supportés

Le plugin supporte plusieurs formats d'URL Grist pour faciliter la configuration :
- Format standard : `https://docs.getgrist.com/doc/{docId}`
- Format path-style : `https://docs.getgrist.com/d/{docId}`
- Avec table ID : `https://docs.getgrist.com/doc/{docId}/p/{tableId}`
- Et bien d'autres formats...

📖 **Consultez le [guide des formats d'URL](docs/URL_FORMATS.md)** pour la liste complète.

---

## 🚀 Pour les développeurs

### 🛠 Installation

Clonez le dépôt et installez les dépendances :

```bash
git clone https://github.com/dnum-mi/grist-sync-plugin.git
cd grist-sync-plugin
npm install
```

### ▶️ Lancement en développement

Pour démarrer le projet en mode développement :

```bash
npm run dev
```

### 🐳 Tester avec Docker (Grist local)

Pour tester le plugin avec une instance Grist locale via Docker Compose :

```bash
docker-compose up -d
```

Grist sera accessible sur http://localhost:8484

📖 **Consultez le [guide de configuration Docker](docs/DOCKER_SETUP.md)** pour plus de détails.


### 📁 Structure du projet

- **Interface utilisateur** : [Vue.js](https://vuejs.org/)
- **Sources principales** : dossier `src/`

### 🧪 Tests

Le projet dispose de deux types de tests :

#### Tests unitaires (Vitest)

```bash
npm run test              # Exécution des tests
npm run test:ui          # Interface graphique
npm run test:coverage    # Rapport de couverture
```

#### Tests E2E (Playwright)

```bash
npm run test:e2e         # Exécution des tests E2E
npm run test:e2e:ui      # Interface graphique Playwright
npm run test:e2e:debug   # Mode debug
```

📖 **Consultez le [guide des tests Playwright](docs/PLAYWRIGHT_TESTS.md)** pour plus de détails.

### 🤝 Contribution

Les contributions sont les bienvenues !  
Pour proposer des améliorations, ouvrez une **issue** ou une **pull request** sur GitHub.

---

**Organisation** : [dnum-mi](https://github.com/dnum-mi)

*Pour toute question ou suggestion, ouvrez une issue sur GitHub.*
