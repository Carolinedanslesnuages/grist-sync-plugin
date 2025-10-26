# Formats d'URL Grist supportés

## Vue d'ensemble

Le plugin grist-sync supporte plusieurs formats d'URL Grist pour faciliter la configuration. Il peut automatiquement extraire le Document ID et le Table ID depuis l'URL fournie.

## Formats d'URL supportés

### 1. Format standard avec `/doc/`

**Format** : `https://{host}/doc/{docId}`

**Exemple** :
```
https://docs.getgrist.com/doc/abc123xyz
```

**Extraction** :
- Document ID : `abc123xyz`
- URL API : `https://docs.getgrist.com`
- Table ID : non spécifié

---

### 2. Format path-style avec `/d/`

**Format** : `https://{host}/d/{docId}`

**Exemple** :
```
https://docs.getgrist.com/d/abc123xyz
```

**Extraction** :
- Document ID : `abc123xyz`
- URL API : `https://docs.getgrist.com`
- Table ID : non spécifié

---

### 3. Format avec organisation

**Format** : `https://{host}/o/{org}/doc/{docId}`  
**Format alternatif** : `https://{host}/o/{org}/d/{docId}`

**Exemples** :
```
https://docs.getgrist.com/o/myorg/doc/myDocId
https://docs.getgrist.com/o/myorg/d/myDocId
```

**Extraction** :
- Document ID : `myDocId`
- URL API : `https://docs.getgrist.com`
- Table ID : non spécifié

---

### 4. Format avec Table ID (page)

**Format** : `https://{host}/doc/{docId}/p/{tableId}`  
**Format alternatif** : `https://{host}/d/{docId}/p/{tableId}`

**Exemples** :
```
https://docs.getgrist.com/doc/abc123/p/Users
https://docs.getgrist.com/d/abc123/p/5
```

**Extraction** :
- Document ID : `abc123`
- URL API : `https://docs.getgrist.com`
- Table ID : `Users` (ou `5` pour le deuxième exemple)

---

### 5. Format complet avec organisation et table

**Format** : `https://{host}/o/{org}/doc/{docId}/p/{tableId}`  
**Format alternatif** : `https://{host}/o/{org}/d/{docId}/p/{tableId}`

**Exemples** :
```
https://grist.example.com/o/myorg/doc/myDocId/p/Contacts
https://docs.getgrist.com/o/acme/d/sales2024/p/Customers
```

**Extraction** :
- Document ID : `myDocId` (ou `sales2024`)
- URL API : `https://grist.example.com` (ou `https://docs.getgrist.com`)
- Table ID : `Contacts` (ou `Customers`)

---

### 6. URLs locales et avec port

**Format** : `http://localhost:{port}/doc/{docId}/p/{tableId}`

**Exemple** :
```
http://localhost:8484/doc/testDoc/p/TestTable
```

**Extraction** :
- Document ID : `testDoc`
- URL API : `http://localhost:8484`
- Table ID : `TestTable`

---

## Utilisation dans le plugin

### Étape 2 : Configuration Grist

Dans l'interface du plugin, lors de l'étape 2 "Configuration Grist" :

1. **Collez l'URL complète** dans le champ "URL du document Grist"
2. Le plugin analyse automatiquement l'URL et remplit les champs :
   - Document ID
   - Table ID (si présent dans l'URL)
   - URL API Grist

3. **Vérifiez les valeurs extraites** et complétez manuellement si nécessaire

### Exemple d'utilisation

```
URL saisie : https://docs.getgrist.com/d/myDoc123/p/Employees

Champs remplis automatiquement :
✓ Document ID : myDoc123
✓ Table ID : Employees
✓ URL API Grist : https://docs.getgrist.com
```

## Stockage de l'URL

Le plugin stocke l'URL complète dans le champ `grist_url` de la configuration. Cela permet de :
- Conserver une trace de l'URL d'origine
- Faciliter le partage de configuration
- Permettre une reconstruction de l'URL si nécessaire

## Paramètres supplémentaires

Les URLs peuvent également contenir des paramètres de requête ou des fragments qui seront ignorés lors de l'extraction :

```
https://docs.getgrist.com/doc/abc123?param=value#section
→ Document ID : abc123
```

## Support des caractères spéciaux

Les Document IDs et Table IDs peuvent contenir :
- Lettres (a-z, A-Z)
- Chiffres (0-9)
- Tirets (-)
- Underscores (_)

**Exemples valides** :
- `my-doc-123`
- `doc_2024`
- `Table_Users`

## Résolution des problèmes

### L'URL n'est pas reconnue

**Solutions** :
1. Vérifiez que l'URL contient `http://` ou `https://`
2. Assurez-vous que le format correspond à l'un des formats supportés
3. Saisissez manuellement les IDs si l'analyse automatique échoue

### Le Table ID n'est pas détecté

**Causes possibles** :
- L'URL ne contient pas de segment `/p/{tableId}`
- Le format de l'URL n'est pas standard

**Solution** :
Saisissez manuellement le Table ID dans le champ dédié.

### Document ID extrait incorrectement

**Vérification** :
1. Consultez l'URL réelle de votre document Grist
2. Le Document ID se trouve généralement après `/doc/` ou `/d/`
3. Copiez-collez l'URL complète depuis la barre d'adresse de votre navigateur

## API pour les développeurs

### Interface ParsedGristUrl

```typescript
interface ParsedGristUrl {
  docId: string | null;
  gristApiUrl: string | null;
  tableId?: string | null;
}
```

### Fonction parseGristUrl

```typescript
import { parseGristUrl } from './utils/grist';

const result = parseGristUrl('https://docs.getgrist.com/d/abc123/p/Users');
console.log(result);
// {
//   docId: 'abc123',
//   gristApiUrl: 'https://docs.getgrist.com',
//   tableId: 'Users'
// }
```

### Tests

Des tests complets sont disponibles dans `src/utils/__tests__/grist.test.ts` :

```bash
npm run test -- grist.test
```

## Références

- [Documentation Grist](https://www.getgrist.com/docs/)
- [Grist Custom Widgets](https://support.getgrist.com/widget-custom/)
- [Guide d'auto-détection](./AUTO_DETECTION.md)
