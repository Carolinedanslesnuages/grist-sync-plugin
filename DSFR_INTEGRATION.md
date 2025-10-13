# Intégration du Design System DSFR

## Vue d'ensemble

Ce plugin utilise le **DSFR (Système de Design de l'État Français)** pour garantir une interface moderne, accessible et conforme aux standards de l'État français.

## Installation et Configuration

### Dépendances
```json
{
  "@gouvfr/dsfr": "^1.14.2",
  "@gouvminint/vue-dsfr": "^8.8.0"
}
```

### Import dans main.ts
```typescript
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvminint/vue-dsfr/dist/vue-dsfr.css'
import VueDsfr from '@gouvminint/vue-dsfr'

createApp(App).use(VueDsfr).mount('#app')
```

## Composants DSFR Utilisés

### Boutons (DsfrButton)
Tous les boutons de l'application utilisent le composant `DsfrButton` avec les variantes DSFR :
- **Primary**: Actions principales (ex: "Récupérer les données", "Continuer")
- **Secondary**: Actions secondaires (ex: "Retour")
- **Tertiary**: Actions tertiaires ou destructives (ex: suppression)
- **Icon-only**: Boutons avec icône uniquement (ex: supprimer une ligne)

```vue
<DsfrButton
  label="Récupérer les données"
  icon="ri-download-cloud-line"
  :loading="isLoading"
  @click="fetchData"
/>
```

### Formulaires (DsfrInput, DsfrInputGroup)
Tous les champs de formulaire utilisent les composants DSFR :
- Labels clairs et descriptifs
- Hints pour guider l'utilisateur
- Validation intégrée
- Support de l'attribut `disabled`

```vue
<DsfrInput
  label="URL du backend *"
  v-model="backendUrl"
  type="url"
  hint="L'URL du backend qui fournit les données"
  placeholder="https://backend.example.com/api/data"
/>
```

### Messages et Notifications
- **DsfrAlert**: Messages de succès, erreur, info ou warning
- **DsfrNotice**: Notices informatives
- **DsfrCallout**: Conseils et astuces mis en évidence

### Accordéons (DsfrAccordion)
Les accordéons permettent d'afficher/masquer du contenu de manière interactive :
- **DsfrAccordion**: Affichage/masquage de contenu (ex: exemples d'URLs, détails techniques)

```vue
<DsfrAccordion
  title="Exemples d'URLs"
  id="examples-accordion"
>
  <ul class="fr-text--sm">
    <li><code class="fr-code">https://api.example.com/data</code> - Exemple</li>
  </ul>
</DsfrAccordion>
```

### Badges et Indicateurs
- **DsfrBadge**: Compteurs et statuts (ex: "5 / 10 activé(s)")

### Tables
Les tables utilisent les classes DSFR natives :
- `.fr-table`: Container de table
- `.fr-table--bordered`: Bordures sur les cellules
- `.fr-table--responsive`: Support responsive

### Code et Blocs de Code
Les extraits de code utilisent la classe DSFR native :
- `.fr-code`: Classe pour les éléments `<code>` inline ou en bloc

```vue
<!-- Code inline -->
<code class="fr-code">https://api.example.com/data</code>

<!-- Bloc de code -->
<pre class="fr-code">{{ technicalDetails }}</pre>
```

## Design Tokens DSFR

### Couleurs
Toutes les couleurs personnalisées ont été remplacées par les variables CSS DSFR :

#### Actions et États
```css
--background-action-high-blue-france: Bleu France (#000091)
--background-flat-success: Vert succès (#18753c)
--text-action-high-blue-france: Texte d'action
--text-default-success: Texte de succès
```

#### Neutrales et Backgrounds
```css
--background-default-grey: Fond par défaut
--background-default-grey-hover: Fond au survol
--background-contrast-grey: Fond de contraste
--background-disabled-grey: Fond désactivé
```

#### Bordures et Séparateurs
```css
--border-action-high-blue-france: Bordure action
--border-plain-success: Bordure succès
--border-plain-blue-france: Bordure focus
```

### Espacement (Spacing)
L'espacement utilise l'échelle DSFR basée sur rem :
- Base: 1rem = 16px
- Classes utilitaires: `.fr-mt-2w`, `.fr-mb-4w`, `.fr-py-6w`
- Unités personnalisées: multiples de 0.25rem, 0.5rem, 1rem, etc.

### Typographie
- **Font family**: Marianne (police officielle DSFR)
- **Font weights**: 400 (Regular), 500 (Medium), 700 (Bold)
- **Classes**: `.fr-h1` à `.fr-h6`, `.fr-text`, `.fr-text--sm`, `.fr-text--lead`

### Ombres (Shadows)
```css
--raised-shadow: Ombre pour les cartes et éléments surélevés
```

### Breakpoints
Utilisation des breakpoints DSFR pour le responsive :
- **Mobile**: < 48rem (768px)
- **Tablet**: 48rem - 62rem (768px - 992px)
- **Desktop**: > 62rem (992px)

## Accessibilité RGAA

### Conformité WCAG
L'application respecte les critères d'accessibilité WCAG 2.1 niveau AA :
- Contrastes de couleur suffisants (ratio 4.5:1 minimum)
- Tailles de texte adaptées
- Navigation au clavier complète
- Indicateurs de focus visibles

### ARIA et Sémantique
- Attributs `aria-label` sur tous les éléments interactifs
- `role` appropriés (ex: `role="navigation"` pour le stepper)
- Attributs `scope` sur les en-têtes de tableau
- Titles descriptifs sur les boutons icon-only

### Focus Management
Tous les éléments interactifs ont un indicateur de focus visible :
```css
*:focus-visible {
  outline: 2px solid var(--border-plain-blue-france);
  outline-offset: 2px;
}
```

### Navigation au Clavier
- Tab : Navigation entre les éléments
- Enter/Space : Activation des boutons et liens
- Ordre de tabulation logique respecté
- Pas de piège au clavier

## Migration depuis les Styles Personnalisés

### Avant (Styles personnalisés)
```css
.btn-add {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
```

### Après (Composant DSFR)
```vue
<DsfrButton
  label="Ajouter une ligne"
  icon="ri-add-line"
  @click="addMapping"
/>
```

### Avantages
✅ Cohérence visuelle avec les services de l'État  
✅ Accessibilité RGAA intégrée  
✅ Maintenance simplifiée (mises à jour centralisées)  
✅ Responsive design automatique  
✅ Thématisation facile  
✅ Documentation officielle complète  

## Personnalisation

### Variables CSS Custom
Si nécessaire, vous pouvez surcharger les variables DSFR :
```css
:root {
  /* Personnalisation respectant le DSFR */
  --custom-spacing: 1.5rem;
}
```

### Recommandations
- Toujours utiliser les composants DSFR en priorité
- N'utiliser des styles personnalisés que si aucun composant DSFR n'existe
- Respecter les design tokens DSFR pour les couleurs et espacements
- Tester l'accessibilité de toute personnalisation

## Ressources

- [Documentation officielle DSFR](https://www.systeme-de-design.gouv.fr/)
- [VueDSFR - Composants Vue.js](https://vue-dsfr.netlify.app/)
- [Guide d'accessibilité RGAA](https://accessibilite.numerique.gouv.fr/)
- [Référentiel WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

## Maintenance

### Mises à jour DSFR
Pour mettre à jour le DSFR :
```bash
npm update @gouvfr/dsfr @gouvminint/vue-dsfr
```

### Tests de Non-régression
Après toute mise à jour :
1. Vérifier la build : `npm run build`
2. Lancer les tests : `npm run test`
3. Tester visuellement tous les composants
4. Valider l'accessibilité (contraste, focus, navigation clavier)

## Contact et Support

Pour toute question sur l'utilisation du DSFR dans ce projet :
- Issues GitHub du projet
- Documentation VueDSFR
- Communauté DSFR
