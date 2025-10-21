/**
 * Utilitaire pour interagir avec l'API GitHub
 * 
 * Ce module gère la création de branches, commits et Pull Requests.
 */

import type {
  GitHubConfig,
  CreateBranchOptions,
  CreateCommitOptions,
  CreatePullRequestOptions,
  GitReference,
  PullRequest
} from '../types/github';

/**
 * Classe pour gérer les interactions avec l'API GitHub
 */
export class GitHubClient {
  private config: GitHubConfig;
  private baseUrl = 'https://api.github.com';
  private onLog?: (message: string, type: 'info' | 'success' | 'error') => void;

  constructor(config: GitHubConfig, onLog?: (message: string, type: 'info' | 'success' | 'error') => void) {
    this.config = config;
    this.onLog = onLog;
  }

  /**
   * Log un message si un callback est fourni
   */
  private log(message: string, type: 'info' | 'success' | 'error' = 'info') {
    if (this.onLog) {
      this.onLog(message, type);
    }
  }

  /**
   * Construit les headers HTTP pour les requêtes GitHub
   */
  private buildHeaders(): HeadersInit {
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  /**
   * Récupère la référence d'une branche
   */
  async getBranchRef(branchName: string): Promise<GitReference | null> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/git/ref/heads/${branchName}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders()
      });

      if (response.status === 404) {
        return null; // Branche n'existe pas
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        ref: data.ref,
        sha: data.object.sha
      };
    } catch (error) {
      this.log(`❌ Erreur lors de la récupération de la branche: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Crée une nouvelle branche
   */
  async createBranch(options: CreateBranchOptions): Promise<GitReference> {
    this.log(`📝 Création de la branche ${options.branchName}...`, 'info');

    // Si aucun SHA de base n'est fourni, récupère le HEAD de la branche par défaut
    let baseSha = options.baseSha;
    if (!baseSha) {
      const defaultBranch = this.config.defaultBranch || 'main';
      const ref = await this.getBranchRef(defaultBranch);
      if (!ref) {
        throw new Error(`Branche par défaut '${defaultBranch}' introuvable`);
      }
      baseSha = ref.sha;
    }

    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/git/refs`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          ref: `refs/heads/${options.branchName}`,
          sha: baseSha
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      this.log(`✅ Branche ${options.branchName} créée avec succès`, 'success');
      
      return {
        ref: data.ref,
        sha: data.object.sha
      };
    } catch (error) {
      this.log(`❌ Erreur lors de la création de la branche: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Crée un blob (fichier) dans Git
   */
  private async createBlob(content: string): Promise<string> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/git/blobs`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        content: content,
        encoding: 'utf-8'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur lors de la création du blob: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.sha;
  }

  /**
   * Crée un arbre Git (tree) avec les fichiers
   */
  private async createTree(files: Array<{ path: string; content: string }>, baseTreeSha: string): Promise<string> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/git/trees`;
    
    // Crée les blobs pour chaque fichier
    const tree = await Promise.all(
      files.map(async (file) => {
        const blobSha = await this.createBlob(file.content);
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blobSha
        };
      })
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: tree
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur lors de la création de l'arbre: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.sha;
  }

  /**
   * Crée un commit Git
   */
  private async createGitCommit(message: string, treeSha: string, parentSha: string): Promise<string> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/git/commits`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        message: message,
        tree: treeSha,
        parents: [parentSha]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur lors de la création du commit: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.sha;
  }

  /**
   * Met à jour la référence d'une branche
   */
  private async updateBranchRef(branchName: string, commitSha: string): Promise<void> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/git/refs/heads/${branchName}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        sha: commitSha,
        force: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur lors de la mise à jour de la branche: ${response.status} ${errorText}`);
    }
  }

  /**
   * Crée un commit avec des fichiers sur une branche
   */
  async createCommit(options: CreateCommitOptions): Promise<string> {
    this.log(`📝 Création du commit sur ${options.branchName}...`, 'info');

    try {
      // Récupère la référence de la branche
      const branchRef = await this.getBranchRef(options.branchName);
      if (!branchRef) {
        throw new Error(`Branche ${options.branchName} introuvable`);
      }

      // Récupère le commit actuel
      const commitUrl = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/git/commits/${branchRef.sha}`;
      const commitResponse = await fetch(commitUrl, {
        method: 'GET',
        headers: this.buildHeaders()
      });

      if (!commitResponse.ok) {
        throw new Error(`Erreur lors de la récupération du commit`);
      }

      const commitData = await commitResponse.json();
      const baseTreeSha = commitData.tree.sha;

      // Crée l'arbre avec les nouveaux fichiers
      const treeSha = await this.createTree(options.files, baseTreeSha);

      // Crée le commit
      const commitSha = await this.createGitCommit(options.message, treeSha, branchRef.sha);

      // Met à jour la référence de la branche
      await this.updateBranchRef(options.branchName, commitSha);

      this.log(`✅ Commit créé avec succès: ${commitSha.substring(0, 7)}`, 'success');
      return commitSha;
    } catch (error) {
      this.log(`❌ Erreur lors de la création du commit: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Crée une Pull Request
   */
  async createPullRequest(options: CreatePullRequestOptions): Promise<PullRequest> {
    this.log(`📝 Création de la Pull Request...`, 'info');

    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/pulls`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          title: options.title,
          body: options.body || '',
          head: options.head,
          base: options.base
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      this.log(`✅ Pull Request créée: ${data.html_url}`, 'success');
      
      return {
        number: data.number,
        title: data.title,
        html_url: data.html_url,
        state: data.state
      };
    } catch (error) {
      this.log(`❌ Erreur lors de la création de la PR: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Synchronise des données vers GitHub (crée branche, commit et PR)
   */
  async syncToGitHub(
    tableName: string,
    data: any[],
    format: 'json' | 'csv' = 'json'
  ): Promise<PullRequest> {
    const now = new Date();
    const datePart = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timePart = now.toTimeString().split(' ')[0]?.replace(/:/g, '') || '000000';
    const timestamp = `${datePart}-${timePart}`;
    const branchName = `grist-sync/${tableName}-${timestamp}`;
    const fileName = `data-sync/grist-${tableName}-${timestamp}.${format}`;

    this.log(`🚀 Démarrage de la synchronisation vers GitHub...`, 'info');
    this.log(`📊 ${data.length} enregistrement(s) à synchroniser`, 'info');

    try {
      // 1. Crée la branche
      await this.createBranch({ branchName });

      // 2. Prépare le contenu du fichier
      let fileContent: string;
      if (format === 'json') {
        fileContent = JSON.stringify(data, null, 2);
      } else {
        // Format CSV
        fileContent = this.convertToCSV(data);
      }

      // 3. Crée le commit avec le fichier
      await this.createCommit({
        branchName,
        message: `chore(sync): export table ${tableName} - ${new Date().toISOString()}`,
        files: [{
          path: fileName,
          content: fileContent
        }]
      });

      // 4. Crée la Pull Request
      const defaultBranch = this.config.defaultBranch || 'main';
      const pr = await this.createPullRequest({
        title: `[Grist Sync] Export de la table ${tableName}`,
        body: `## 📊 Synchronisation Grist

Cette Pull Request contient l'export des données de la table **${tableName}**.

### Détails
- **Table**: ${tableName}
- **Nombre d'enregistrements**: ${data.length}
- **Format**: ${format.toUpperCase()}
- **Fichier**: \`${fileName}\`
- **Date**: ${new Date().toLocaleString('fr-FR')}

### Fichiers modifiés
- \`${fileName}\` - Export des données

---
*Généré automatiquement par Grist Sync Plugin*`,
        head: branchName,
        base: defaultBranch
      });

      return pr;
    } catch (error) {
      this.log(`❌ Échec de la synchronisation: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Convertit un tableau d'objets en CSV
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) {
      return '';
    }

    // Récupère toutes les colonnes uniques
    const columns = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => columns.add(key));
    });

    const columnArray = Array.from(columns);

    // En-tête CSV
    const header = columnArray.map(col => `"${col}"`).join(',');

    // Lignes de données
    const rows = data.map(row => {
      return columnArray.map(col => {
        const value = row[col];
        if (value === null || value === undefined) {
          return '';
        }
        // Échappe les guillemets doubles
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Teste la connexion et les permissions GitHub
   */
  async testConnection(): Promise<{ valid: boolean; message: string }> {
    try {
      const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders()
      });

      if (response.status === 401) {
        return {
          valid: false,
          message: 'Token GitHub invalide ou expiré'
        };
      }

      if (response.status === 404) {
        return {
          valid: false,
          message: 'Dépôt introuvable ou accès non autorisé'
        };
      }

      if (response.ok) {
        const data = await response.json();
        return {
          valid: true,
          message: `Connexion réussie au dépôt ${data.full_name}`
        };
      }

      return {
        valid: false,
        message: `Erreur HTTP ${response.status}`
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Erreur de connexion'
      };
    }
  }
}

/**
 * Génère un nom de branche unique basé sur la table et le timestamp
 */
export function generateBranchName(tableName: string): string {
  const now = new Date();
  const datePart = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
  const timePart = now.toTimeString().split(' ')[0]?.replace(/:/g, '') || '000000';
  const timestamp = `${datePart}-${timePart}`;
  return `grist-sync/${tableName}-${timestamp}`;
}

/**
 * Génère un nom de fichier pour l'export
 */
export function generateFileName(tableName: string, format: 'json' | 'csv' = 'json'): string {
  const now = new Date();
  const datePart = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
  const timePart = now.toTimeString().split(' ')[0]?.replace(/:/g, '') || '000000';
  const timestamp = `${datePart}-${timePart}`;
  return `data-sync/grist-${tableName}-${timestamp}.${format}`;
}
