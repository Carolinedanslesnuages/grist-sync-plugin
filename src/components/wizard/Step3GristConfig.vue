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
const isLoading = computed(() => props.isLoading);
const connectionTested = ref(false);
const documentUrlInput = ref('');
const urlParseError = ref('');
const apiTokenValidation = ref<{ valid: boolean; message: string; needsAuth: boolean } | null>(null);
const applyingProps = ref(false);

// Synchronisation avec le parent - appliquée de façon défensive pour éviter les boucles
watch(() => props.config, (newConfig) => {
  // Indique qu'on applique une mise à jour venue du parent
  applyingProps.value = true;
  localConfig.value = { ...newConfig };
  // Clear the flag in a microtask to avoid race conditions with the local watcher
  Promise.resolve().then(() => {
    applyingProps.value = false;
  });
}, { deep: true });

/**
 * Valide si tous les champs requis sont remplis
 * Note: gristApiUrl is optional for public docs — require only docId + tableId
 */
const isConfigValid = computed(() => {
  return (
    !!localConfig.value.docId &&
    localConfig.value.docId !== 'YOUR_DOC_ID' &&
    !!localConfig.value.tableId &&
    localConfig.value.tableId !== 'YOUR_TABLE_ID'
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

  // If the input looks like a simple docId (no protocol), accept it directly
  if (!documentUrlInput.value.includes('://')) {
    localConfig.value.docId = documentUrlInput.value.trim();
    emit('status', '✓ Document ID configuré', 'info');
    return;
  }

  // Try the existing parser first (handles https://docs.getgrist.com/doc/...)
  if (isValidGristUrl(documentUrlInput.value)) {
    const parsed = parseGristUrl(documentUrlInput.value);
    if (parsed.docId) {
      localConfig.value.docId = parsed.docId;
    }
    if (parsed.gristApiUrl) {
      localConfig.value.gristApiUrl = parsed.gristApiUrl;
    }
    // If parseGristUrl returns a tableId, use it; otherwise we'll try fallback parsing below
    if ((parsed as any).tableId) {
      localConfig.value.tableId = (parsed as any).tableId;
    }

    emit('status', '✅ URL Grist analysée avec succès', 'success');
    connectionTested.value = false;
    apiTokenValidation.value = null;
    return;
  }

  // Fallback: handle local Grist instances which may expose URLs like:
  // http://localhost:8484/<docId>/Untitled-document/p/<tableId>
  // or variants without '/doc/' in the path. We'll try to extract docId and tableId
  try {
    const url = new URL(documentUrlInput.value);
    // Split path segments and filter empties
    const segments = url.pathname.split('/').filter(Boolean);

    // Possible patterns:
    // - /doc/<docId>/.../p/<tableId>
    // - /<docId>/.../p/<tableId>
    // We'll search for a 'p' segment and take the next segment as tableId.
    const pIndex = segments.findIndex((s) => s === 'p');
    let extractedDocId: string | undefined;
    let extractedTableId: string | undefined;

    if (pIndex !== -1 && segments.length > pIndex + 1) {
      extractedTableId = segments[pIndex + 1];
      // docId is often the segment right before the human-readable name; try several heuristics
      // If path starts with 'doc', docId is the next segment
      if (segments[0] === 'doc' && segments.length > 1) {
        extractedDocId = segments[1];
      } else if (segments.length >= 1) {
        // If first segment looks like an ID (alphanumeric, length ~ 10+), take it
        const candidate = segments[0];
        if (/^[A-Za-z0-9_-]{6,}$/.test(candidate)) {
          extractedDocId = candidate;
        } else {
          // Otherwise try to find a segment that looks like an ID elsewhere (common heuristic)
          const idCandidate = segments.find((seg) => /^[A-Za-z0-9_-]{6,}$/.test(seg));
          if (idCandidate) extractedDocId = idCandidate;
        }
      }
    } else {
      // If no 'p' segment, attempt to find a docId-like segment and hope for a default table
      const idCandidate = segments.find((seg) => /^[A-Za-z0-9_-]{6,}$/.test(seg));
      if (idCandidate) extractedDocId = idCandidate;
    }

    if (extractedDocId) {
      localConfig.value.docId = extractedDocId;
    }
    if (extractedTableId) {
      localConfig.value.tableId = extractedTableId;
    }

    if (extractedDocId || extractedTableId) {
      emit('status', `✅ URL Grist locale analysée (${extractedDocId ?? 'doc?'} / ${extractedTableId ?? 'table?'})`, 'success');
      connectionTested.value = false;
      apiTokenValidation.value = null;
      return;
    }

    // If we reach here, fallback failed
    urlParseError.value = 'Impossible d\'extraire le Document ID ou le Table ID depuis l\'URL fournie.';
    emit('status', '❌ URL Grist non reconnue', 'error');
  } catch (err) {
    urlParseError.value = 'URL invalide. Assurez-vous d\'inclure le protocole (ex: http://)';
    emit('status', '❌ URL Grist invalide', 'error');
  }
}

/**
 * Teste la connexion à Grist et valide le token API
 */
async function testGristConnection() {
  console.log('testGristConnection invoked', { docId: localConfig.value.docId, tableId: localConfig.value.tableId, gristApiUrl: localConfig.value.gristApiUrl, documentUrlInput: documentUrlInput.value });

  if (!localConfig.value.docId || localConfig.value.docId === 'YOUR_DOC_ID') {
    emit('status', '⚠️ Veuillez configurer votre Document ID Grist', 'error');
    return;
  }

  // If the API base URL is not provided, try to infer it from the pasted document URL or fall back to localhost
  if (!localConfig.value.gristApiUrl || localConfig.value.gristApiUrl.trim() === '') {
    try {
      if (documentUrlInput.value && documentUrlInput.value.includes('://')) {
        localConfig.value.gristApiUrl = new URL(documentUrlInput.value).origin;
        emit('status', `ℹ️ URL API Grist devinée : ${localConfig.value.gristApiUrl}`, 'info');
      } else {
        // No document URL available: assume local Grist on default port
        localConfig.value.gristApiUrl = 'http://localhost:8484';
        emit('status', `ℹ️ URL API Grist par défaut utilisée : ${localConfig.value.gristApiUrl}`, 'info');
      }
    } catch (err) {
      // If inference fails, do not block — let the client attempt with whatever we have
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

    // Valider le token API si présent
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

// Marque la connexion comme non testée quand la config locale change
// Émet vers le parent uniquement si la modification n'est pas la conséquence
// d'une mise à jour parentale (évite la boucle recursive updates)
watch(localConfig, (newVal) => {
  connectionTested.value = false;
  apiTokenValidation.value = null;

  if (applyingProps.value) {
    // La modification vient du parent — ne pas ré-émettre
    return;
  }

  // Émettre la mise à jour vers le parent uniquement si différent
  try {
    const parentJson = JSON.stringify(props.config || {});
    const localJson = JSON.stringify(newVal || {});
    if (parentJson !== localJson) {
      // Différence détectée : émettre de façon asynchrone pour casser les boucles synchrones
      Promise.resolve().then(() => emit('update:config', newVal));
    }
  } catch (err) {
    // Si sérialisation échoue (références circulaires), log l'erreur et émettre quand même mais différé
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

      <!-- Instructions -->
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
