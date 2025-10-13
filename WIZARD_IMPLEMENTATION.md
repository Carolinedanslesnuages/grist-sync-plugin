# Multi-Step Wizard Implementation

## Overview
This document describes the implementation of the 4-step wizard interface for the Grist Data Syncer plugin.

## Architecture

### Component Structure
```
src/
├── App.vue (modified - now uses WizardStepper)
├── components/
    ├── WizardStepper.vue (new - main orchestration)
    ├── MappingTable.vue (existing - reused)
    └── wizard/
        ├── Step1ApiSource.vue (new)
        ├── Step2DataMapping.vue (new)
        ├── Step3GristConfig.vue (new)
        └── Step4Sync.vue (new)
```

### State Management
The WizardStepper component manages the global state:
- `currentStep`: Current step number (1-4)
- `backendUrl`: URL of the backend API
- `apiData`: Fetched API data
- `sampleRecord`: First record for preview
- `mappings`: Field mapping configuration
- `gristConfig`: Grist connection settings
- `isLoading`: Global loading state
- `statusMessage`/`statusType`: Global feedback messages

### Step Flow
1. **Step 1 - API Source**: Fetch data from backend URL
   - Input: Backend URL
   - Output: apiData[], sampleRecord
   - Validation: Must have data to proceed

2. **Step 2 - Data Mapping**: Configure field mappings
   - Input: apiData, sampleRecord
   - Output: mappings[]
   - Validation: At least one valid mapping required

3. **Step 3 - Grist Config**: Configure Grist connection
   - Input: None
   - Output: gristConfig
   - Validation: docId and tableId required (connection test optional)

4. **Step 4 - Synchronization**: Execute sync and show logs
   - Input: apiData, mappings, gristConfig
   - Output: Sync logs
   - Actions: Launch sync, retry, restart

### Key Features

#### Navigation
- Forward/Backward navigation with validation
- Clickable stepper to return to completed steps
- Visual indicators for completed steps (checkmarks)

#### Transitions
- Smooth fade animations between steps
- CSS transitions with `fade-enter/leave-active` classes

#### User Feedback
- Loading spinners during async operations
- Success/error/info messages with DsfrAlert
- Real-time logs in Step 4 with color coding
- Validation badges showing progress

#### Responsive Design
- Mobile-friendly layout
- Adaptive font sizes and spacing
- Collapsible sections on smaller screens

## Design System & Accessibility

### DSFR Components Used
The application fully adheres to the **DSFR (Système de Design de l'État Français)** for consistency, accessibility, and compliance with French government standards.

#### Core Components
- **DsfrButton**: All action buttons with variants (primary, secondary, tertiary)
- **DsfrInput/DsfrInputGroup**: Form inputs with validation and hints
- **DsfrFieldset**: Form sections with legends
- **DsfrAlert**: Status messages (success, error, info, warning)
- **DsfrNotice**: Informational notices
- **DsfrCallout**: Highlighted tips and recommendations
- **DsfrBadge**: Status indicators and counters

#### DSFR Design Tokens
All custom styles use DSFR CSS variables for consistency:
- **Colors**: `--background-action-high-blue-france`, `--text-title-grey`, `--border-plain-success`
- **Spacing**: Using rem-based spacing (1rem = 16px) following DSFR scale
- **Typography**: Marianne font family with DSFR font scales
- **Shadows**: `--raised-shadow` for elevated cards
- **Breakpoints**: 48rem (768px) for mobile-first responsive design

### Accessibility (RGAA Compliance)

#### ARIA Labels and Roles
- Stepper navigation uses `role="navigation"` and `aria-label="Étapes"`
- Form inputs have proper `aria-label` attributes
- Icon-only buttons include descriptive `title` attributes
- Tables use proper `scope` attributes on headers

#### Keyboard Navigation
- All interactive elements are keyboard accessible
- `focus-visible` outlines with DSFR colors (2px solid blue)
- Tab order follows logical flow through the wizard
- Stepper steps can be clicked to navigate back

#### Color Contrast
- All text meets WCAG AA standards (minimum 4.5:1 ratio)
- Interactive elements have sufficient contrast in all states
- Focus indicators are clearly visible (2px blue outline)

#### Responsive Design
- Mobile-first approach with DSFR breakpoint at 48rem
- Touch targets meet minimum size requirements (44x44px)
- Content reflows properly on small screens
- Font sizes adapt for readability

### Color Palette
Following DSFR official colors:
- **Primary Action**: Bleu France (#000091)
- **Success**: Green (#18753c)
- **Error**: Red (DSFR error variant)
- **Info**: Blue info variant
- **Neutral**: Grey scale variants

### Typography Scale
- Headings: `.fr-h1` to `.fr-h6` classes
- Body text: `.fr-text` with size variants (--sm, --lg, --lead)
- Code/monospace: For technical details and logs

## Future Enhancements
- Add ability to save/load wizard state
- Support for bulk operations
- Advanced mapping features (transformations)
- Schedule periodic syncs
- Export/import configurations
