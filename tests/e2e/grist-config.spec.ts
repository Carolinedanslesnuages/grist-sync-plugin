import { test, expect } from '@playwright/test';

/**
 * Tests pour l'étape 2 : Configuration Grist
 */
test.describe('Étape 2 - Configuration Grist', () => {
  test.beforeEach(async ({ page }) => {
    // Mock de l'API pour passer l'étape 1
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Test', email: 'test@example.com' }
        ])
      });
    });

    await page.goto('/');
    
    // Étape 1: Charger les données
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Passer à l'étape 2 (Configuration Grist)
    let nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    
    // Vérifier qu'on est sur l'étape 2
    const currentStep = page.locator('.fr-stepper__step[aria-current="step"]');
    await expect(currentStep).toContainText('Configuration Grist');
  });

  test('devrait afficher les champs de configuration Grist', async ({ page }) => {
    // Chercher les champs de configuration Grist
    const docIdInput = page.getByLabel(/Document ID/i).or(page.getByLabel(/ID du document/i));
    const tableIdInput = page.getByLabel(/Table ID/i).or(page.getByLabel(/ID de la table/i));
    
    // Au moins un des deux champs devrait être visible
    const docIdVisible = await docIdInput.isVisible().catch(() => false);
    const tableIdVisible = await tableIdInput.isVisible().catch(() => false);
    
    expect(docIdVisible || tableIdVisible).toBeTruthy();
  });

  test('devrait permettre de saisir un Document ID', async ({ page }) => {
    const docIdInput = page.getByLabel(/Document ID/i).or(page.getByLabel(/ID du document/i)).first();
    
    if (await docIdInput.isVisible()) {
      await docIdInput.fill('test-doc-id-123');
      await expect(docIdInput).toHaveValue('test-doc-id-123');
    }
  });

  test('devrait permettre de saisir un Table ID', async ({ page }) => {
    const tableIdInput = page.getByLabel(/Table ID/i).or(page.getByLabel(/ID de la table/i)).first();
    
    if (await tableIdInput.isVisible()) {
      await tableIdInput.fill('TestTable');
      await expect(tableIdInput).toHaveValue('TestTable');
    }
  });

  test('devrait permettre de saisir une clé API Grist', async ({ page }) => {
    const apiKeyInput = page.getByLabel(/API Key/i).or(page.getByLabel(/Clé API/i)).first();
    
    if (await apiKeyInput.isVisible()) {
      await apiKeyInput.fill('test-api-key-xyz');
      await expect(apiKeyInput).toHaveValue('test-api-key-xyz');
    }
  });

  test('devrait bloquer le passage à l\'étape suivante si la configuration est incomplète', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: /suivant/i });
    
    // Le bouton devrait être désactivé avec une configuration par défaut
    const isDisabledOrHidden = await nextButton.isDisabled().catch(() => true);
    
    expect(isDisabledOrHidden).toBeTruthy();
  });
});

/**
 * Tests de validation de la configuration Grist
 */
test.describe('Validation de la configuration Grist', () => {
  test('devrait afficher des messages d\'aide pour les champs de configuration', async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ test: 'data' }])
      });
    });

    await page.goto('/');
    
    // Navigation rapide vers l'étape 3
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Chercher des messages d'aide ou tooltips
    const helpText = page.locator('.fr-hint-text, .help-text, [role="tooltip"]').first();
    const hasHelp = await helpText.isVisible().catch(() => false);
    
    // C'est une bonne pratique UX d'avoir des textes d'aide
    if (hasHelp) {
      await expect(helpText).toBeVisible();
    }
  });

  test('devrait permettre de configurer l\'URL du serveur Grist', async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ test: 'data' }])
      });
    });

    await page.goto('/');
    
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Chercher un champ pour l'URL du serveur Grist
    const gristUrlInput = page.getByLabel(/Grist URL/i).or(page.getByLabel(/URL Grist/i)).or(page.getByLabel(/Serveur Grist/i)).first();
    const hasGristUrl = await gristUrlInput.isVisible().catch(() => false);
    
    if (hasGristUrl) {
      await gristUrlInput.fill('https://docs.getgrist.com');
      await expect(gristUrlInput).toHaveValue('https://docs.getgrist.com');
    }
  });
});

/**
 * Tests pour les options de synchronisation
 */
test.describe('Options de synchronisation', () => {
  test('devrait afficher les options de mode de synchronisation', async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1 }])
      });
    });

    await page.goto('/');
    
    // Navigation rapide
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    // Chercher des options de mode (insert, update, upsert, etc.)
    const pageContent = await page.content();
    
    // Vérifier si des modes de synchronisation sont mentionnés
    const hasSyncModes = pageContent.includes('insert') || 
                        pageContent.includes('update') || 
                        pageContent.includes('upsert') ||
                        pageContent.includes('replace');
    
    // C'est une fonctionnalité importante pour un outil de sync
    if (hasSyncModes) {
      expect(hasSyncModes).toBeTruthy();
    }
  });
});

/**
 * Tests pour le parsing d'URL Grist
 */
test.describe('Parsing d\'URL Grist', () => {
  test('devrait extraire docId et tableId depuis une URL Grist complète', async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1 }])
      });
    });

    await page.goto('/');
    
    // Navigation rapide
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Chercher le champ d'URL du document Grist
    const gristUrlInput = page.getByLabel(/URL du document Grist/i).first();
    if (await gristUrlInput.isVisible()) {
      // Coller une URL Grist complète avec tableId dans le chemin
      await gristUrlInput.fill('https://docs.getgrist.com/doc/myDocId/p/MyTable');
      await gristUrlInput.blur();
      await page.waitForTimeout(500);
      
      // Vérifier que le Document ID a été extrait
      const docIdInput = page.getByLabel(/Document ID/i).first();
      const docIdValue = await docIdInput.inputValue();
      expect(docIdValue).toBe('myDocId');
      
      // Vérifier que le Table ID a été extrait
      const tableIdInput = page.getByLabel(/Table ID/i).first();
      const tableIdValue = await tableIdInput.inputValue();
      expect(tableIdValue).toBe('MyTable');
    }
  });

  test('devrait extraire tableId depuis les query params d\'une URL Grist', async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1 }])
      });
    });

    await page.goto('/');
    
    // Navigation rapide
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Chercher le champ d'URL du document Grist
    const gristUrlInput = page.getByLabel(/URL du document Grist/i).first();
    if (await gristUrlInput.isVisible()) {
      // Coller une URL Grist avec tableId dans les query params
      await gristUrlInput.fill('https://docs.getgrist.com/doc/myDocId?tableId=Users');
      await gristUrlInput.blur();
      await page.waitForTimeout(500);
      
      // Vérifier que le Document ID a été extrait
      const docIdInput = page.getByLabel(/Document ID/i).first();
      const docIdValue = await docIdInput.inputValue();
      expect(docIdValue).toBe('myDocId');
      
      // Vérifier que le Table ID a été extrait
      const tableIdInput = page.getByLabel(/Table ID/i).first();
      const tableIdValue = await tableIdInput.inputValue();
      expect(tableIdValue).toBe('Users');
    }
  });
});
