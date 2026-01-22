/**
 * Utilitaire pour gérer et diagnostiquer les erreurs réseau et API
 * 
 * Ce module fournit des fonctions pour détecter et expliquer les erreurs
 * de connexion, d'autorisation, CORS, et autres problèmes API/réseau.
 */

/**
 * Type d'erreur détecté
 */
export type ErrorType = 
  | 'cors'
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'unprocessable'
  | 'server_error'
  | 'timeout'
  | 'invalid_json'
  | 'unknown';

/**
 * Information détaillée sur une erreur
 */
export interface ErrorInfo {
  type: ErrorType;
  title: string;
  message: string;
  explanation: string;
  solutions: string[];
  technicalDetails?: string;
}

/**
 * Détecte et analyse une erreur pour fournir des informations détaillées
 * 
 * @param error - L'erreur à analyser
 * @param context - Contexte additionnel (ex: 'api_fetch', 'grist_sync')
 * @returns Information détaillée sur l'erreur
 */
export function analyzeError(error: any, context: string = 'general'): ErrorInfo {
  // Erreur CORS
  if (isCorsError(error)) {
    return {
      type: 'cors',
      title: 'Erreur CORS (Cross-Origin Resource Sharing)',
      message: 'La requête a été bloquée par la politique CORS du navigateur',
      explanation: context === 'api_fetch' 
        ? 'Votre backend n\'autorise pas les requêtes depuis ce domaine. Les navigateurs bloquent les requêtes cross-origin pour des raisons de sécurité.'
        : 'L\'API Grist ou votre backend n\'autorise pas les requêtes depuis ce domaine.',
      solutions: [
        '✓ Configurez votre backend pour autoriser les requêtes CORS depuis ce domaine',
        '✓ Ajoutez les headers CORS appropriés : Access-Control-Allow-Origin',
        '✓ Pour le développement local, utilisez un proxy ou configurez votre serveur',
        '⚠️ Évitez d\'utiliser des extensions pour désactiver CORS en production'
      ],
      technicalDetails: error.message || 'CORS policy violation'
    };
  }

  // Erreur réseau (offline, DNS, etc.)
  if (isNetworkError(error)) {
    return {
      type: 'network',
      title: 'Erreur de connexion réseau',
      message: 'Impossible de se connecter au serveur',
      explanation: 'Le serveur est injoignable. Cela peut être dû à une connexion internet interrompue, une URL incorrecte, ou un serveur hors ligne.',
      solutions: [
        '✓ Vérifiez votre connexion internet',
        '✓ Vérifiez que l\'URL est correcte et accessible',
        '✓ Vérifiez que le serveur est en ligne',
        '✓ Vérifiez qu\'il n\'y a pas de pare-feu bloquant la connexion'
      ],
      technicalDetails: error.message || 'Network request failed'
    };
  }

  // Erreur HTTP avec status code
  if (error.message && error.message.includes('HTTP')) {
    const statusMatch = error.message.match(/HTTP (\d+)/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      return analyzeHttpError(status, error, context);
    }
  }

  // Erreur de parsing JSON
  if (error.message && (error.message.includes('JSON') || error.message.includes('parse'))) {
    return {
      type: 'invalid_json',
      title: 'Erreur de format de données',
      message: 'La réponse du serveur n\'est pas au format JSON valide',
      explanation: 'Le serveur a renvoyé des données qui ne peuvent pas être interprétées comme du JSON.',
      solutions: [
        '✓ Vérifiez que l\'URL pointe vers une API JSON',
        '✓ Vérifiez que le serveur renvoie bien du JSON et non du HTML ou du texte',
        '✓ Consultez la console du navigateur (F12) pour voir la réponse brute'
      ],
      technicalDetails: error.message
    };
  }

  // Erreur de timeout
  if (error.message && error.message.toLowerCase().includes('timeout')) {
    return {
      type: 'timeout',
      title: 'Délai d\'attente dépassé',
      message: 'Le serveur met trop de temps à répondre',
      explanation: 'La requête a pris trop de temps et a été annulée.',
      solutions: [
        '✓ Vérifiez que le serveur fonctionne correctement',
        '✓ Réessayez plus tard',
        '✓ Vérifiez qu\'il n\'y a pas de problème de performance côté serveur'
      ],
      technicalDetails: error.message
    };
  }

  // Erreur inconnue
  return {
    type: 'unknown',
    title: 'Erreur inattendue',
    message: error.message || 'Une erreur inconnue s\'est produite',
    explanation: 'Une erreur imprévue s\'est produite. Consultez les détails techniques ci-dessous.',
    solutions: [
      '✓ Vérifiez la console du navigateur (F12) pour plus de détails',
      '✓ Réessayez l\'opération',
      '✓ Contactez le support si le problème persiste'
    ],
    technicalDetails: error.stack || error.toString()
  };
}

/**
 * Analyse une erreur HTTP en fonction du status code
 */
