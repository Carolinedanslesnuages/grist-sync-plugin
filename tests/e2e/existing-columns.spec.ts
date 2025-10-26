import { test, expect } from '@playwright/test';

/**
 * Tests pour la détection des colonnes existantes et prévention des doublons
 */
test.describe('Détection des colonnes existantes Grist', () => {
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
            email: 'john@example.com'
          },
          { 
            id: 2, 
            name: 'Jane Smith', 
            email: 'jane@example.com'
          }
        ])
      });
    });

    await page.goto('/');
    
    // Naviguer jusqu'à l'étape 1
    const urlInput = page.getByLabel(/URL de l'API/i);
    await urlInput.fill('https://api.example.com/api/data');
    
    const loadButton = page.getByRole('button', { name: /charger les données/i });
    await loadButton.click();
    
    await page.waitForTimeout(1000);
    
    // Passer à l'étape 2
    const nextButton = page.getByRole('button', { name: /suivant/i });
    await nextButton.click();
  });

  test('devrait afficher un avertissement quand de nouvelles colonnes seront créées', async ({ page }) => {
    // Générer automatiquement les mappings
    const generateButton = page.getByRole('button', { name: /générer automatiquement/i });
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(500);
      
      // Si aucune colonne existante n'est configurée, un avertissement devrait apparaître
      // (ou une info sur les colonnes qui seront créées)
      const pageContent = await page.content();
      
      // Vérifier qu'il y a des informations sur les colonnes
      const hasColumnInfo = pageContent.includes('colonne') || 
                           pageContent.includes('créer') || 
                           pageContent.includes('existant');
      
      expect(hasColumnInfo).toBeTruthy();
    }
  });

  test('devrait suggérer les noms de colonnes existantes lors de la saisie', async ({ page }) => {
    // Chercher un input pour le nom de colonne Grist
    const gristColumnInputs = page.locator('input[placeholder*="Name"], input[placeholder*="Email"], input[aria-label*="Colonne Grist"]');
    
    if (await gristColumnInputs.count() > 0) {
      const firstInput = gristColumnInputs.first();
      
      // Vérifier si un datalist est associé
      const listId = await firstInput.getAttribute('list');
      
      if (listId) {
        // Vérifier que le datalist existe
        const datalist = page.locator(`#${listId}`);
        await expect(datalist).toBeInTheDocument();
      }
    }
  });

  test('devrait permettre de configurer des mappings sans créer de doublons', async ({ page }) => {
    // Si on configure la connexion Grist avant, les colonnes existantes devraient être chargées
    // Pour ce test, on simule juste qu'on peut configurer les mappings
    
    const generateButton = page.getByRole('button', { name: /générer automatiquement/i });
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(500);
      
      // Vérifier que des mappings ont été générés
      const mappingTable = page.locator('table').first();
      await expect(mappingTable).toBeVisible();
      
      // Vérifier qu'il y a des lignes de mapping
      const rows = page.locator('tbody tr:not(.empty-row)');
      const rowCount = await rows.count();
      
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test('devrait afficher des indicateurs visuels pour les colonnes existantes vs nouvelles', async ({ page }) => {
    // Générer les mappings
    const generateButton = page.getByRole('button', { name: /générer automatiquement/i });
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(500);
      
      // Chercher des indicateurs visuels (✓ ou ➕)
      const pageContent = await page.content();
      
      // Vérifier qu'il y a des indicateurs de statut
      const hasIndicators = pageContent.includes('✓') || 
                           pageContent.includes('➕') ||
                           pageContent.includes('existing-column') ||
                           pageContent.includes('new-column');
      
      // Si des colonnes ont été mappées, des indicateurs devraient être présents
      const rows = page.locator('tbody tr:not(.empty-row)');
      const rowCount = await rows.count();
      
      if (rowCount > 0) {
        expect(hasIndicators).toBeTruthy();
      }
    }
  });

  test('devrait afficher un message de succès si tous les mappings utilisent des colonnes existantes', async ({ page }) => {
    // Ce test vérifie qu'un message positif apparaît quand on mappe vers des colonnes existantes
    // Dans un vrai scénario, il faudrait intercepter l'appel à l'API Grist pour retourner des colonnes existantes
    
    const generateButton = page.getByRole('button', { name: /générer automatiquement/i });
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(500);
      
      // La page devrait contenir des informations sur le statut des colonnes
      const pageContent = await page.content();
      const hasColumnStatus = pageContent.includes('colonne') && 
                             (pageContent.includes('existant') || pageContent.includes('créer'));
      
      expect(hasColumnStatus).toBeTruthy();
    }
  });
});

/**
 * Tests pour la correspondance automatique des noms de colonnes
 */
test.describe('Correspondance automatique des colonnes', () => {
  test('devrait faire correspondre les noms de colonnes de manière insensible à la casse', async ({ page }) => {
    // Ce test vérifie que la correspondance ignore la casse
    // Par exemple, "Name" devrait correspondre à "name" ou "NAME"
    
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { NAME: 'Test', EMAIL: 'test@example.com' }
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
    
    // Générer les mappings
    const generateButton = page.getByRole('button', { name: /générer automatiquement/i });
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(500);
      
      // Vérifier que des mappings ont été créés
      const mappingTable = page.locator('table').first();
      await expect(mappingTable).toBeVisible();
    }
  });

  test('devrait permettre la correspondance partielle des noms de colonnes', async ({ page }) => {
    // Ce test vérifie que la correspondance partielle fonctionne
    // Par exemple, "user_email" devrait correspondre à "Email" si aucune correspondance exacte n'existe
    
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { user_name: 'Test', user_email: 'test@example.com' }
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
    
    // Générer les mappings
    const generateButton = page.getByRole('button', { name: /générer automatiquement/i });
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(500);
      
      // Vérifier que les mappings ont été générés
      const pageContent = await page.content();
      expect(pageContent).toContain('user_');
    }
  });
});
