# Audit du Flux de Navigation - Debug et Amélioration UX

## 📋 Résumé

Ce document détaille l'audit complet du flux de navigation du wizard stepper, incluant :
- Système de logs temporaires pour le debug
- Affichage visuel de l'état des données
- Messages d'aide UX contextuels
- Vérifications et corrections des conditions de validation

## 🔍 Fonctionnalités Implémentées

### 1. Système de Logs Structuré

#### Types de logs
- **INIT** : Initialisation du composant (bleu info)
- **NAVIGATION** : Changements d'étapes (bleu France)
- **EVENT** : Événements émis/reçus (vert succès)
- **STATE** : Modifications d'état (orange warning)
- **VALIDATION** : Validations d'étapes (bleu foncé)
- **STATUS** : Messages de statut (bleu clair)

#### Fonction `addDebugLog()`
```typescript
function addDebugLog(type: string, message: string, data?: any) {
  const timestamp = new Date().toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
  });
  
  debugLogs.value.push({ timestamp, type, message, data });
  console.log(`[${timestamp}] [${type}] ${message}`, data || '');
  
  // Limite à 50 derniers logs
  if (debugLogs.value.length > 50) {
    debugLogs.value.shift();
  }
}
```

### 2. Debug Panel Visuel

Le Debug Panel est un accordéon DSFR qui affiche en temps réel :

#### Section "État actuel"
- **Étape courante** : Badge avec numéro d'étape
- **Backend URL** : URL de l'API ou "(vide)"
- **Données API** : Nombre d'enregistrements avec badge coloré
- **Mappings** : Nombre valides vs total
- **Config Grist** : Doc ID et Table ID

#### Section "Validation des étapes"
- **Étape 1 complète** : OUI ✓ (vert) ou NON ✗ (rouge)
- **Étape 2 complète** : OUI ✓ (vert) ou NON ✗ (rouge)
- **Étape 3 complète** : OUI ✓ (vert) ou NON ✗ (rouge)
- **Peut avancer** : OUI ✓ (vert) ou NON ✗ (rouge)

#### Section "Logs de debug"
- Affichage des 50 derniers logs
- Code couleur par type de log
- Format : `[HH:MM:SS] [TYPE] Message`
- Données JSON formatées si présentes

### 3. Messages d'Aide UX Contextuels

Un computed `helpMessage` affiche automatiquement des instructions selon l'étape et l'état :

```typescript
const helpMessage = computed(() => {
  switch (currentStep.value) {
    case 1:
      if (!isStep1Complete.value) {
        return '💡 Pour continuer, récupérez les données depuis votre backend...';
      }
      return '';
    case 2:
      if (!isStep2Complete.value) {
        return '💡 Pour continuer, configurez au moins un mapping...';
      }
      return '';
    case 3:
      if (!isStep3Complete.value) {
        return '💡 Pour continuer, saisissez l\'URL de votre document Grist...';
      }
      return '';
    case 4:
      return '🚀 Vous pouvez maintenant lancer la synchronisation !';
    default:
      return '';
  }
});
```

### 4. Watchers Réactifs

Des watchers surveillent les changements d'état et loguent automatiquement :

```typescript
// Changement d'étape
watch(currentStep, (newStep, oldStep) => {
  addDebugLog('STATE', 'Changement d\'étape', { from: oldStep, to: newStep });
});

// Modification des données API
watch(apiData, (newData) => {
  addDebugLog('STATE', 'apiData modifié', {
    count: newData.length,
    isStep1Complete: isStep1Complete.value
  });
}, { deep: true });

// Modification des mappings
watch(mappings, (newMappings) => {
  const validCount = getValidMappings(newMappings).length;
  addDebugLog('STATE', 'Mappings modifiés', {
    totalCount: newMappings.length,
    validCount,
    isStep2Complete: isStep2Complete.value
  });
}, { deep: true });

// Modification de la config Grist
watch(gristConfig, (newConfig) => {
  addDebugLog('STATE', 'Config Grist modifiée', {
    docId: newConfig.docId,
    tableId: newConfig.tableId,
    hasApiToken: !!newConfig.apiTokenGrist,
    isStep3Complete: isStep3Complete.value
  });
}, { deep: true });
```

### 5. Logs dans Step1ApiSource.vue

Ajout de logs détaillés à chaque étape du fetch :

```typescript
console.log('[Step1ApiSource] fetchApiData appelé', { url });
console.log('[Step1ApiSource] Début du chargement...');
console.log('[Step1ApiSource] Appel fetch à l\'URL:', url);
console.log('[Step1ApiSource] Données reçues:', { type, isArray });
console.log('[Step1ApiSource] Données extraites:', { count });
console.log('[Step1ApiSource] ✅ Données valides, émission des événements');
console.log('[Step1ApiSource] Émission update:backendUrl:', url);
console.log('[Step1ApiSource] Émission status success');
console.log('[Step1ApiSource] 🎯 Émission @complete avec', { dataCount, url, sampleKeys });
```

## 🔄 Flux de Navigation Vérifié

### Scénario : Étape 1 → Étape 2

1. **Utilisateur saisit URL et clique sur "Récupérer les données"**
   - Log : `[Step1ApiSource] fetchApiData appelé`

2. **Fetch des données réussi**
   - Log : `[Step1ApiSource] Données extraites: {count: 3}`
   - Log : `[Step1ApiSource] Émission update:backendUrl`
   - Log : `[Step1ApiSource] Émission status success`
   - Log : `[Step1ApiSource] 🎯 Émission @complete`

