# Architecture de la Solution de Synchronisation Bi-directionnelle

## Diagramme de Flux

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          API CENTRALE                                    │
│                       (Source de vérité)                                 │
│                                                                           │
│  • Système RH, ERP, CRM, etc.                                           │
│  • Base de données centralisée                                          │
│  • API REST authentifiée                                                │
└──────────────┬───────────────────────────────────────┬──────────────────┘
               │                                       │
               │ ① FLUX ENTRANT                       │ ② FLUX SORTANT
               │ (Ingestion)                           │ (Export)
               │ Quotidien / Batch                     │ Manuel / On-demand
               │                                       │
               ▼                                       ▼
┌──────────────────────────────┐         ┌────────────────────────────────┐
│   Script Python              │         │   Webhook Intermédiaire        │
│   daily_sync.py              │         │   (n8n / Pipedream)            │
│                              │         │                                │
│ • Récupère données API       │         │ • Reçoit données du widget     │
│ • Filtre par bureau          │         │ • Contourne problèmes CORS     │
│ • Upsert vers chaque doc     │         │ • Authentifie vers API         │
│ • Génère rapports            │         │ • Transforme si nécessaire     │
│                              │         │ • Renvoie statut au widget     │
│ Planification: Cron/n8n      │         │                                │
└───────────┬──────────────────┘         └────────────▲───────────────────┘
            │                                         │
            │ Répartition                            │ POST JSON
            │ multi-documents                        │
            ▼                                         │
┌───────────────────────────────────────────────────┼─────────────────────┐
│                   DOCUMENTS GRIST                  │                     │
│                   (Multi-Tenants)                  │                     │
│                                                    │                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────┴──────────┐         │
│  │   Paris        │  │   Lyon         │  │   Marseille       │         │
│  │   DOC_PARIS    │  │   DOC_LYON     │  │   DOC_MARSEILLE   │         │
│  │                │  │                │  │                   │         │
│  │ [Table]        │  │ [Table]        │  │ [Table]           │         │
│  │  - id          │  │  - id          │  │  - id             │         │
│  │  - nom         │  │  - nom         │  │  - nom            │         │
│  │  - Origine... ─┼──┼────────────────┼──┘  - Origine_Bureau │         │
│  │                │  │                │  │                   │         │
│  │ [Widget] ───────┼──┼────────────────┘                     │         │
│  └────────────────┘  └────────────────┘  └───────────────────┘         │
│                                                                          │
│  Widget unique : /widget/export-widget.html                             │
│  Hébergé centralement, utilisé par tous les documents                   │
└──────────────────────────────────────────────────────────────────────────┘
```

## Détail du Flux Entrant (API → Grist)

```
1. API Source
   │
   │ GET /api/data
   │ Authorization: Bearer API_KEY
   │
   ▼
2. Script Python (daily_sync.py)
   │
   │ Récupération de TOUTES les données
   │
   ├─→ Filtrage pour Paris
   │   │ WHERE bureau = "Paris"
   │   │
   │   ▼
   │   PUT /api/docs/DOC_PARIS/tables/Table1/records
   │   Authorization: Bearer GRIST_API_KEY
   │   Body: { "records": [...] }
   │   Params: { "onMany": "first", "allow": "all" }
   │
   ├─→ Filtrage pour Lyon
   │   │ WHERE bureau = "Lyon"
   │   │
   │   ▼
   │   PUT /api/docs/DOC_LYON/tables/Table1/records
   │   (Upsert)
   │
   └─→ Filtrage pour Marseille
       │ WHERE bureau = "Marseille"
       │
       ▼
       PUT /api/docs/DOC_MARSEILLE/tables/Table1/records
       (Upsert)
```

## Détail du Flux Sortant (Grist → API)

```
1. Utilisateur dans Grist (ex: Document Lyon)
   │
   │ Sélectionne une ligne
   │
   ▼
2. Custom Widget (export-widget.html)
   │
   │ Lecture automatique de record.Origine_Bureau
   │ → Détection: "Lyon"
   │
   │ Utilisateur clique "Exporter"
   │
   │ POST https://webhook.n8n.cloud/webhook/...
   │ Body: {
   │   "bureau": "Lyon",
   │   "record": { "id": 123, "nom": "Dupont", ... },
   │   "timestamp": "2024-01-21T15:30:00.000Z",
   │   "source": "grist-widget"
   │ }
   │
   ▼
