# grist-sync-plugin

> **Synchronisez facilement vos données API vers Grist.**

Ce plugin permet de transférer des données depuis une API vers la plateforme [Grist](https://www.getgrist.com).

## 🔄 Solution de Synchronisation Bi-directionnelle

Ce projet propose maintenant une **solution complète de synchronisation bi-directionnelle** entre une API centrale et une flotte de documents Grist (architecture multi-bureaux).

### 🚀 Démarrage Rapide

📖 **[Guide de Démarrage Rapide (5-10 minutes)](docs/QUICKSTART.md)**

### Fonctionnalités principales :

- ✅ **Flux entrant (API → Grist)** : Script Python pour synchronisation quotidienne avec méthode Upsert
- ✅ **Flux sortant (Grist → API)** : Custom Widget pour export manuel avec style DSFR
- ✅ **Multi-tenants** : Architecture centralisée pour plusieurs documents Grist
- ✅ **Sécurité** : Clés API protégées, communication via webhook intermédiaire

### 📚 Documentation Complète

- **[Guide Complet de Synchronisation](docs/BIDIRECTIONAL_SYNC.md)** - Documentation principale
- **[Diagrammes d'Architecture](docs/ARCHITECTURE.md)** - Flux et schémas détaillés
- **[Script Python de Synchronisation](scripts/README.md)** - Ingestion quotidienne
- **[Widget d'Export Personnalisé](public/widget/README.md)** - Export manuel
- **[Tests et Validation](public/widget/TESTING.md)** - Guide de test

### ⚡ Installation Express

```bash
# 1. Flux entrant (API → Grist)
cd scripts
cp config.example.json config.json
# Éditer config.json avec vos paramètres
pip install -r requirements.txt
python daily_sync.py

# 2. Flux sortant (Grist → API)
npm install
npm run build
# Le widget sera dans dist/widget/export-widget.html
```

Consultez le [Guide de Démarrage Rapide](docs/QUICKSTART.md) pour les instructions détaillées.

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
