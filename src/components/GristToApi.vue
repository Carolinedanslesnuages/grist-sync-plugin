<script setup lang="ts">
import { ref, computed } from 'vue';
import MappingTable from './MappingTable.vue';
import type { FieldMapping } from '../utils/mapping';
import { transformGristRecordsToApi, getValidMappings } from '../utils/mapping';
import { GristClient } from '../utils/grist';
import type { GristRecord } from '../utils/grist';
import { BackendClient } from '../utils/backendClient';
import type { BackendAuthOptions } from '../utils/backendClient';
import { defaultConfig } from '../config';
import type { GristConfig } from '../config';
import { analyzeError, formatErrorShort } from '../utils/errorHandler';
import type { ErrorInfo } from '../utils/errorHandler';

const backendUrl = ref('');
const backendEndpoint = ref('/records');
const isLoading = ref(false);
const statusMessage = ref('');
const statusType = ref<'success' | 'error' | 'info'>('info');

// Auth configuration
const authType = ref<'none' | 'bearer' | 'api-key' | 'custom'>('none');
const bearerToken = ref('');
const apiKeyHeader = ref('x-api-key');
const apiKeyValue = ref('');

const gristData = ref<GristRecord[]>([]);
const sampleRecord = ref<Record<string, any> | undefined>(undefined);

const mappings = ref<FieldMapping[]>([
  { gristColumn: '', apiField: '' }
]);

const gristConfig = ref<GristConfig>({ ...defaultConfig });

const lastError = ref<ErrorInfo | null>(null);

function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
  statusMessage.value = message;
  statusType.value = type;
  setTimeout(() => {
    if (statusMessage.value === message) {
      statusMessage.value = '';
    }
  }, 5000);
}

async function fetchGristData() {
  if (!gristConfig.value.docId || gristConfig.value.docId === 'YOUR_DOC_ID') {
    showStatus('⚠️ Veuillez configurer votre Document ID Grist', 'error');
    return;
  }
  
  if (!gristConfig.value.tableId || gristConfig.value.tableId === 'YOUR_TABLE_ID') {
    showStatus('⚠️ Veuillez configurer votre Table ID Grist', 'error');
    return;
  }
  
  isLoading.value = true;
  statusMessage.value = '';
  lastError.value = null;
  
  try {
    const client = new GristClient(gristConfig.value);
    const records = await client.getRecords();
    
    if (records.length > 0) {
      // Les enregistrements Grist ont la structure { id: number, fields: Record<string, any> }
      gristData.value = records;
      
      // Pour l'aperçu, on prend le premier enregistrement
      if (records[0] && records[0].fields) {
        sampleRecord.value = records[0].fields;
      }
      
      showStatus(`✅ ${records.length} enregistrement(s) récupéré(s) avec succès depuis Grist`, 'success');
    } else {
      showStatus('⚠️ Aucune donnée trouvée dans la table Grist', 'error');
      gristData.value = [];
      sampleRecord.value = undefined;
    }
  } catch (error) {
    const errorInfo = analyzeError(error, 'grist_sync');
    lastError.value = errorInfo;
    
    const shortMessage = formatErrorShort(errorInfo);
    showStatus(`❌ ${shortMessage}`, 'error');
    
    gristData.value = [];
    sampleRecord.value = undefined;
    
    console.error('Erreur détaillée:', errorInfo);
  } finally {
    isLoading.value = false;
  }
}

