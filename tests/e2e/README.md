# Tests E2E Playwright

Ce dossier contient les tests End-to-End (E2E) pour le plugin Grist Sync, écrits avec [Playwright](https://playwright.dev).

## 📂 Structure

- `wizard.spec.ts` - Tests de navigation du wizard et de l'interface générale
- `mapping.spec.ts` - Tests du mapping des données API vers Grist
- `grist-config.spec.ts` - Tests de la configuration Grist
- `error-handling.spec.ts` - Tests de gestion des erreurs et cas limites

## 🚀 Exécution rapide

```bash
# Exécuter tous les tests
npm run test:e2e

# Exécuter avec l'interface graphique
npm run test:e2e:ui

# Exécuter un fichier spécifique
npx playwright test tests/e2e/wizard.spec.ts
```

## 📖 Documentation complète

Consultez le [guide complet des tests Playwright](../../docs/PLAYWRIGHT_TESTS.md) pour :
- Les instructions d'installation
- Les détails de configuration
- Les bonnes pratiques
- Le guide de débogage
- Les exemples de tests

## 🎯 Couverture des tests

Les tests couvrent les parcours fonctionnels principaux :

✅ **Navigation**
- Affichage initial du wizard
- Navigation entre les étapes
- État des boutons (activé/désactivé)
- Retour aux étapes précédentes

✅ **Étape 1 : Récupération des données**
- Saisie d'URL API
- Chargement des données
- Validation des URL
- Gestion des erreurs réseau

✅ **Étape 2 : Mapping**
- Affichage des champs API
- Configuration du mapping
- Ajout/suppression de mappings
- Validation du mapping

✅ **Étape 3 : Configuration Grist**
- Saisie Document ID
- Saisie Table ID
- Configuration API Key
- Options de synchronisation

✅ **Gestion des erreurs**
- Erreurs réseau (timeout, DNS)
- Erreurs API (404, 500)
- Données invalides
- Récupération après erreur

## 🧪 Stratégie de test

Les tests utilisent des **mocks d'API** pour :
- Garantir la reproductibilité
- Éviter les dépendances externes
- Tester les cas d'erreur
- Accélérer l'exécution

Exemple de mock :
```typescript
await page.route('**/api/data', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Test' }])
  });
});
```

## 🔧 Configuration

La configuration Playwright se trouve dans `playwright.config.ts` à la racine du projet.

Configuration actuelle :
- **Navigateurs** : Chromium, Firefox, WebKit
- **URL de base** : http://localhost:5173
- **Serveur dev** : Démarré automatiquement avant les tests
- **Retry** : 2 tentatives en CI, 0 en local
- **Rapports** : HTML + liste dans le terminal

## ⚠️ Prérequis

Avant d'exécuter les tests :

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Installer les navigateurs Playwright :
   ```bash
   npx playwright install
   ```

## 💡 Conseils

- Utilisez `test:e2e:ui` pour développer de nouveaux tests
- Utilisez `test:e2e:debug` pour déboguer un test qui échoue
- Les traces et screenshots sont automatiquement générés en cas d'échec
- Les tests s'exécutent en parallèle par défaut (plus rapide)

## 🤝 Contribution

Pour ajouter de nouveaux tests :

1. Créez un nouveau fichier `.spec.ts` dans ce dossier
2. Suivez les conventions de nommage et la structure existante
3. Utilisez des mocks d'API pour l'isolation
4. Testez localement avec `npm run test:e2e`
5. Vérifiez que les tests passent en CI

---

Pour toute question, consultez la [documentation Playwright](https://playwright.dev) ou ouvrez une issue.
