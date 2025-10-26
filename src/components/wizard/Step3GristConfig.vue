<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { GristConfig } from '../../config';
import { GristClient, parseGristUrl, isValidGristUrl } from '../../utils/grist';
import { initializeGristWidget, applyGristInfoToConfig, isRunningInGrist } from '../../utils/gristWidget';


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
const isLoading = computed(() => props.isLoading);
const connectionTested = ref(false);
const documentUrlInput = ref('');
const urlParseError = ref('');
const apiTokenValidation = ref<{ valid: boolean; message: string; needsAuth: boolean } | null>(null);
const applyingProps = ref(false);
const isEmbeddedInGrist = ref(false);
const autoDetectedFields = ref<string[]>([]);

watch(() => props.config, (newConfig) => {
  applyingProps.value = true;
  localConfig.value = { ...newConfig };
  Promise.resolve().then(() => {
    applyingProps.value = false;
  });
}, { deep: true });

const isConfigValid = computed(() => {
  return (
    !!localConfig.value.docId &&
    localConfig.value.docId !== 'YOUR_DOC_ID' &&
    !!localConfig.value.tableId &&
    localConfig.value.tableId !== 'YOUR_TABLE_ID'
  );
});

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


function extractDocAndTableIdFromSegments(segments: string[]): { docId?: string; tableId?: string } {
  const pIndex = segments.findIndex((s) => s === 'p');
  let docId: string | undefined;
  let tableId: string | undefined;

  if (pIndex !== -1 && segments.length > pIndex + 1) {
    tableId = segments[pIndex + 1];
    if (segments[0] === 'doc' && segments.length > 1) {
      docId = segments[1];
    } else if (segments.length >= 1) {
      const candidate = segments[0];
      if (candidate && /^[A-Za-z0-9_-]{6,}$/.test(candidate)) {
        docId = candidate;
      } else {
        docId = segments.find((seg) => /^[A-Za-z0-9_-]{6,}$/.test(seg));
      }
    }
  } else {
    docId = segments.find((seg) => /^[A-Za-z0-9_-]{6,}$/.test(seg));
  }

  return { docId, tableId };
}

function handleNoProtocolInput(input: string) {
  localConfig.value.docId = input.trim();
  emit('status', '✓ Document ID configuré', 'info');
}

function handleValidGristUrl(input: string) {
  const parsed = parseGristUrl(input);
  if (parsed.docId) {
    localConfig.value.docId = parsed.docId;
  }
  if (parsed.gristApiUrl) {
    localConfig.value.gristApiUrl = parsed.gristApiUrl;
  }
  if ((parsed as any).tableId) {
    localConfig.value.tableId = (parsed as any).tableId;
  }
  emit('status', '✅ URL Grist analysée avec succès', 'success');
  connectionTested.value = false;
  apiTokenValidation.value = null;
}

function handleUrlPaste() {
  urlParseError.value = '';

  const input = documentUrlInput.value.trim();
  if (!input) return;

  if (!input.includes('://')) {
    handleNoProtocolInput(input);
    return;
  }

  if (isValidGristUrl(input)) {
    handleValidGristUrl(input);
    return;
  }

  try {
    const url = new URL(input);
    const segments = url.pathname.split('/').filter(Boolean);
    const { docId, tableId } = extractDocAndTableIdFromSegments(segments);

    if (docId) {
      localConfig.value.docId = docId;
    }
    if (tableId) {
      localConfig.value.tableId = tableId;
    }

    if (docId || tableId) {
      emit('status', `✅ URL Grist locale analysée (${docId ?? 'doc?'} / ${tableId ?? 'table?'})`, 'success');
      connectionTested.value = false;
      apiTokenValidation.value = null;
      return;
    }

    urlParseError.value = 'Impossible d\'extraire le Document ID ou le Table ID depuis l\'URL fournie.';
    emit('status', '❌ URL Grist non reconnue', 'error');
  } catch (err) {
    urlParseError.value = 'URL invalide. Assurez-vous d\'inclure le protocole (ex: http://)';
    emit('status', '❌ URL Grist invalide', 'error');
  }
}