async function syncToBackend() {
  if (gristData.value.length === 0) {
    showStatus('⚠️ Aucune donnée à synchroniser. Récupérez d\'abord les données de Grist.', 'error');
    return;
  }
  
  const validMappings = getValidMappings(mappings.value);
  
  if (validMappings.length === 0) {
    showStatus('⚠️ Veuillez définir au moins un mapping valide', 'error');
    return;
  }
  
  if (!backendUrl.value) {
    showStatus('⚠️ Veuillez saisir l\'URL du backend', 'error');
    return;
  }
  
  isLoading.value = true;
  statusMessage.value = '';
  lastError.value = null;
  
  try {
    // Extrait les champs de chaque enregistrement Grist
    const gristRecords = gristData.value.map(record => record.fields);
    
    // Transforme les données Grist en format API
    const transformedData = transformGristRecordsToApi(gristRecords, validMappings);
    
    if (transformedData.length === 0) {
      showStatus('⚠️ Aucune donnée après transformation', 'error');
      return;
    }
    
    // Construit les options d'authentification
    const authOptions: BackendAuthOptions | undefined = authType.value === 'none' ? undefined : {
      type: authType.value,
      bearerToken: authType.value === 'bearer' ? bearerToken.value : undefined,
      apiKey: authType.value === 'api-key' ? {
        headerName: apiKeyHeader.value,
        value: apiKeyValue.value
      } : undefined
    };
    
    // Crée le client backend
    const client = new BackendClient({
      baseUrl: backendUrl.value,
      auth: authOptions
    });
    
    // Envoie les données au backend
    const response = await client.postRecords(backendEndpoint.value, transformedData);
    
    showStatus(
      `✅ ${transformedData.length} enregistrement(s) synchronisé(s) avec succès vers le backend!`,
      'success'
    );
    
    console.log('Réponse du backend:', response);
  } catch (error) {
    const errorInfo = analyzeError(error, 'api_send');
    lastError.value = errorInfo;
    
    const shortMessage = formatErrorShort(errorInfo);
    showStatus(`❌ ${shortMessage}`, 'error');
    
    console.error('Erreur détaillée:', errorInfo);
  } finally {
    isLoading.value = false;
  }
}

async function testBackendConnection() {
  if (!backendUrl.value) {
    showStatus('⚠️ Veuillez saisir l\'URL du backend', 'error');
    return;
  }
  
  isLoading.value = true;
  lastError.value = null;
  
  try {
    // Construit les options d'authentification
    const authOptions: BackendAuthOptions | undefined = authType.value === 'none' ? undefined : {
      type: authType.value,
      bearerToken: authType.value === 'bearer' ? bearerToken.value : undefined,
      apiKey: authType.value === 'api-key' ? {
        headerName: apiKeyHeader.value,
        value: apiKeyValue.value
      } : undefined
    };
    
    const client = new BackendClient({
      baseUrl: backendUrl.value,
      auth: authOptions
    });
    
    const isConnected = await client.testConnection();
    
    if (isConnected) {
      showStatus('✅ Connexion au backend réussie!', 'success');
    } else {
      showStatus('❌ Impossible de se connecter au backend. Vérifiez votre configuration.', 'error');
    }
  } catch (error) {
    const errorInfo = analyzeError(error, 'api_send');
    lastError.value = errorInfo;
    
    const shortMessage = formatErrorShort(errorInfo);
    showStatus(`❌ ${shortMessage}`, 'error');
    
    console.error('Erreur détaillée:', errorInfo);
  } finally {
    isLoading.value = false;
  }
}

const recordCount = computed(() => gristData.value.length);
const validMappingsCount = computed(() => getValidMappings(mappings.value).length);
</script>