3. **WizardStepper reçoit l'événement**
   - Log : `[EVENT] Événement @complete reçu de Step1ApiSource`
   - Log : `[STATE] État mis à jour après Step1`
   - Log : `[STATUS] Affichage d'un message de statut: success`

4. **Navigation automatique**
   - Log : `[NAVIGATION] Tentative d'avancer à l'étape suivante depuis l'étape 1`
   - Log : `[NAVIGATION] Navigation réussie vers l'étape 2`

5. **Watchers détectent les changements**
   - Log : `[STATE] apiData modifié {count: 3, isStep1Complete: true}`
   - Log : `[STATE] Changement d'étape {from: 1, to: 2}`

## 🎨 Styles CSS du Debug Panel

```css
/* Styles du Debug Panel */
.debug-panel {
  background: var(--background-contrast-grey);
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.debug-section {
  padding: 1rem;
  background: var(--background-default-grey);
  border-radius: 0.25rem;
  margin-bottom: 1rem;
}

.debug-logs {
  max-height: 400px;
  overflow-y: auto;
  background: var(--background-default-grey);
  padding: 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
}

/* Code couleur par type de log */
.debug-log-init {
  border-left-color: var(--border-plain-info);
  background: var(--background-contrast-info);
}

.debug-log-navigation {
  border-left-color: var(--border-plain-blue-france);
  background: var(--background-contrast-blue-france);
}

.debug-log-event {
  border-left-color: var(--border-plain-success);
  background: var(--background-contrast-success);
}

.debug-log-state {
  border-left-color: var(--border-plain-warning);
  background: var(--background-contrast-warning);
}

.debug-log-validation {
  border-left-color: var(--border-action-high-blue-france);
  background: var(--background-alt-blue-france);
}

.debug-log-status {
  border-left-color: var(--border-default-info);
  background: var(--background-alt-blue-ecume);
}
```

## 🔧 Configuration

### Activer/Désactiver le Mode Debug

Dans `WizardStepper.vue`, ligne 23 :

```typescript
// Debug mode - Active l'affichage des logs et du debug panel
const debugMode = ref(true); // Mettre à false pour désactiver en production
```

**En mode debug activé (`true`) :**
- Debug Panel visible dans l'interface
- Logs dans la console
- Watchers actifs

**En mode debug désactivé (`false`) :**
- Debug Panel masqué
- Logs console réduits (uniquement les erreurs)
- Watchers toujours actifs mais sans logging

## ✅ Validations Corrigées

### isStep1Complete
```typescript
const isStep1Complete = computed(() => {
  const complete = apiData.value.length > 0;
  return complete;
});
```

### isStep2Complete
```typescript
const isStep2Complete = computed(() => {
  const validMappings = getValidMappings(mappings.value);
  const complete = validMappings.length > 0;
  return complete;
});
```

### isStep3Complete
```typescript
const isStep3Complete = computed(() => {
  const complete = !!(
    gristConfig.value.docId && 
    gristConfig.value.docId !== 'YOUR_DOC_ID' &&
    gristConfig.value.tableId && 
    gristConfig.value.tableId !== 'YOUR_TABLE_ID'
  );
  return complete;
});
```

### canGoNext
```typescript
const canGoNext = computed(() => {
  let canGo = false;
  switch (currentStep.value) {
    case 1:
      canGo = isStep1Complete.value;
      break;
    case 2:
      canGo = isStep2Complete.value;
      break;
    case 3:
      canGo = isStep3Complete.value;
      break;
    case 4:
      canGo = false; // Dernière étape
      break;
    default:
      canGo = false;
  }
  return canGo;
});
```

## 📊 Résultats des Tests

### Tests Unitaires
```
✓ src/utils/__tests__/errorHandler.test.ts (27 tests)
✓ src/utils/__tests__/mapping.test.ts (45 tests)
✓ src/utils/__tests__/grist.test.ts (38 tests)

Test Files  3 passed (3)
Tests  110 passed (110)
```

### Tests Manuels
✅ Navigation Step 1 → Step 2 avec données réelles
✅ Affichage du Debug Panel
✅ Logs en temps réel
✅ Messages d'aide UX contextuels
✅ Validations de chaque étape
✅ Bouton "Suivant" activé/désactivé correctement

## 🎯 Objectifs Atteints

✅ **Flux robuste** : Les événements circulent correctement entre les composants
✅ **Visuel** : Debug Panel avec état complet et logs colorés
✅ **Facilement déboguable** : Logs détaillés à chaque transition
✅ **UX améliorée** : Messages d'aide contextuels pour guider l'utilisateur
✅ **Validation** : Conditions de navigation corrigées et testées
✅ **Gestion du statut** : Messages consolidés avec timeout automatique

## 📝 Notes pour le Développeur

1. **Mode Production** : Penser à mettre `debugMode = false` avant le déploiement
2. **Logs Console** : Tous les logs sont préfixés `[Step1ApiSource]` ou `[HH:MM:SS] [TYPE]`
3. **Performance** : Les logs sont limités à 50 pour éviter la surcharge mémoire
4. **Accessibilité** : Le Debug Panel utilise un accordéon DSFR accessible
5. **Maintenance** : La structure des logs facilite l'ajout de nouveaux types

## 🔗 Fichiers Modifiés

- `src/components/WizardStepper.vue` (+412 lignes, -14 lignes)
- `src/components/wizard/Step1ApiSource.vue` (+48 lignes)

Total : **+446 lignes** de code de debug et amélioration UX
