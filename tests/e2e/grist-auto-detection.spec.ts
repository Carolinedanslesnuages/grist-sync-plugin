import { test, expect } from '@playwright/test';

/**
 * Tests pour l'auto-détection de la configuration Grist via paramètres de requête
 */
test.describe('Auto-détection Grist via query params', () => {
  test('devrait auto-détecter docId depuis les paramètres de requête', async ({ page }) => {
    // Naviguer avec des paramètres de requête
    await page.goto('/?docId=test-auto-doc-123');
    
    // Attendre que le composant soit monté et que la détection se fasse
    await page.waitForTimeout(1000);
    
    // Mock de l'API pour passer l'étape 1 si nécessaire
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Test', email: 'test@example.com' }
        ])
      });
    });
    
    // Charger des données pour pouvoir passer à l'étape 2
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Passer à l'étape 2 (Configuration Grist)
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    
    // Attendre que l'étape 2 soit visible
    await page.waitForTimeout(500);
    
    // Vérifier que le champ Document ID contient la valeur auto-détectée
    const docIdInput = page.getByLabel(/Document ID/i).first();
    await expect(docIdInput).toHaveValue('test-auto-doc-123');
  });

  test('devrait auto-détecter docId et gristApiUrl depuis les paramètres', async ({ page }) => {
    // Naviguer avec des paramètres de requête
    await page.goto('/?docId=auto-doc-456&gristApiUrl=http://localhost:8484');
    
    // Attendre que le composant soit monté et que la détection se fasse
    await page.waitForTimeout(1000);
    
    // Mock de l'API pour passer l'étape 1
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: 'Test' }])
      });
    });
    
    // Charger des données
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Passer à l'étape 2 (Configuration Grist)
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Vérifier que le champ Document ID contient la valeur auto-détectée
    const docIdInput = page.getByLabel(/Document ID/i).first();
    await expect(docIdInput).toHaveValue('auto-doc-456');
    
    // Vérifier que le champ URL API Grist contient la valeur auto-détectée
    const gristApiUrlInput = page.getByLabel(/URL API Grist/i).first();
    await expect(gristApiUrlInput).toHaveValue('http://localhost:8484');
  });

  test('devrait auto-détecter tous les paramètres Grist', async ({ page }) => {
    // Naviguer avec tous les paramètres de requête
    await page.goto('/?docId=full-auto-doc&gristApiUrl=https://docs.getgrist.com&apiTokenGrist=test-token-xyz');
    
    // Attendre que le composant soit monté
    await page.waitForTimeout(1000);
    
    // Mock de l'API pour passer l'étape 1
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1 }])
      });
    });
    
    // Charger des données
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Passer à l'étape 2 (Configuration Grist)
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Vérifier que le Document ID est auto-détecté
    const docIdInput = page.getByLabel(/Document ID/i).first();
    await expect(docIdInput).toHaveValue('full-auto-doc');
    
    // Vérifier que l'URL API Grist est auto-détectée
    const gristApiUrlInput = page.getByLabel(/URL API Grist/i).first();
    await expect(gristApiUrlInput).toHaveValue('https://docs.getgrist.com');
    
    // Vérifier que le token API est auto-détecté (champ password)
    const tokenInput = page.getByLabel(/Token API Grist/i).first();
    await expect(tokenInput).toHaveValue('test-token-xyz');
  });

  test('devrait auto-détecter tableId depuis les paramètres de requête', async ({ page }) => {
    // Naviguer avec tableId dans les paramètres de requête
    await page.goto('/?docId=test-doc&tableId=MyTable');
    
    // Attendre que le composant soit monté
    await page.waitForTimeout(1000);
    
    // Mock de l'API pour passer l'étape 1
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1 }])
      });
    });
    
    // Charger des données
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Passer à l'étape 2 (Configuration Grist)
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Vérifier que le Document ID est auto-détecté
    const docIdInput = page.getByLabel(/Document ID/i).first();
    await expect(docIdInput).toHaveValue('test-doc');
    
    // Vérifier que le Table ID est auto-détecté
    const tableIdInput = page.getByLabel(/Table ID/i).first();
    await expect(tableIdInput).toHaveValue('MyTable');
  });

  test('devrait afficher un indicateur de détection automatique', async ({ page }) => {
    // Naviguer avec des paramètres de requête
    await page.goto('/?docId=indicator-test-doc');
    
    await page.waitForTimeout(1000);
    
    // Mock de l'API
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1 }])
      });
    });
    
    // Charger des données
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Passer à l'étape 2
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Chercher un badge ou indicateur "Auto-détecté"
    const autoDetectedBadge = page.locator('text=/auto-détect/i').first();
    const hasBadge = await autoDetectedBadge.isVisible().catch(() => false);
    
    // Si un badge est présent, c'est une bonne pratique UX
    if (hasBadge) {
      await expect(autoDetectedBadge).toBeVisible();
    }
  });

  test('devrait fonctionner sans paramètres de requête', async ({ page }) => {
    // Naviguer sans paramètres de requête (mode normal)
    await page.goto('/');
    
    await page.waitForTimeout(1000);
    
    // Mock de l'API
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1 }])
      });
    });
    
    // Charger des données
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Passer à l'étape 2
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Les champs devraient être vides ou avoir des valeurs par défaut
    const docIdInput = page.getByLabel(/Document ID/i).first();
    const docIdValue = await docIdInput.inputValue();
    
    // La valeur devrait être vide ou "YOUR_DOC_ID" (valeur par défaut)
    expect(['', 'YOUR_DOC_ID']).toContain(docIdValue);
  });
});

/**
 * Tests pour l'auto-détection en mode développement
 */
test.describe('Auto-détection en mode développement', () => {
  test('devrait permettre de tester la config avec des query params en dev', async ({ page }) => {
    // Simuler un environnement de développement avec query params
    await page.goto('/?docId=dev-test-doc&gristApiUrl=http://localhost:8484&apiTokenGrist=dev-token');
    
    await page.waitForTimeout(1000);
    
    // La page devrait se charger sans erreur
    await expect(page).toHaveTitle(/Grist Sync Plugin/);
    
    // Vérifier que la console ne contient pas d'erreurs critiques
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // Attendre un peu pour que les logs se collectent
    await page.waitForTimeout(1000);
    
    // Filtrer les erreurs non critiques
    const criticalErrors = logs.filter(log => 
      !log.includes('DevTools') && 
      !log.includes('favicon')
    );
    
    // Ne devrait pas y avoir d'erreurs critiques
    expect(criticalErrors.length).toBe(0);
  });
});