3. Webhook n8n/Pipedream
   │
   │ Validation: bureau présent ?
   │ Transformation si nécessaire
   │
   │ POST https://api-centrale.example.com/import
   │ Authorization: Bearer API_KEY (sécurisé)
   │ Body: {
   │   "bureau": "Lyon",
   │   "data": { ... }
   │ }
   │
   ▼
4. API Centrale
   │
   │ Traitement et stockage
   │
   └─→ Réponse 200 OK
       │
       └─→ Widget affiche "✓ Export réussi"
```

## Configuration de la Colonne "Origine_Bureau"

### Option 1 : Valeur fixe par document

```python
# Dans Grist, formule par défaut de la colonne Origine_Bureau
# Pour le document Paris :
"Paris"

# Pour le document Lyon :
"Lyon"

# Pour le document Marseille :
"Marseille"
```

### Option 2 : Calculée depuis un autre champ

```python
# Si vous avez un champ code_postal
if $code_postal[:2] == "75":
  return "Paris"
elif $code_postal[:2] == "69":
  return "Lyon"
elif $code_postal[:2] == "13":
  return "Marseille"
else:
  return "Autre"
```

### Option 3 : Depuis un champ existant

```python
# Si vous avez déjà un champ 'site' ou 'localisation'
$site

# Ou avec transformation
$localisation.upper()
```

## Sécurité et Bonnes Pratiques

### ✅ Ce qui EST sécurisé

```
┌──────────────────┐
│  Widget (Client) │  ← PAS de clé API
│  JavaScript      │  ← Tourne dans le navigateur
└────────┬─────────┘
         │
         │ HTTPS uniquement
         │ Pas de secrets
         │
         ▼
┌──────────────────┐
│  Webhook n8n     │  ← Contient les clés API
│  (Serveur)       │  ← Authentifie vers l'API
└────────┬─────────┘
         │
         │ Authorization: Bearer API_KEY
         │
         ▼
┌──────────────────┐
│  API Centrale    │
└──────────────────┘
```

### ❌ Ce qui NE DOIT PAS être fait

```
┌──────────────────┐
│  Widget (Client) │
│  const API_KEY = │  ← ❌ DANGER! Clé exposée
│  "secret123"     │  ← Visible dans le code source
└────────┬─────────┘
         │
         │ ❌ Appel direct avec clé API
         │
         ▼
┌──────────────────┐
│  API Centrale    │  ← ❌ Problème CORS
└──────────────────┘
```

## Schéma de Configuration

```
Repository
│
├── scripts/
│   ├── daily_sync.py          ← Script Python
│   ├── config.json            ← ⚠️ NE PAS COMMITTER (secrets)
│   ├── config.example.json    ← Template sans secrets
│   ├── requirements.txt       ← Dépendances Python
│   ├── test_daily_sync.py     ← Tests unitaires
│   └── README.md              ← Documentation du script
│
├── public/widget/
│   ├── export-widget.html     ← Widget unique
│   ├── README.md              ← Documentation du widget
│   └── TESTING.md             ← Guide de test
│
├── docs/
│   ├── BIDIRECTIONAL_SYNC.md  ← Documentation principale
│   └── n8n-workflow.json      ← Template workflow n8n
│
└── README.md                   ← Vue d'ensemble
```

## Exemple de Déploiement

```
Production

Serveur Cron (ou n8n)
│
├── daily_sync.py s'exécute à 2h du matin
│   └── Synchronise tous les documents Grist
│
Serveur Web (Nginx/Apache/Vite)
│
├── /widget/export-widget.html
│   └── Accessible publiquement via HTTPS
│
n8n Cloud (ou auto-hébergé)
│
└── Webhook /grist-export
    └── Route vers API centrale
```

## Flux de Données Complet

```
Jour J à 2h00 : Synchronisation quotidienne
────────────────────────────────────────────
API Centrale → Script Python → Grist Paris
                             → Grist Lyon
                             → Grist Marseille

Jour J à 10h30 : Export manuel depuis Lyon
────────────────────────────────────────────
Grist Lyon → Widget → Webhook n8n → API Centrale
             (lit "Lyon")

Jour J+1 à 2h00 : Synchronisation quotidienne
────────────────────────────────────────────
API Centrale → Script Python → Grist Paris (avec données de Lyon)
                             → Grist Lyon
                             → Grist Marseille
```

Ce diagramme illustre le cycle complet de synchronisation bi-directionnelle.