<template>
  <div class="fr-container">
    <h1 level="1">Grist vers API - Synchronisation</h1>
    <p class="fr-mb-4w">
      Envoyez vos données Grist vers une API externe avec un mapping visuel
    </p>

    <DsfrFieldset legend="Configuration Grist">
      <DsfrInput
        label="Document ID *"
        v-model="gristConfig.docId"
        placeholder="Votre ID de document Grist"
      />
      <DsfrInput
        label="Table ID *"
        v-model="gristConfig.tableId"
        placeholder="Votre ID de table Grist"
      />
      <DsfrInput
        label="Token API Grist (optionnel)"
        v-model="gristConfig.apiTokenGrist"
        type="password"
        placeholder="Votre token Grist (si nécessaire)"
      />
      <DsfrInput
        label="URL API Grist"
        v-model="gristConfig.gristApiUrl"
        placeholder="https://docs.getgrist.com"
      />
      <DsfrButton
        class="fr-m-4v"
        icon="ri-download-line"
        primary
        :loading="isLoading"
        @click="fetchGristData"
        label="Récupérer les données de Grist"
      />
      <DsfrBadge v-if="recordCount > 0" type="info">
        {{ recordCount }} enregistrement(s) chargé(s)
      </DsfrBadge>
    </DsfrFieldset>

    <DsfrFieldset legend="Aperçu des données Grist" v-if="gristData.length > 0">
      <DsfrNotice
        title="Données récupérées avec succès"
        :closeable="false"
      >
        {{ recordCount }} enregistrement(s) disponible(s) pour la synchronisation
      </DsfrNotice>
      
      <div v-if="sampleRecord" class="fr-mt-2w">
        <p class="fr-text--bold">Exemple de données (premier enregistrement) :</p>
        <div class="fr-table fr-table--bordered">
          <table>
            <thead>
              <tr>
                <th scope="col">Colonne Grist</th>
                <th scope="col">Valeur</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(value, key) in sampleRecord" :key="String(key)">
                <td class="fr-text--bold">{{ key }}</td>
                <td>{{ typeof value === 'object' ? JSON.stringify(value) : value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DsfrFieldset>

    <DsfrFieldset legend="Mapping colonne Grist / champ API" v-if="gristData.length > 0">
      <MappingTable v-model="mappings" :sample-data="sampleRecord" :reverse-mode="true" />
      <DsfrBadge v-if="validMappingsCount > 0" type="success">
        {{ validMappingsCount }} mapping(s) valide(s) configuré(s)
      </DsfrBadge>
    </DsfrFieldset>

    <DsfrFieldset legend="Destination (Backend API)" v-if="gristData.length > 0">
      <DsfrInput
        label="URL du backend *"
        v-model="backendUrl"
        type="url"
        placeholder="https://api.example.com"
        hint="L'URL de base de votre API backend"
      />
      <DsfrInput
        label="Endpoint *"
        v-model="backendEndpoint"
        placeholder="/records"
        hint="Le chemin de l'endpoint pour recevoir les données (ex: /users, /records)"
      />
      
      <DsfrSelect
        label="Type d'authentification"
        v-model="authType"
        :options="[
          { value: 'none', text: 'Aucune' },
          { value: 'bearer', text: 'Bearer Token' },
          { value: 'api-key', text: 'API Key' }
        ]"
      />
      
      <DsfrInput
        v-if="authType === 'bearer'"
        label="Bearer Token"
        v-model="bearerToken"
        type="password"
        placeholder="Votre token Bearer"
      />
      
      <div v-if="authType === 'api-key'">
        <DsfrInput
          label="Nom du header"
          v-model="apiKeyHeader"
          placeholder="x-api-key"
        />
        <DsfrInput
          label="Valeur de l'API Key"
          v-model="apiKeyValue"
          type="password"
          placeholder="Votre clé API"
        />
      </div>
      
      <DsfrButton
        class="fr-m-4v"
        icon="ri-plug-line"
        secondary
        :loading="isLoading"
        @click="testBackendConnection"
        label="Tester la connexion Backend"
      />
      
      <div v-if="lastError" class="fr-mt-4w">
        <DsfrAlert
          type="error"
          :title="lastError.title"
          :description="lastError.message"
        >
          <template #default>
            <div class="error-details">
              <p class="fr-text--sm"><strong>📋 Explication :</strong></p>
              <p class="fr-text--sm">{{ lastError.explanation }}</p>
              
              <p class="fr-text--sm fr-mt-2w"><strong>💡 Solutions recommandées :</strong></p>
              <ul class="fr-text--sm">
                <li v-for="(solution, idx) in lastError.solutions" :key="idx">{{ solution }}</li>
              </ul>
              
              <DsfrAccordion
                v-if="lastError.technicalDetails"
                title="🔧 Détails techniques"
                :id="`technical-details-backend-${Date.now()}`"
                class="fr-mt-2w"
              >
                <pre class="fr-text--xs fr-mt-1w fr-code" style="overflow-x: auto;">{{ lastError.technicalDetails }}</pre>
              </DsfrAccordion>
            </div>
          </template>
        </DsfrAlert>
      </div>
    </DsfrFieldset>

    <DsfrAlert
      v-if="statusMessage"
      :type="statusType"
      :title="statusType === 'success' ? 'Succès' : statusType === 'error' ? 'Erreur' : 'Info'"
      :description="statusMessage"
      :small="true"
    />

    <div class="fr-mt-4w" v-if="gristData.length > 0">
      <DsfrButton
        icon="ri-upload-cloud-line"
        :loading="isLoading"
        :disabled="validMappingsCount === 0"
        @click="syncToBackend"
        label="Synchroniser vers le Backend"
      />
      <p class="fr-text">
        Cette action va envoyer {{ recordCount }} enregistrement(s) à votre API backend
      </p>
    </div>
  </div>
</template>
