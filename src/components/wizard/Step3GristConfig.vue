<script setup lang="ts">
import { ref, watch } from 'vue';
import type { GristConfig } from '../../config';
import { GristClient } from '../../utils/grist';

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
  (e: 'complete', config: GristConfig): void;
  (e: 'back'): void;
  (e: 'status', message: string, type: 'success' | 'error' | 'info'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localConfig = ref<GristConfig>({ ...props.config });
const connectionTested = ref(false);

// Synchronisation avec le parent
watch(() => props.config, (newConfig) => {
  localConfig.value = { ...newConfig };
}, { deep: true });

/**
 * Teste la connexion à Grist
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

/**
 * Valide et continue
 */
function validateAndContinue() {
  // Allow bypassing connection test if config is valid
  if (!localConfig.value.docId || localConfig.value.docId === 'YOUR_DOC_ID') {
    emit('status', '⚠️ Veuillez configurer votre Document ID Grist', 'error');
    return;
  }
  
  if (!localConfig.value.tableId || localConfig.value.tableId === 'YOUR_TABLE_ID') {
    emit('status', '⚠️ Veuillez configurer votre Table ID Grist', 'error');
    return;
  }
  
  if (!connectionTested.value) {
    emit('status', '⚠️ Recommandé: Testez la connexion avant de continuer', 'info');
  }
  
  emit('update:config', localConfig.value);
  emit('complete', localConfig.value);
}

// Marque la connexion comme non testée quand la config change
watch(localConfig, () => {
  connectionTested.value = false;
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
            label="Token API Grist (optionnel)"
            v-model="localConfig.apiTokenGrist"
            type="password"
            placeholder="Votre token Grist (si nécessaire)"
            hint="Requis uniquement pour les documents privés"
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

        <div class="fr-mt-4w">
          <DsfrButton
            label="Tester la connexion"
            icon="ri-plug-line"
            :loading="isLoading"
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

      <!-- Actions -->
      <div class="step-actions fr-mt-4w">
        <DsfrButton
          label="Retour"
          secondary
          icon="ri-arrow-left-line"
          @click="emit('back')"
        />
        <DsfrButton
          label="Continuer"
          icon="ri-arrow-right-line"
          icon-right
          :disabled="!localConfig.docId || localConfig.docId === 'YOUR_DOC_ID' || !localConfig.tableId || localConfig.tableId === 'YOUR_TABLE_ID'"
          @click="validateAndContinue"
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

.step-content {
  max-width: 800px;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e5e5;
}

code {
  background: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

@media (max-width: 768px) {
  .step-actions {
    flex-direction: column;
  }
}
</style>
