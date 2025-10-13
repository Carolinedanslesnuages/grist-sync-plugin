<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { GristConfig } from '../../config';
import { GristClient, parseGristUrl, isValidGristUrl } from '../../utils/grist';


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
        Étape 3 : Configuration Grist
      </h2>
      <p class="fr-text">
        Configurez la destination des données dans votre document Grist.
      </p>
    </div>

    <div class="step-content">
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
