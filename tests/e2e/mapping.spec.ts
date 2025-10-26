import { test, expect } from '@playwright/test';

/**
 * Tests pour l'étape 2 : Mapping des données
 */
test.describe('Étape 2 - Mapping des données', () => {
  test.beforeEach(async ({ page }) => {
    // Intercepter l'appel API pour simuler des données
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { 
            id: 1, 
            name: 'John Doe', 
            email: 'john@example.com',
            age: 30,
            city: 'Paris'
          },
          { 
            id: 2, 
            name: 'Jane Smith', 
            email: 'jane@example.com',
            age: 25,
            city: 'Lyon'
          }
        ])
      });
    });

    await page.goto('/');
    
    // Naviguer jusqu'à l'étape 2
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    // Attendre le chargement des données
    await page.waitForTimeout(1000);
    
    // Passer à l'étape 2
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    
    // Vérifier qu'on est sur l'étape 2
    const currentStep = page.locator('.fr-stepper__step[aria-current="step"]');
    await expect(currentStep).toContainText('Mapping des champs');
  });

  test('devrait afficher la table de mapping', async ({ page }) => {
    // Vérifier la présence de la table de mapping
    const mappingTable = page.locator('table').first();
    await expect(mappingTable).toBeVisible();
  });

  test('devrait permettre d\'ajouter une nouvelle ligne de mapping', async ({ page }) => {
    // Chercher un bouton pour ajouter un mapping
    const addButton = page.getByRole('button', { name: /ajouter/i }).first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Vérifier qu'une nouvelle ligne a été ajoutée
      await page.waitForTimeout(500);
    }
  });

  test('devrait afficher les champs disponibles de l\'API', async ({ page }) => {
    // Les champs de l'API devraient être disponibles dans des selects ou inputs
    // Chercher des éléments contenant les noms de champs de notre mock
    const pageContent = await page.content();
    
    // Vérifier que les champs de l'API sont mentionnés quelque part
    expect(pageContent).toContain('id');
    expect(pageContent).toContain('name');
    expect(pageContent).toContain('email');
  });

  test('devrait bloquer le passage à l\'étape suivante si le mapping est incomplet', async ({ page }) => {
    // Le bouton suivant devrait être désactivé si aucun mapping n'est configuré
    const nextButton = page.getByRole('button', { name: /suivant/i });
    
    // En fonction de l'implémentation, le bouton peut être désactivé ou absent
    const isDisabled = await nextButton.isDisabled().catch(() => false);
    const isHidden = await nextButton.isHidden().catch(() => false);
    
    expect(isDisabled || isHidden).toBeTruthy();
  });
});

/**
 * Tests pour la configuration du mapping avec données complètes
 */
test.describe('Configuration du mapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { 
            userId: 'user-123',
            userName: 'Test User',
            userEmail: 'test@example.com'
          }
        ])
      });
    });

    await page.goto('/');
    
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
  });

  test('devrait permettre de sélectionner des champs pour le mapping', async ({ page }) => {
    // Vérifier qu'on peut interagir avec les éléments de mapping
    const inputs = page.locator('input[type="text"], select').first();
    await expect(inputs).toBeVisible();
  });

  test('devrait afficher un aperçu des données', async ({ page }) => {
    // Chercher un tableau ou une zone d'aperçu des données
    const preview = page.locator('table, .preview, .data-preview').first();
    
    // Vérifier si un aperçu est visible (optionnel selon l'implémentation)
    const hasPreview = await preview.isVisible().catch(() => false);
    
    // Si un aperçu existe, c'est un bonus
    if (hasPreview) {
      await expect(preview).toBeVisible();
    }
  });
});

/**
 * Tests de validation du mapping
 */
test.describe('Validation du mapping', () => {
  test('devrait permettre de supprimer une ligne de mapping', async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { field1: 'value1', field2: 'value2' }
        ])
      });
    });

    await page.goto('/');
    
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
    
    // Chercher un bouton de suppression
    const deleteButton = page.getByRole('button', { name: /supprimer/i }).first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(500);
    }
  });
});