function analyzeHttpError(status: number, error: any, context: string): ErrorInfo {
  switch (status) {
    case 401:
      return {
        type: 'unauthorized',
        title: '401 - Non autorisé',
        message: 'Authentification requise ou token invalide',
        explanation: context === 'grist_sync'
          ? 'Le document Grist est privé et nécessite un token API, ou votre token est invalide.'
          : 'L\'API nécessite une authentification que votre backend doit gérer.',
        solutions: [
          context === 'grist_sync' 
            ? '✓ Ajoutez un token API Grist valide dans la configuration'
            : '✓ Vérifiez que votre backend gère correctement l\'authentification',
          '✓ Vérifiez que le token n\'a pas expiré',
          '✓ Vérifiez les permissions du token'
        ],
        technicalDetails: error.message
      };

    case 403:
      return {
        type: 'forbidden',
        title: '403 - Accès interdit',
        message: 'Permissions insuffisantes',
        explanation: context === 'grist_sync'
          ? 'Votre token API Grist n\'a pas les permissions nécessaires pour modifier ce document ou cette table.'
          : context === 'api_send'
          ? 'L\'API backend refuse l\'accès. Cela est souvent dû à un problème d\'authentification (token manquant ou invalide) ou à des permissions insuffisantes.'
          : 'Votre backend ou l\'API distante refuse l\'accès à cette ressource.',
        solutions: context === 'api_send' ? [
          '✓ Vérifiez que vous avez configuré l\'authentification (Bearer token ou API Key)',
          '✓ Vérifiez que le token/clé API est correct et n\'a pas expiré',
          '✓ Vérifiez que l\'endpoint autorise les requêtes POST',
          '✓ Vérifiez les permissions associées à votre token/clé',
          '✓ Consultez la documentation de l\'API pour les exigences d\'authentification'
        ] : [
          '✓ Vérifiez que vous avez les droits d\'accès sur le document/table',
          context === 'grist_sync'
            ? '✓ Vérifiez les permissions du token API dans les paramètres Grist'
            : '✓ Contactez l\'administrateur de l\'API pour obtenir les permissions',
          '✓ Assurez-vous que le token utilisé est le bon'
        ],
        technicalDetails: error.message
      };

    case 404:
      return {
        type: 'not_found',
        title: '404 - Ressource introuvable',
        message: 'Document, table ou URL introuvable',
        explanation: context === 'grist_sync'
          ? 'Le Document ID ou le Table ID spécifié n\'existe pas, ou l\'URL de l\'API Grist est incorrecte.'
          : 'L\'URL du backend est incorrecte ou la ressource n\'existe pas.',
        solutions: [
          context === 'grist_sync'
            ? '✓ Vérifiez que le Document ID est correct (dans l\'URL Grist)'
            : '✓ Vérifiez que l\'URL du backend est correcte',
          context === 'grist_sync'
            ? '✓ Vérifiez que le Table ID correspond exactement au nom de la table (sensible à la casse)'
            : '✓ Vérifiez que l\'endpoint existe',
          context === 'grist_sync'
            ? '✓ Testez la connexion avec le bouton "🔍 Tester la connexion Grist"'
            : '✓ Testez l\'URL dans un navigateur ou avec un outil comme Postman'
        ],
        technicalDetails: error.message
      };

    case 422:
      return {
        type: 'unprocessable',
        title: '422 - Données invalides',
        message: 'Erreur de validation des données',
        explanation: 'Les données envoyées ne respectent pas le format attendu par l\'API.',
        solutions: [
          '✓ Vérifiez que les types de données correspondent (texte, nombre, date, etc.)',
          '✓ Vérifiez que les colonnes Grist existent et sont correctement configurées',
          '✓ Vérifiez le mapping des champs entre l\'API et Grist',
          '✓ Consultez le journal de synchronisation pour plus de détails'
        ],
        technicalDetails: error.message
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: 'server_error',
        title: `${status} - Erreur serveur`,
        message: 'Le serveur a rencontré une erreur',
        explanation: context === 'grist_sync'
          ? 'Le serveur Grist a rencontré une erreur interne. Cela peut être temporaire.'
          : 'Votre backend ou l\'API distante a rencontré une erreur interne.',
        solutions: [
          '✓ Réessayez dans quelques instants',
          '✓ Vérifiez le statut du service (Grist ou votre backend)',
          '✓ Si le problème persiste, contactez le support',
          '✓ Consultez les logs du serveur pour plus d\'informations'
        ],
        technicalDetails: error.message
      };

    default:
      return {
        type: 'unknown',
        title: `Erreur HTTP ${status}`,
        message: `Le serveur a renvoyé une erreur ${status}`,
        explanation: 'Une erreur HTTP inattendue s\'est produite.',
        solutions: [
          '✓ Consultez la documentation de l\'API',
          '✓ Vérifiez la console du navigateur pour plus de détails',
          '✓ Contactez le support si nécessaire'
        ],
        technicalDetails: error.message
      };
  }
}

/**
 * Détecte si une erreur est une erreur CORS
 */
function isCorsError(error: any): boolean {
  const message = error.message?.toLowerCase() || '';
  
  // Patterns communs d'erreurs CORS
  return (
    message.includes('cors') ||
    message.includes('cross-origin') ||
    message.includes('access-control-allow-origin') ||
    // Fetch API renvoie souvent TypeError pour CORS
    (error.name === 'TypeError' && message.includes('failed to fetch')) ||
    (error.name === 'TypeError' && message.includes('network request failed'))
  );
}

/**
 * Détecte si une erreur est une erreur réseau
 */
function isNetworkError(error: any): boolean {
  const message = error.message?.toLowerCase() || '';
  
  return (
    error.name === 'TypeError' && !isCorsError(error) ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('networkerror') ||
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('offline')
  );
}

/**
 * Formate une erreur pour l'affichage dans le status log
 * 
 * @param errorInfo - Information sur l'erreur
 * @returns Message formaté pour le log
 */
export function formatErrorForLog(errorInfo: ErrorInfo): string {
  return `❌ ${errorInfo.title}\n\n${errorInfo.explanation}\n\n💡 Solutions :\n${errorInfo.solutions.join('\n')}`;
}

/**
 * Formate une erreur pour l'affichage dans un message court
 * 
 * @param errorInfo - Information sur l'erreur
 * @returns Message court
 */
export function formatErrorShort(errorInfo: ErrorInfo): string {
  return `${errorInfo.message} - ${errorInfo.solutions[0]}`;
}