async function testGristConnection() {
  if (!localConfig.value.docId || localConfig.value.docId === 'YOUR_DOC_ID') {
    emit('status', '⚠️ Veuillez configurer votre Document ID Grist', 'error');
    return;
  }

  if (!localConfig.value.gristApiUrl || localConfig.value.gristApiUrl.trim() === '') {
    try {
      if (documentUrlInput.value && documentUrlInput.value.includes('://')) {
        localConfig.value.gristApiUrl = new URL(documentUrlInput.value).origin;
        emit('status', `ℹ️ URL API Grist devinée : ${localConfig.value.gristApiUrl}`, 'info');
      } else {
        localConfig.value.gristApiUrl = 'http://localhost:8484';
        emit('status', `ℹ️ URL API Grist par défaut utilisée : ${localConfig.value.gristApiUrl}`, 'info');
      }
    } catch (err) {
      console.warn('Impossible d\'inferer gristApiUrl:', err);
    }
  }

  if (!localConfig.value.tableId || localConfig.value.tableId === 'YOUR_TABLE_ID') {
    emit('status', '⚠️ Veuillez configurer votre Table ID Grist', 'error');
    return;
  }

  emit('update:isLoading', true);

  try {
    const client = new GristClient(localConfig.value);

    if (localConfig.value.apiTokenGrist) {
      apiTokenValidation.value = await client.validateApiToken();
    } else {
      apiTokenValidation.value = { valid: false, message: 'Aucun token fourni (document public ou local)', needsAuth: false };
    }

    const isConnected = await client.testConnection();

    if (isConnected) {
      connectionTested.value = true;
      emit('status', '✅ Connexion à Grist réussie!', 'success');
      emit('update:config', localConfig.value);
    } else {
      emit('status', '❌ Impossible de se connecter à Grist. Vérifiez votre configuration et la disponibilité du serveur.', 'error');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('testGristConnection error', error);
    emit('status', `❌ Erreur de connexion: ${message}`, 'error');
  } finally {
    emit('update:isLoading', false);
  }
}

// Auto-detect Grist configuration on component mount
onMounted(async () => {
  console.log('[Step3GristConfig] Component mounted, checking for Grist environment...');
  
  // Check if running within Grist as a Custom Widget
  if (isRunningInGrist()) {
    console.log('[Step3GristConfig] Running in Grist environment, starting auto-detection');
    isEmbeddedInGrist.value = true;
    emit('status', '🔍 Détection de l\'environnement Grist...', 'info');
    
    try {
      console.log('[Step3GristConfig] Calling initializeGristWidget...');
      const gristInfo = await initializeGristWidget();
      console.log('[Step3GristConfig] initializeGristWidget returned:', gristInfo);
      
      if (gristInfo.isInGrist) {
        console.log('[Step3GristConfig] Grist info detected, applying to config');
        // Apply auto-detected values
        const updatedConfig = applyGristInfoToConfig(localConfig.value, gristInfo);
        
        // Track which fields were auto-detected
        autoDetectedFields.value = [];
        if (gristInfo.docId) {
          autoDetectedFields.value.push('Document ID');
          console.log('[Step3GristConfig] Auto-detected Document ID:', gristInfo.docId);
        }
        if (gristInfo.gristApiUrl) {
          autoDetectedFields.value.push('URL API Grist');
          console.log('[Step3GristConfig] Auto-detected API URL:', gristInfo.gristApiUrl);
        }
        if (gristInfo.accessToken) {
          autoDetectedFields.value.push('Token API');
          console.log('[Step3GristConfig] Auto-detected access token (masked)');
        }
        
        // Update local config
        localConfig.value = updatedConfig;
        console.log('[Step3GristConfig] Config updated with auto-detected values');
        
        // Show success message
        if (autoDetectedFields.value.length > 0) {
          const fieldsStr = autoDetectedFields.value.join(', ');
          emit('status', `✅ Configuration auto-détectée: ${fieldsStr}`, 'success');
          console.log('[Step3GristConfig] Auto-detection successful:', fieldsStr);
        } else {
          console.log('[Step3GristConfig] No fields were auto-detected');
        }
      } else {
        console.log('[Step3GristConfig] isInGrist is false in returned info');
      }
    } catch (error) {
      console.error('[Step3GristConfig] Erreur lors de la détection automatique:', error);
      emit('status', '⚠️ Impossible de détecter automatiquement la configuration Grist', 'info');
      isEmbeddedInGrist.value = false;
    }
  } else {
    console.log('[Step3GristConfig] Not running in Grist environment');
  }
});

watch(localConfig, (newVal) => {
  if (applyingProps.value) {
    apiTokenValidation.value = null; 
    return;
  }

  connectionTested.value = false;
  apiTokenValidation.value = null;

  try {
    const parentJson = JSON.stringify(props.config || {});
    const localJson = JSON.stringify(newVal || {});
    if (parentJson !== localJson) {
      Promise.resolve().then(() => emit('update:config', newVal));
    }
  } catch (err) {
    console.error('Erreur lors de la sérialisation de la config:', err);
    emit('status', '⚠️ Erreur lors de la sérialisation de la configuration', 'error');
    Promise.resolve().then(() => emit('update:config', newVal));
  }
}, { deep: true });
</script>

<template>
  <div class="step-container">
    <div class="step-header">
      <h2 class="fr-h2">
        <span class="step-icon"></span>
        Étape 2 : Configuration Grist
      </h2>
      <p class="fr-text">
        Configurez la destination des données dans votre document Grist.
      </p>
    </div>

    <div class="step-content">
      <!-- Auto-detection status indicator -->
      <DsfrCallout 
        v-if="isEmbeddedInGrist && autoDetectedFields.length > 0" 
        title="🎉 Configuration automatique détectée !"
        type="success"
        class="fr-mb-3w"
      >
        <p class="fr-text--sm">
          Le plugin a détecté qu'il fonctionne dans un environnement Grist et a automatiquement 
          configuré les champs suivants : <strong>{{ autoDetectedFields.join(', ') }}</strong>.
        </p>
        <p class="fr-text--sm fr-mb-0">
          Vous pouvez modifier ces valeurs si nécessaire ou les conserver telles quelles.
        </p>
      </DsfrCallout>

      <DsfrFieldset legend="Informations de connexion Grist">
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
          <div class="input-with-badge">
            <DsfrInput
              label="Document ID *"
              v-model="localConfig.docId"
              placeholder="Votre ID de document Grist"
              hint="Visible dans l'URL de votre document Grist"
            />
            <DsfrBadge 
              v-if="autoDetectedFields.includes('Document ID')" 
              type="success" 
              small
              class="auto-detected-badge"
            >
              ✓ Auto-détecté
            </DsfrBadge>
          </div>
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
          <div class="input-with-badge">
            <DsfrInput
              label="URL API Grist"
              v-model="localConfig.gristApiUrl"
              placeholder="https://docs.getgrist.com"
              hint="URL de base de l'API Grist"
            />
            <DsfrBadge 
              v-if="autoDetectedFields.includes('URL API Grist')" 
              type="success" 
              small
              class="auto-detected-badge"
            >
              ✓ Auto-détecté
            </DsfrBadge>
          </div>
        </DsfrInputGroup>

        <DsfrInputGroup>
          <div class="input-with-badge">
            <DsfrInput
              label="Token API Grist (optionnel)"
              v-model="localConfig.apiTokenGrist"
              type="password"
              placeholder="Votre token Grist (si nécessaire)"
              hint="Requis uniquement pour les documents privés"
            />
            <DsfrBadge 
              v-if="autoDetectedFields.includes('Token API')" 
              type="success" 
              small
              class="auto-detected-badge"
            >
              ✓ Auto-détecté
            </DsfrBadge>
          </div>
        </DsfrInputGroup>

        <div v-if="localConfig.apiTokenGrist" class="fr-mb-3w api-token-info">
          <DsfrCallout title="🔐 Informations sur le token API">
            <div class="token-display">
              <strong>Token configuré :</strong> 
              <code class="fr-code masked-token">{{ maskedApiToken }}</code>
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
      </DsfrFieldset>

      <DsfrFieldset legend="Options de synchronisation" class="fr-mt-4w">
        <DsfrInputGroup>
          <DsfrSelect
            label="Mode de synchronisation"
            v-model="localConfig.syncMode"
            :options="[
              { text: 'Ajouter uniquement (add)', value: 'add' },
              { text: 'Mettre à jour uniquement (update)', value: 'update' },
              { text: 'Ajouter et mettre à jour (upsert)', value: 'upsert' }
            ]"
            hint="Choisissez comment synchroniser les données avec Grist"
          />
        </DsfrInputGroup>

        <DsfrInputGroup v-if="localConfig.syncMode === 'update' || localConfig.syncMode === 'upsert'">
          <DsfrInput
            label="Colonne unique (uniqueKey)"
            v-model="localConfig.uniqueKey"
            placeholder="api_id"
            hint="Nom de la colonne utilisée pour identifier les enregistrements existants (ex: api_id, Email, ID)"
          />
        </DsfrInputGroup>

        <DsfrCheckbox
          v-model="localConfig.autoCreateColumns"
          label="Créer automatiquement les colonnes manquantes"
          hint="Si activé, les colonnes manquantes dans Grist seront créées automatiquement"
        />

        <div class="fr-mt-2w">
          <DsfrCallout title="ℹ️ À propos des modes de synchronisation" type="info">
            <ul class="fr-text--sm">
              <li><strong>Ajouter uniquement (add) :</strong> Ajoute uniquement de nouveaux enregistrements. Les enregistrements existants ne sont pas modifiés.</li>
              <li><strong>Mettre à jour uniquement (update) :</strong> Met à jour uniquement les enregistrements existants basés sur la clé unique. Ne crée pas de nouveaux enregistrements.</li>
              <li><strong>Ajouter et mettre à jour (upsert) :</strong> Ajoute les nouveaux enregistrements ET met à jour les existants. Nécessite une colonne unique.</li>
            </ul>
          </DsfrCallout>
        </div>
      </DsfrFieldset>

      <div class="fr-mt-4w">
        <DsfrFieldset legend="Test de connexion">
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
        </DsfrFieldset>
      </div>

      <div class="fr-mt-4w">
        <DsfrCallout title="📖 Comment trouver ces informations ?">
          <ul class="fr-text--sm">
            <li>
              <strong>Document ID :</strong> Ouvrez votre document Grist, l'ID se trouve dans l'URL 
              (ex: <code class="fr-code">https://docs.getgrist.com/doc/<strong>YOUR_DOC_ID</strong></code>)
            </li>
            <li>
              <strong>Table ID :</strong> Le nom de votre table visible dans la barre latérale gauche de Grist
            </li>
            <li>
              <strong>Token API :</strong> Créez un token dans les paramètres de votre profil Grist 
              (requis pour les documents privés)
            </li>
            <li>
              <strong>Colonne unique :</strong> Une colonne dans votre table Grist qui contient des valeurs uniques 
              pour identifier chaque enregistrement (ex: api_id, Email, ID)
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

.input-with-badge {
  position: relative;
}

.auto-detected-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.75rem;
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
