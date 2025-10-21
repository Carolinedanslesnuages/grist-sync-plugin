<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GristConfig } from '../../config';
import type { GitHubConfig } from '../../types/github';
import { GristClient } from '../../utils/grist';
import { GitHubClient } from '../../utils/github';

/**
 * Step 5: Configuration et synchronisation vers GitHub
 */

interface Props {
  gristConfig: GristConfig;
  isLoading: boolean;
}

interface Emits {
  (e: 'update:isLoading', value: boolean): void;
  (e: 'status', message: string, type: 'success' | 'error' | 'info'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Configuration GitHub
const githubToken = ref<string>('');
const githubOwner = ref<string>('');
const githubRepo = ref<string>('');
const githubDefaultBranch = ref<string>('main');
const exportFormat = ref<'json' | 'csv'>('json');

// État de la synchronisation
const syncLogs = ref<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>>([]);
const syncCompleted = ref(false);
const syncSuccess = ref(false);
const pullRequestUrl = ref<string>('');

// Validation
const isGitHubConfigValid = computed(() => {
  return (
    githubToken.value.trim() !== '' &&
    githubOwner.value.trim() !== '' &&
    githubRepo.value.trim() !== '' &&
    githubDefaultBranch.value.trim() !== ''
  );
});

const canSync = computed(() => {
  return isGitHubConfigValid.value;
});

/**
 * Ajoute un log
 */
function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const time = new Date().toLocaleTimeString('fr-FR');
  syncLogs.value.push({ time, message, type });
}

/**
 * Teste la connexion GitHub
 */
async function testGitHubConnection() {
  if (!isGitHubConfigValid.value) {
    emit('status', '⚠️ Veuillez remplir tous les champs de configuration GitHub', 'error');
    return;
  }

  emit('update:isLoading', true);
  addLog('🔍 Test de connexion à GitHub...', 'info');

  try {
    const githubConfig: GitHubConfig = {
      token: githubToken.value,
      owner: githubOwner.value,
      repo: githubRepo.value,
      defaultBranch: githubDefaultBranch.value
    };

    const client = new GitHubClient(githubConfig, addLog);
    const result = await client.testConnection();

    if (result.valid) {
      addLog(`✅ ${result.message}`, 'success');
      emit('status', '✅ Connexion GitHub établie avec succès', 'success');
    } else {
      addLog(`❌ ${result.message}`, 'error');
      emit('status', `❌ ${result.message}`, 'error');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    addLog(`❌ Erreur: ${message}`, 'error');
    emit('status', `❌ Erreur de connexion: ${message}`, 'error');
  } finally {
    emit('update:isLoading', false);
  }
}

/**
 * Synchronise vers GitHub
 */
async function syncToGitHub() {
  syncLogs.value = [];
  syncCompleted.value = false;
  syncSuccess.value = false;
  pullRequestUrl.value = '';

  addLog('🚀 Démarrage de la synchronisation vers GitHub...', 'info');

  if (!isGitHubConfigValid.value) {
    addLog('❌ Configuration GitHub incomplète', 'error');
    emit('status', '⚠️ Veuillez remplir tous les champs de configuration GitHub', 'error');
    return;
  }

  emit('update:isLoading', true);

  try {
    // 1. Récupère les données depuis Grist
    addLog('📥 Récupération des données depuis Grist...', 'info');
    const gristClient = new GristClient(props.gristConfig, addLog);
    const records = await gristClient.getRecords();

    if (records.length === 0) {
      addLog('⚠️ Aucune donnée à synchroniser dans la table Grist', 'error');
      emit('status', '⚠️ Aucune donnée à synchroniser', 'error');
      return;
    }

    addLog(`✅ ${records.length} enregistrement(s) récupéré(s)`, 'success');

    // 2. Extrait les données des enregistrements (retire les métadonnées)
    const data = records.map((record: any) => {
      if (record.fields) {
        return record.fields;
      }
      return record;
    });

    // 3. Synchronise vers GitHub
    const githubConfig: GitHubConfig = {
      token: githubToken.value,
      owner: githubOwner.value,
      repo: githubRepo.value,
      defaultBranch: githubDefaultBranch.value
    };

    const githubClient = new GitHubClient(githubConfig, addLog);
    const pr = await githubClient.syncToGitHub(
      props.gristConfig.tableId,
      data,
      exportFormat.value
    );

    pullRequestUrl.value = pr.html_url;
    addLog(`✅ Synchronisation terminée avec succès!`, 'success');
    addLog(`🔗 Pull Request: ${pr.html_url}`, 'success');

    syncCompleted.value = true;
    syncSuccess.value = true;
    emit('status', '✅ Synchronisation vers GitHub réussie!', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    addLog(`❌ Erreur lors de la synchronisation: ${message}`, 'error');
    emit('status', `❌ Erreur: ${message}`, 'error');
    syncCompleted.value = true;
    syncSuccess.value = false;
  } finally {
    emit('update:isLoading', false);
  }
}
</script>

<template>
  <div class="step-container">
    <div class="step-header">
      <h2 class="fr-h2">
        <span class="step-icon">🔄</span>
        Étape 5 : Synchronisation vers GitHub
      </h2>
      <p class="fr-text">
        Exportez les données de votre table Grist vers un dépôt GitHub via une Pull Request.
      </p>
    </div>

    <div class="step-content">
      <!-- Configuration GitHub -->
      <div class="fr-mb-4w">
        <h3 class="fr-h6">⚙️ Configuration GitHub</h3>
        
        <div class="fr-input-group fr-mb-2w">
          <label class="fr-label" for="github-token">
            Token d'accès personnel GitHub
            <span class="fr-hint-text">Token avec permissions 'repo' pour créer des branches et PRs</span>
          </label>
          <input
            id="github-token"
            v-model="githubToken"
            type="password"
            class="fr-input"
            placeholder="ghp_xxxxxxxxxxxxx"
            :disabled="isLoading"
          />
        </div>

        <div class="fr-input-group fr-mb-2w">
          <label class="fr-label" for="github-owner">
            Propriétaire du dépôt
            <span class="fr-hint-text">Nom d'utilisateur ou organisation GitHub</span>
          </label>
          <input
            id="github-owner"
            v-model="githubOwner"
            type="text"
            class="fr-input"
            placeholder="exemple: votre-username"
            :disabled="isLoading"
          />
        </div>

        <div class="fr-input-group fr-mb-2w">
          <label class="fr-label" for="github-repo">
            Nom du dépôt
            <span class="fr-hint-text">Nom du repository GitHub</span>
          </label>
          <input
            id="github-repo"
            v-model="githubRepo"
            type="text"
            class="fr-input"
            placeholder="exemple: mon-depot"
            :disabled="isLoading"
          />
        </div>

        <div class="fr-input-group fr-mb-2w">
          <label class="fr-label" for="github-branch">
            Branche par défaut
            <span class="fr-hint-text">Branche cible pour la Pull Request</span>
          </label>
          <input
            id="github-branch"
            v-model="githubDefaultBranch"
            type="text"
            class="fr-input"
            placeholder="main"
            :disabled="isLoading"
          />
        </div>

        <div class="fr-select-group fr-mb-2w">
          <label class="fr-label" for="export-format">
            Format d'export
          </label>
          <select
            id="export-format"
            v-model="exportFormat"
            class="fr-select"
            :disabled="isLoading"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </div>

        <DsfrButton
          label="Tester la connexion"
          icon="ri-eye-line"
          :disabled="!isGitHubConfigValid || isLoading"
          :loading="isLoading"
          @click="testGitHubConnection"
        />
      </div>

      <!-- Bouton de synchronisation -->
      <div class="fr-mb-4w" v-if="!syncCompleted">
        <h3 class="fr-h6">🚀 Lancer la synchronisation</h3>
        <DsfrButton
          label="Synchroniser vers GitHub"
          icon="ri-github-fill"
          size="lg"
          :loading="isLoading"
          :disabled="!canSync"
          @click="syncToGitHub"
        />
        <div v-if="!canSync" class="fr-mt-2w">
          <DsfrCallout 
            type="warning"
            title="⚠️ Configuration incomplète"
          >
            <p class="fr-text--sm">
              Pour lancer la synchronisation, veuillez remplir tous les champs de configuration GitHub.
            </p>
          </DsfrCallout>
        </div>
      </div>

      <!-- Logs de synchronisation -->
      <div v-if="syncLogs.length > 0" class="fr-mb-4w">
        <h3 class="fr-h6">📝 Journal de synchronisation</h3>
        <div class="sync-logs">
          <div 
            v-for="(log, index) in syncLogs" 
            :key="index"
            class="log-entry"
            :class="`log-${log.type}`"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>

      <!-- Résultat de la synchronisation -->
      <div v-if="syncCompleted" class="fr-mb-4w">
        <DsfrAlert
          v-if="syncSuccess"
          type="success"
          title="Synchronisation réussie"
          :description="`Les données ont été exportées vers GitHub avec succès!`"
        >
          <template #default>
            <p class="fr-text--sm fr-mt-2w">
              <strong>🔗 Pull Request créée:</strong>
              <br />
              <a :href="pullRequestUrl" target="_blank" rel="noopener noreferrer" class="fr-link">
                {{ pullRequestUrl }}
              </a>
            </p>
          </template>
        </DsfrAlert>
        <DsfrAlert
          v-else
          type="error"
          title="Échec de la synchronisation"
          description="Une erreur s'est produite lors de la synchronisation. Consultez le journal ci-dessus pour plus de détails."
        />
      </div>

      <!-- Info finale -->
      <div v-if="syncCompleted && syncSuccess" class="fr-mb-4w">
        <DsfrCallout
          title="✅ Et maintenant ?"
          content="Votre Pull Request a été créée! Vous pouvez maintenant la consulter sur GitHub, la reviewer et la merger dans votre branche principale."
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-container {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e5e5;
}

.step-icon {
  font-size: 1.5rem;
  margin-right: 0.5rem;
}

.sync-logs {
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 8px;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.log-entry {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  border-radius: 4px;
  display: flex;
  gap: 1rem;
}

.log-time {
  color: #858585;
  font-weight: bold;
  min-width: 80px;
}

.log-message {
  flex: 1;
}

.log-info {
  background: rgba(100, 150, 255, 0.1);
}

.log-success {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.log-error {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

@media (max-width: 768px) {
  .sync-logs {
    font-size: 0.8em;
  }
}
</style>
