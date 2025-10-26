/**
 * Utilitaire pour parser les URLs Grist et extraire docId, docName et tableId
 * 
 * Ce module fournit une fonction pour analyser les URLs Grist au format:
 * http(s)://domain/docId/doc-name/p/tableId
 * 
 * Exemple: http://localhost:8484/tdBmr4kcvczT/Untitled-document/p/8
 * Résultat: { docId: 'tdBmr4kcvczT', docName: 'Untitled-document', tableId: 8 }
 */

/**
 * Interface pour le résultat du parsing d'URL Grist
 */
export interface ParsedGristUrl {
  docId: string;
  docName?: string;
  tableId: number;
}

/**
 * Parse une URL Grist pour extraire le docId, le nom du document (optionnel) et le tableId
 * 
 * Format supporté: http(s)://domain/docId/doc-name/p/tableId
 * - docId: identifiant du document Grist (ex: tdBmr4kcvczT)
 * - doc-name: nom du document (optionnel)
 * - tableId: identifiant numérique de la table (ex: 8 dans /p/8)
 * 
 * @param url - L'URL complète du document Grist
 * @returns Un objet contenant docId, docName (optionnel) et tableId, ou null si le parsing échoue
 * 
 * @example
 * parseGristUrl('http://localhost:8484/tdBmr4kcvczT/Untitled-document/p/8')
 * // { docId: 'tdBmr4kcvczT', docName: 'Untitled-document', tableId: 8 }
 * 
 * @example
 * parseGristUrl('https://docs.getgrist.com/abc123/MyDoc/p/5')
 * // { docId: 'abc123', docName: 'MyDoc', tableId: 5 }
 * 
 * @example
 * parseGristUrl('http://localhost:8484/xyz789/p/3')
 * // { docId: 'xyz789', tableId: 3 }
 */
export function parseGristUrl(url: string): ParsedGristUrl | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Pattern pour matcher: /docId/doc-name/p/tableId ou /docId/p/tableId
    // Le docId commence par / puis contient des caractères alphanumériques
    // Le doc-name est optionnel
    // Le tableId vient après /p/ et est un nombre
    
    // Supprime le slash initial
    const pathParts = pathname.split('/').filter(part => part.length > 0);
    
    if (pathParts.length < 3) {
      // Format minimum: docId, 'p', tableId
      return null;
    }
    
    // Trouve l'index de 'p' dans le chemin
    const pIndex = pathParts.indexOf('p');
    
    if (pIndex === -1 || pIndex === 0 || pIndex >= pathParts.length - 1) {
      // 'p' n'existe pas, est en première position, ou il n'y a pas de tableId après
      return null;
    }
    
    // Le docId est toujours le premier élément
    const docId = pathParts[0];
    
    if (!docId) {
      return null;
    }
    
    // Le tableId est l'élément après 'p'
    const tableIdStr = pathParts[pIndex + 1];
    
    if (!tableIdStr) {
      return null;
    }
    
    // Vérifie que tableIdStr est un nombre entier valide (pas de décimales, pas de caractères non numériques)
    if (!/^\d+$/.test(tableIdStr)) {
      return null;
    }
    
    const tableId = parseInt(tableIdStr, 10);
    
    if (isNaN(tableId)) {
      // tableId n'est pas un nombre valide
      return null;
    }
    
    // Le docName est optionnel - c'est tout ce qui est entre docId et 'p'
    let docName: string | undefined;
    if (pIndex > 1) {
      // Il y a des éléments entre docId et 'p'
      docName = pathParts.slice(1, pIndex).join('/');
    }
    
    return {
      docId,
      docName,
      tableId
    };
  } catch (error) {
    // URL invalide
    return null;
  }
}
