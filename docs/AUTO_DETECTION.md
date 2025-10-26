# Auto-détection de la Configuration Grist

## Vue d'ensemble

Le plugin grist-sync peut désormais détecter automatiquement la configuration Grist lorsqu'il est utilisé en tant que Custom Widget dans un document Grist. Cette fonctionnalité élimine le besoin de saisir manuellement l'URL et le token d'API.

## Fonctionnement

### Quand le plugin est utilisé comme Custom Widget Grist

Lorsque le plugin est intégré dans un document Grist en tant que Custom Widget, il :

1. **Détecte l'environnement Grist** : Vérifie la présence de l'objet global `grist` fourni par l'API Grist
2. **Extrait automatiquement** :
   - **Document ID** : À partir de l'URL du document (ex: `/doc/DOC_ID`)
   - **URL API Grist** : Depuis `window.location.origin`
   - **Token API** : Tente de récupérer le token d'accès via l'API Grist (si disponible)

3. **Pré-remplit les champs** : Les valeurs détectées sont automatiquement remplies dans le formulaire de configuration
4. **Permet la modification** : L'utilisateur peut toujours modifier manuellement les valeurs détectées

### Indicateurs visuels

Lorsque des valeurs sont auto-détectées :

- **Bannière de succès** : Une alerte verte s'affiche en haut du formulaire indiquant quels champs ont été auto-détectés
- **Badges** : Chaque champ auto-rempli affiche un badge "✓ Auto-détecté"
- **Message informatif** : "Configuration automatique détectée ! Le plugin a détecté qu'il fonctionne dans un environnement Grist..."

## Utilisation en tant que Custom Widget

### Étape 1 : Ajouter le plugin comme Custom Widget

1. Ouvrez votre document Grist
2. Cliquez sur le menu des widgets et sélectionnez "Custom Widget"
3. Entrez l'URL du plugin déployé : `https://votre-domaine.com/grist-sync-plugin`
4. Le plugin se chargera et détectera automatiquement la configuration

### Étape 2 : Vérifier la configuration

Le plugin affichera :
```
🎉 Configuration automatique détectée !

Le plugin a détecté qu'il fonctionne dans un environnement Grist et a 
automatiquement configuré les champs suivants : Document ID, URL API Grist, Token API.
```

### Étape 3 : Compléter la configuration

Seul le **Table ID** doit être saisi manuellement car il dépend de la table cible pour la synchronisation.

## Fonctionnement en mode standalone

Lorsque le plugin est utilisé en dehors de Grist (en accédant directement à l'URL) :

- L'auto-détection ne sera pas activée
- Tous les champs doivent être remplis manuellement
- Aucun message d'auto-détection n'apparaît

## API Technique

### Fonctions exportées (`src/utils/gristWidget.ts`)

#### `isRunningInGrist(): boolean`
Vérifie si le plugin s'exécute dans un environnement Grist.

```typescript
if (isRunningInGrist()) {
  console.log('Running as Grist Custom Widget');
}
```

#### `initializeGristWidget(): Promise<GristWidgetInfo>`
Initialise la connexion avec Grist et récupère les informations du document.

```typescript
const info = await initializeGristWidget();
console.log('Document ID:', info.docId);
console.log('API URL:', info.gristApiUrl);
```

#### `applyGristInfoToConfig(config, gristInfo): GristConfig`
Applique les informations détectées à la configuration.

```typescript
const updatedConfig = applyGristInfoToConfig(currentConfig, gristInfo);
```

### Interface `GristWidgetInfo`

```typescript
interface GristWidgetInfo {
  isInGrist: boolean;       // true si dans un environnement Grist
  docId?: string;           // ID du document Grist
  gristApiUrl?: string;     // URL de l'API Grist
  accessToken?: string;     // Token d'accès (si disponible)
}
```

## Sécurité

- Le token d'accès n'est récupéré que si disponible via l'API Grist
- Les tokens ne sont jamais stockés de manière permanente
- L'utilisateur peut toujours voir et modifier les valeurs détectées
- Les tokens sont masqués dans l'interface utilisateur (affichage partiel uniquement)

## Dépannage

### Le plugin ne détecte pas la configuration

**Causes possibles :**
- Le plugin n'est pas chargé en tant que Custom Widget dans Grist
- L'API Grist n'est pas disponible
- Le navigateur bloque l'accès à certaines APIs

**Solutions :**
1. Vérifiez que vous utilisez le plugin via la fonctionnalité Custom Widget de Grist
2. Vérifiez la console du navigateur pour les erreurs
3. Utilisez la saisie manuelle comme solution de secours

### Le token d'accès n'est pas détecté

Le token d'accès peut ne pas être disponible selon :
- La version de Grist utilisée
- Les paramètres de sécurité du document
- Les permissions de l'utilisateur

Dans ce cas, saisissez manuellement votre token API Grist.

## Tests

Des tests unitaires complets sont disponibles dans `src/utils/__tests__/gristWidget.test.ts` :

```bash
npm run test -- gristWidget
```

Les tests couvrent :
- Détection de l'environnement Grist
- Extraction des informations du document
- Gestion des erreurs
- Application de la configuration

## Références

- [Grist Custom Widgets Documentation](https://support.getgrist.com/widget-custom/)
- [Grist Plugin API](https://github.com/gristlabs/grist-plugin-api)
