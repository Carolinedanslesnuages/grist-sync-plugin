# grist-sync-plugin

> **Synchronisez facilement vos données API vers Grist et exportez-les vers GitHub.**

Ce plugin permet de transférer des données depuis une API vers la plateforme [Grist](https://www.getgrist.com), et d'exporter ensuite ces données vers un dépôt GitHub via Pull Request.

---

## ✨ Fonctionnalités

- 🔄 **Synchronisation API → Grist** : Importez vos données depuis une API REST vers Grist
- 🔗 **Mapping de champs** : Configurez la correspondance entre les champs API et les colonnes Grist
- 📊 **Export vers GitHub** : Exportez vos données Grist vers GitHub via Pull Request (JSON/CSV)
- 🔍 **Logs détaillés** : Suivez chaque étape de la synchronisation en temps réel
- ✅ **Gestion d'erreurs** : Messages d'erreur clairs et solutions recommandées

Pour plus de détails sur la synchronisation vers GitHub, consultez [GITHUB_SYNC.md](./GITHUB_SYNC.md).

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

ou
```bash
npm run dev
```

*(Selon la configuration du projet)*

### 📁 Structure du projet

- **Interface utilisateur** : [Vue.js](https://vuejs.org/)
- **Sources principales** : dossier `src/`

### 🤝 Contribution

Les contributions sont les bienvenues !  
Pour proposer des améliorations, ouvrez une **issue** ou une **pull request** sur GitHub.

---

**Organisation** : [dnum-mi](https://github.com/dnum-mi)

*Pour toute question ou suggestion, ouvrez une issue sur GitHub.*
