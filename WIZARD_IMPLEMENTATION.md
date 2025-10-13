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

## Design System
Uses DSFR (French Government Design System):
- DsfrButton
- DsfrInput/DsfrInputGroup
- DsfrFieldset
- DsfrAlert
- DsfrNotice
- DsfrCallout
- DsfrBadge

## Future Enhancements
- Add ability to save/load wizard state
- Support for bulk operations
- Advanced mapping features (transformations)
- Schedule periodic syncs
- Export/import configurations
