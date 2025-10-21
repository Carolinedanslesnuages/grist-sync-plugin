/**
 * Types pour l'intégration GitHub
 */

/**
 * Configuration pour GitHub
 */
export interface GitHubConfig {
  /** Token d'accès personnel GitHub */
  token: string;
  /** Propriétaire du dépôt (username ou organization) */
  owner: string;
  /** Nom du dépôt */
  repo: string;
  /** Branche par défaut du dépôt (ex: 'main' ou 'master') */
  defaultBranch?: string;
}

/**
 * Options pour la création d'une branche
 */
export interface CreateBranchOptions {
  /** Nom de la nouvelle branche */
  branchName: string;
  /** SHA du commit de base (optionnel, utilise HEAD de la branche par défaut sinon) */
  baseSha?: string;
}

/**
 * Options pour créer un commit
 */
export interface CreateCommitOptions {
  /** Nom de la branche où créer le commit */
  branchName: string;
  /** Message du commit */
  message: string;
  /** Fichiers à commiter */
  files: Array<{
    /** Chemin du fichier dans le dépôt */
    path: string;
    /** Contenu du fichier */
    content: string;
  }>;
}

/**
 * Options pour créer une Pull Request
 */
export interface CreatePullRequestOptions {
  /** Titre de la PR */
  title: string;
  /** Description/corps de la PR */
  body?: string;
  /** Branche source (head) */
  head: string;
  /** Branche cible (base) */
  base: string;
}

/**
 * Informations sur une référence Git (branche)
 */
export interface GitReference {
  ref: string;
  sha: string;
}

/**
 * Informations sur un commit Git
 */
export interface GitCommit {
  sha: string;
  message: string;
  tree: {
    sha: string;
  };
}

/**
 * Informations sur une Pull Request
 */
export interface PullRequest {
  number: number;
  title: string;
  html_url: string;
  state: string;
}
