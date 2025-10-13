<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { GristConfig } from '../../config';
import { GristClient, parseGristUrl, isValidGristUrl } from '../../utils/grist';

/**
 * Step 3: Configuration de la cible Grist (URL doc, nom de table, clé API)
 */

interface Props {
  config: GristConfig;
  isLoading: boolean;
}

interface Emits {
  (e: 'update:config', value: GristConfig): void;
  (e: 'update:isLoading', value: boolean): void;
  (e: 'status', message: string, type: 'success' | 'error' | 'info'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localConfig = ref<GristConfig>({ ...props.config });
const connectionTested = ref(false);
const documentUrlInput = ref('');
const urlParseError = ref('');
const apiTokenValidation = ref<{ valid: boolean; message: string; needsAuth: boolean } | null>(null);

// Synchronisation avec le parent
watch(() => props.config, (newConfig) => {
  localConfig.value = { ...newConfig };
}, { deep: true });

/**
 * Valide si tous les champs requis sont remplis
 */
const isConfigValid = computed(() => {
  return (
    localConfig.value.docId && 
    localConfig.value.docId !== 'YOUR_DOC_ID' &&
    localConfig.value.tableId && 
    localConfig.value.tableId !== 'YOUR_TABLE_ID' &&
    localConfig.value.gristApiUrl &&
    localConfig.value.gristApiUrl !== ''
  );
});

/**
 * Masque le token API pour l'affichage
 */
const maskedApiToken = computed(() => {
  if (!localConfig.value.apiTokenGrist) {
    return '';
  }
  const token = localConfig.value.apiTokenGrist;
  if (token.length <= 8) {
    return '••••••••';
  }
  return token.substring(0, 4) + '••••••••' + token.substring(token.length - 4);
});

/**
 * Parse l'URL du document pour extraire docId et gristApiUrl
 */
function handleUrlPaste() {
  urlParseError.value = '';
  
  if (!documentUrlInput.value.trim()) {
    return;
  }
  
  // Vérifier si c'est juste un docId (sans protocole)
  if (!documentUrlInput.value.includes('://')) {
    // C'est probablement juste un docId
    localConfig.value.docId = documentUrlInput.value.trim();
    emit('status', '✓ Document ID configuré', 'info');
    return;
  }
  
  // Parser l'URL complète
  if (isValidGristUrl(documentUrlInput.value)) {
    const parsed = parseGristUrl(documentUrlInput.value);
    if (parsed.docId && parsed.gristApiUrl) {
      localConfig.value.docId = parsed.docId;
      localConfig.value.gristApiUrl = parsed.gristApiUrl;
      emit('status', '✅ URL Grist analysée avec succès', 'success');
      connectionTested.value = false;
      apiTokenValidation.value = null;
    }
  } else {
    urlParseError.value = 'URL invalide. Format attendu: https://docs.getgrist.com/doc/YOUR_DOC_ID';
    emit('status', '❌ URL Grist invalide', 'error');
  }
}

/**
 * Teste la connexion à Grist et valide le token API
 */
async function testGristConnection() {
  if (!localConfig.value.docId || localConfig.value.docId === 'YOUR_DOC_ID') {
    emit('status', '⚠️ Veuillez configurer votre Document ID Grist', 'error');
    return;
  }
  
  if (!localConfig.value.tableId || localConfig.value.tableId === 'YOUR_TABLE_ID') {
    emit('status', '⚠️ Veuillez configurer votre Table ID Grist', 'error');
    return;
  }
  
  emit('update:isLoading', true);
  
  try {
    const client = new GristClient(localConfig.value);
    
    // Valider le token API
    apiTokenValidation.value = await client.validateApiToken();
    
    const isConnected = await client.testConnection();
    
    if (isConnected) {
      connectionTested.value = true;
      emit('status', '✅ Connexion à Grist réussie!', 'success');
      emit('update:config', localConfig.value);
    } else {
      emit('status', '❌ Impossible de se connecter à Grist. Vérifiez votre configuration.', 'error');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    emit('status', `❌ Erreur de connexion: ${message}`, 'error');
  } finally {
    emit('update:isLoading', false);
  }
}

// Marque la connexion comme non testée quand la config change
watch(localConfig, () => {
  connectionTested.value = false;
  apiTokenValidation.value = null;
  // Update parent config when local config changes
  emit('update:config', localConfig.value);
}, { deep: true });
</script>

<template>
  <div class="step-container">
    <div class="step-header">
      <h2 class="fr-h2">
        <span class="step-icon">⚙️</span>
        Étape 3 : Configuration Grist
      </h2>
      <p class="fr-text">
        Configurez la destination des données dans votre document Grist.
      </p>
    </div>

    <div class="step-content">
      <!-- Configuration Grist -->
      <DsfrFieldset legend="Informations de connexion Grist">
        <!-- Option: Coller l'URL complète du document -->
        <DsfrInputGroup>
          <DsfrInput
            label="URL du document Grist (optionnel)"
            v-model="documentUrlInput"
            placeholder="https://docs.getgrist.com/doc/YOUR_DOC_ID"
            hint="Collez l'URL complète de votre document Grist pour remplir automatiquement les champs"
            @blur="handleUrlPaste"
          />
          <p v-if="urlParseError" class="fr-error-text">{{ urlParseError }}</p>
        </DsfrInputGroup>

        <div class="fr-my-2w separator-text">
          <span>OU saisissez manuellement :</span>
        </div>

        <DsfrInputGroup>
          <DsfrInput
            label="Document ID *"
            v-model="localConfig.docId"
            placeholder="Votre ID de document Grist"
            hint="Visible dans l'URL de votre document Grist"
          />
        </DsfrInputGroup>

        <DsfrInputGroup>
          <DsfrInput
            label="Table ID *"
            v-model="localConfig.tableId"
            placeholder="Votre ID de table Grist"
            hint="Le nom de la table où insérer les données"
          />
        </DsfrInputGroup>

        <DsfrInputGroup>
          <DsfrInput
            label="URL API Grist"
            v-model="localConfig.gristApiUrl"
            placeholder="https://docs.getgrist.com"
            hint="URL de base de l'API Grist"
          />
        </DsfrInputGroup>

        <DsfrInputGroup>
          <DsfrInput
            label="Token API Grist (optionnel)"
            v-model="localConfig.apiTokenGrist"
            type="password"
            placeholder="Votre token Grist (si nécessaire)"
            hint="Requis uniquement pour les documents privés"
          />
        </DsfrInputGroup>

        <!-- Affichage des informations sur le token API -->
        <div v-if="localConfig.apiTokenGrist" class="fr-mb-3w api-token-info">
          <DsfrCallout title="🔐 Informations sur le token API">
            <div class="token-display">
              <strong>Token configuré :</strong> 
              <code class="masked-token">{{ maskedApiToken }}</code>
            </div>
            <div v-if="apiTokenValidation" class="token-validation fr-mt-2w">
              <DsfrBadge 
                :type="apiTokenValidation.valid ? 'success' : (apiTokenValidation.needsAuth ? 'warning' : 'error')"
              >
                {{ apiTokenValidation.message }}
              </DsfrBadge>
            </div>
          </DsfrCallout>
        </div>

        <div class="fr-mt-4w">
          <DsfrButton
            label="Tester la connexion"
            icon="ri-plug-line"
            :loading="isLoading"
            :disabled="!isConfigValid"
            @click="testGristConnection"
          />
          <DsfrBadge 
            v-if="connectionTested" 
            type="success"
            class="fr-ml-2w"
          >
            ✓ Connexion testée
          </DsfrBadge>
        </div>
      </DsfrFieldset>

      <!-- Instructions -->
      <div class="fr-mt-4w">
        <DsfrCallout title="📖 Comment trouver ces informations ?">
          <ul class="fr-text--sm">
            <li>
              <strong>Document ID :</strong> Ouvrez votre document Grist, l'ID se trouve dans l'URL 
              (ex: <code>https://docs.getgrist.com/doc/<strong>YOUR_DOC_ID</strong></code>)
            </li>
            <li>
              <strong>Table ID :</strong> Le nom de votre table visible dans la barre latérale gauche de Grist
            </li>
            <li>
              <strong>Token API :</strong> Créez un token dans les paramètres de votre profil Grist 
              (requis pour les documents privés)
            </li>
          </ul>
        </DsfrCallout>
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

.step-content {
  max-width: 800px;
}

.separator-text {
  text-align: center;
  position: relative;
  margin: 1.5rem 0;
}

.separator-text span {
  background: white;
  padding: 0 1rem;
  color: #666;
  font-size: 0.875rem;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.separator-text::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e5e5e5;
}

.api-token-info {
  background: #f6f6f6;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e5e5e5;
}

.token-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.masked-token {
  background: #fff;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
  border: 1px solid #ddd;
  letter-spacing: 0.1em;
}

.token-validation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

code {
  background: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.fr-error-text {
  color: #ce0500;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .token-display {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
