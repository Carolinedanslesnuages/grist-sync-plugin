# Tests Playwright - Guide d'utilisation

Ce document explique comment exécuter et développer des tests E2E (End-to-End) avec Playwright pour le projet Grist Sync Plugin.

## 📋 Prérequis

- Node.js 18+ installé
- Dépendances du projet installées (`npm install`)
- Navigateurs Playwright installés

## 🚀 Installation

### Installer les dépendances

```bash
npm install
```

### Installer les navigateurs Playwright

```bash
npx playwright install
```

Pour installer uniquement Chromium (plus rapide pour le développement) :

```bash
npx playwright install chromium
```

Pour installer avec les dépendances système (nécessaire en CI) :

```bash
npx playwright install --with-deps
```

## 🧪 Exécution des tests

### Exécuter tous les tests E2E

```bash
npm run test:e2e
```

### Exécuter les tests en mode UI (interface graphique)

```bash
npm run test:e2e:ui
```

Cette commande ouvre une interface graphique interactive permettant de :
- Visualiser les tests en temps réel
- Déboguer les tests
- Voir les traces et screenshots

### Exécuter les tests en mode debug

```bash
npm run test:e2e:debug
```

Le mode debug permet de :
- Exécuter les tests pas à pas
- Inspecter l'état du navigateur à chaque étape
- Modifier et rejouer les actions

### Voir le rapport des tests

Après l'exécution des tests, générer et afficher le rapport HTML :

```bash
npm run test:e2e:report
```

### Exécuter un fichier de test spécifique

```bash
npx playwright test tests/e2e/wizard.spec.ts
```

### Exécuter un test spécifique par son nom

```bash
npx playwright test -g "devrait afficher la page d'accueil"
```

### Exécuter les tests sur un seul navigateur

```bash
npx playwright test --project=chromium
```

Navigateurs disponibles : `chromium`, `firefox`, `webkit`

## 📁 Structure des tests

```
tests/
└── e2e/
    ├── wizard.spec.ts          # Tests de navigation du wizard
    ├── mapping.spec.ts         # Tests du mapping des données
    ├── grist-config.spec.ts    # Tests de configuration Grist
    └── error-handling.spec.ts  # Tests de gestion des erreurs
```

## ✍️ Écrire de nouveaux tests

### Structure de base d'un test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Nom du groupe de tests', () => {
  test.beforeEach(async ({ page }) => {
    // Configuration avant chaque test
    await page.goto('/');
  });

  test('description du test', async ({ page }) => {
    // Votre code de test ici
    const element = page.getByRole('button', { name: 'Cliquez-moi' });
    await expect(element).toBeVisible();
  });
});
```

### Bonnes pratiques

1. **Noms descriptifs** : Utilisez des noms de tests clairs et en français
2. **Isolation** : Chaque test doit être indépendant
3. **Attentes explicites** : Utilisez `expect()` pour vérifier les comportements
4. **Sélecteurs robustes** : Préférez les sélecteurs par rôle (`getByRole`) ou label (`getByLabel`)
5. **Mocking d'API** : Utilisez `page.route()` pour simuler les réponses API

### Exemple de mock d'API

```typescript
await page.route('**/api/data', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 1, name: 'Test' }
    ])
  });
});
```

## 🔧 Configuration

La configuration Playwright se trouve dans `playwright.config.ts`. Vous pouvez y modifier :

- Les navigateurs à utiliser
- Les timeouts
- Les reporters
- Les options de capture (screenshots, vidéos, traces)
- L'URL de base de l'application

## 🐛 Débogage

### Voir les traces d'un test qui a échoué

Lorsqu'un test échoue, Playwright génère automatiquement :
- Des screenshots
- Des vidéos (si configuré)
- Des traces

Pour voir la trace d'un test échoué :

```bash
npx playwright show-trace trace.zip
```

### Mode headed (voir le navigateur)

Pour voir le navigateur pendant l'exécution :

```bash
npx playwright test --headed
```

### Ralentir l'exécution

Pour ralentir l'exécution et mieux observer :

```bash
npx playwright test --headed --slow-mo=1000
```

## 🎯 Tests disponibles

### wizard.spec.ts
Tests de la navigation et de l'interface générale du wizard :
- Affichage de la page d'accueil
- Navigation entre les étapes
- État des boutons (activé/désactivé)
- Accessibilité de base

### mapping.spec.ts
Tests du mapping des données de l'API vers Grist :
- Affichage de la table de mapping
- Ajout de lignes de mapping
- Sélection des champs
- Validation du mapping

### grist-config.spec.ts
Tests de la configuration Grist :
- Saisie du Document ID
- Saisie du Table ID
- Configuration de l'API Key
- Options de synchronisation

### error-handling.spec.ts
Tests de gestion des erreurs :
- Erreurs réseau
- Erreurs API (404, 500)
- Données invalides
- Récupération après erreur

## 📊 Rapports et CI

Les tests Playwright génèrent plusieurs types de rapports :

- **Rapport HTML** : Rapport visuel détaillé avec traces et screenshots
- **Liste** : Affichage simple dans le terminal
- **JSON** : Pour l'intégration avec d'autres outils

Le rapport HTML est disponible après l'exécution dans `playwright-report/index.html`.

## 🔄 Intégration Continue (CI)

Les tests Playwright sont configurés pour s'exécuter dans le workflow CI GitHub Actions.

Le workflow :
1. Installe les dépendances
2. Installe les navigateurs Playwright
3. Build l'application
4. Lance les tests E2E
5. Upload les rapports en cas d'échec

Voir `.github/workflows/playwright.yml` pour plus de détails.

## 🆘 Dépannage

### Les tests échouent avec "Timeout"

- Augmentez le timeout dans `playwright.config.ts`
- Vérifiez que l'application démarre correctement sur le port 5173
- Utilisez des attentes explicites (`await expect(element).toBeVisible()`)

### Les navigateurs ne se lancent pas

```bash
npx playwright install --with-deps
```

### L'application ne démarre pas avant les tests

Vérifiez que le serveur de développement fonctionne :

```bash
npm run dev
```

Puis dans un autre terminal :

```bash
npx playwright test
```

## 📚 Ressources

- [Documentation Playwright](https://playwright.dev)
- [Sélecteurs Playwright](https://playwright.dev/docs/selectors)
- [Meilleures pratiques](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

## 🤝 Contribution

Pour ajouter de nouveaux tests :

1. Créez un nouveau fichier `.spec.ts` dans `tests/e2e/`
2. Suivez la structure et les conventions existantes
3. Testez vos tests localement avec `npm run test:e2e`
4. Assurez-vous que les tests passent en CI

---

**Bon testing ! 🎭**
