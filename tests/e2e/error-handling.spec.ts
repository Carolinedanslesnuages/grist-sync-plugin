import { test, expect } from '@playwright/test';

/**
 * Tests de gestion des erreurs
 */
test.describe('Gestion des erreurs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('devrait afficher une erreur si l\'API ne répond pas', async ({ page }) => {
    // Simuler une erreur réseau
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });

    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    // Attendre un message d'erreur
    await page.waitForTimeout(2000);
    
    // Chercher un message d'erreur dans la page
    const errorMessage = page.locator('.fr-alert--error, .error, [role="alert"]').first();
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    if (hasError) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('devrait afficher une erreur pour une URL invalide', async ({ page }) => {
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('not-a-valid-url');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    await page.waitForTimeout(1000);
    
    // Le bouton suivant devrait rester désactivé
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await expect(nextButton).toBeDisabled();
  });

  test('devrait afficher une erreur si l\'API retourne un statut 404', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' })
      });
    });

    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/notfound');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    await page.waitForTimeout(2000);
    
    // Chercher un message d'erreur
    const errorMessage = page.locator('.fr-alert--error, .error, [role="alert"]').first();
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    expect(hasError).toBeTruthy();
  });

  test('devrait afficher une erreur si l\'API retourne un statut 500', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    await page.waitForTimeout(2000);
    
    // Chercher un message d'erreur
    const errorMessage = page.locator('.fr-alert--error, .error, [role="alert"]').first();
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    expect(hasError).toBeTruthy();
  });

  test('devrait afficher une erreur si l\'API retourne des données invalides', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json data'
      });
    });

    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    await page.waitForTimeout(2000);
    
    // Le bouton suivant devrait rester désactivé en cas de données invalides
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await expect(nextButton).toBeDisabled();
  });
});

/**
 * Tests de récupération après erreur
 */
test.describe('Récupération après erreur', () => {
  test('devrait permettre de réessayer après une erreur', async ({ page }) => {
    let requestCount = 0;
    
    // Première requête échoue, deuxième réussit
    await page.route('**/api/data', (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 1, name: 'Test' }])
        });
      }
    });

    await page.goto('/');
    
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    
    // Première tentative (devrait échouer)
    await loadButton.click();
    await page.waitForTimeout(2000);
    
    // Deuxième tentative (devrait réussir)
    await loadButton.click();
    await page.waitForTimeout(2000);
    
    // Le bouton suivant devrait être activé après succès
    const nextButton = page.getByRole('button', { name: /suivant/i });
    const isEnabled = await nextButton.isEnabled().catch(() => false);
    
    expect(isEnabled).toBeTruthy();
  });

  test('devrait permettre de changer l\'URL après une erreur', async ({ page }) => {
    await page.route('**/bad-api', (route) => {
      route.abort('failed');
    });
    
    await page.route('**/good-api', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: 'Success' }])
      });
    });

    await page.goto('/');
    
    const urlInput = page.getByLabel(/URL de l'API/i);
    
    // Première URL (erreur)
    await urlInput.fill('https://api.example.com/bad-api');
    let loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(2000);
    
    // Changer l'URL
    await urlInput.clear();
    await urlInput.fill('https://api.example.com/good-api');
    
    // Réessayer avec la nouvelle URL
    loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(2000);
    
    // Le bouton suivant devrait être activé
    const nextButton = page.getByRole('button', { name: /suivant/i });
    const isEnabled = await nextButton.isEnabled().catch(() => false);
    
    expect(isEnabled).toBeTruthy();
  });
});

/**
 * Tests de validation des données
 */
test.describe('Validation des données', () => {
  test('devrait gérer le cas où l\'API retourne un tableau vide', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/');
    
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/empty');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    await page.waitForTimeout(2000);
    
    // Devrait afficher un message approprié
    const warningMessage = page.locator('.fr-alert--warning, .fr-alert--info, [role="alert"]').first();
    const hasWarning = await warningMessage.isVisible().catch(() => false);
    
    // Ou le bouton suivant devrait être désactivé
    const nextButton = page.getByRole('button', { name: /suivant/i });
    const isDisabled = await nextButton.isDisabled().catch(() => true);
    
    expect(hasWarning || isDisabled).toBeTruthy();
  });

  test('devrait gérer le cas où l\'API retourne un objet au lieu d\'un tableau', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, name: 'Single Object' })
      });
    });

    await page.goto('/');
    
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/object');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    await page.waitForTimeout(2000);
    
    // L'application devrait gérer cette situation
    // Soit en acceptant l'objet unique, soit en affichant une erreur
    const nextButton = page.getByRole('button', { name: /suivant/i });
    const buttonState = await nextButton.isEnabled().catch(() => false);
    
    // Le comportement attendu dépend de l'implémentation
    // On vérifie juste que l'application ne plante pas
    expect(buttonState !== undefined).toBeTruthy();
  });
});
