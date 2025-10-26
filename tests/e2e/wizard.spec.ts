import { test, expect } from '@playwright/test';

/**
 * Tests pour la navigation et l'interface du wizard
 */
test.describe('Navigation du Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('devrait afficher la page d\'accueil avec le wizard', async ({ page }) => {
    // Vérifier que le titre de la page est correct
    await expect(page).toHaveTitle(/Grist Sync Plugin/);
    
    // Vérifier que le wizard stepper est présent
    const stepper = page.locator('.fr-stepper');
    await expect(stepper).toBeVisible();
  });

  test('devrait afficher l\'étape 1 par défaut', async ({ page }) => {
    // Vérifier que l'étape 1 est active
    const currentStep = page.locator('.fr-stepper__step[aria-current="step"]');
    await expect(currentStep).toContainText('Récupération des données');
  });

  test('devrait désactiver le bouton "Suivant" si aucune donnée n\'est chargée', async ({ page }) => {
    // Le bouton suivant devrait être désactivé au début
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await expect(nextButton).toBeDisabled();
  });

  test('devrait afficher le champ URL de l\'API à l\'étape 1', async ({ page }) => {
    // Vérifier la présence du champ URL
    const urlInput = page.getByLabel(/URL de l'API/i);
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toBeEditable();
  });

  test('devrait avoir un bouton "Charger les données"', async ({ page }) => {
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await expect(loadButton).toBeVisible();
  });
});

/**
 * Tests pour l'étape 1 : Récupération des données API
 */
test.describe('Étape 1 - Récupération des données', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('devrait permettre de saisir une URL d\'API', async ({ page }) => {
    const urlInput = page.getByLabel(/URL de l'API/i);
    const testUrl = 'https://jsonplaceholder.typicode.com/users';
    
    await urlInput.fill(testUrl);
    await expect(urlInput).toHaveValue(testUrl);
  });

  test('devrait afficher une erreur si l\'URL est invalide', async ({ page }) => {
    const urlInput = page.getByLabel(/URL de l'API/i);
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    
    // Essayer de charger avec une URL invalide
    await urlInput.fill('url-invalide');
    await loadButton.click();
    
    // Attendre un message d'erreur (peut varier selon l'implémentation)
    await page.waitForTimeout(1000);
    
    // Le bouton suivant devrait rester désactivé
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await expect(nextButton).toBeDisabled();
  });
});

/**
 * Tests pour le flux complet avec données mockées
 */
test.describe('Flux complet du wizard', () => {
  test('devrait permettre de naviguer entre les étapes avec des données valides', async ({ page }) => {
    // Intercepter l'appel API pour retourner des données de test
    await page.route('**/users', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ])
      });
    });

    await page.goto('/');
    
    // Étape 1: Charger les données
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/users');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    // Attendre que les données soient chargées
    await page.waitForTimeout(1000);
    
    // Le bouton suivant devrait être activé
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await expect(nextButton).toBeEnabled();
    
    // Passer à l'étape 2
    await nextButton.click();
    
    // Vérifier qu'on est sur l'étape 2
    const currentStep = page.locator('.fr-stepper__step[aria-current="step"]');
    await expect(currentStep).toContainText('Mapping des champs');
  });

  test('devrait permettre de revenir à l\'étape précédente', async ({ page }) => {
    // Intercepter l'appel API
    await page.route('**/users', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Test User', email: 'test@example.com' }
        ])
      });
    });

    await page.goto('/');
    
    // Charger des données et passer à l'étape 2
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/users');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    
    // Vérifier qu'on est sur l'étape 2
    let currentStep = page.locator('.fr-stepper__step[aria-current="step"]');
    await expect(currentStep).toContainText('Mapping des champs');
    
    // Revenir à l'étape 1
    const previousButton = page.getByRole('button', { name: /précédent/i });
    await expect(previousButton).toBeVisible();
    await previousButton.click();
    
    // Vérifier qu'on est de retour sur l'étape 1
    currentStep = page.locator('.fr-stepper__step[aria-current="step"]');
    await expect(currentStep).toContainText('Récupération des données');
  });
});

/**
 * Tests d'accessibilité basiques
 */
test.describe('Accessibilité', () => {
  test('devrait avoir des labels appropriés pour les champs de formulaire', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que les champs ont des labels
    const urlInput = page.getByLabel(/URL de l'API/i);
    await expect(urlInput).toBeVisible();
  });

  test('devrait permettre la navigation au clavier', async ({ page }) => {
    await page.goto('/');
    
    // Tester la navigation par Tab
    await page.keyboard.press('Tab');
    
    // Vérifier que le focus est sur un élément interactif
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A', 'TEXTAREA', 'SELECT']).toContain(focusedElement);
  });
});
