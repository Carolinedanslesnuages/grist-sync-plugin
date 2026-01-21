<script setup lang="ts">
import { ref, computed } from 'vue';
import MappingTable from './MappingTable.vue';
import type { FieldMapping } from '../utils/mapping';
import { transformRecords, getValidMappings } from '../utils/mapping';
import { GristClient } from '../utils/grist';
import { defaultConfig } from '../config';
import type { GristConfig } from '../config';
import { analyzeError, formatErrorShort } from '../utils/errorHandler';
import type { ErrorInfo } from '../utils/errorHandler';



const backendUrl = ref('');
const isLoading = ref(false);
const authToken = ref('');
const statusMessage = ref('');
const statusType = ref<'success' | 'error' | 'info'>('info');

const apiData = ref<any[]>([]);
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

async function fetchApiData() {
  if (!backendUrl.value) {
    showStatus('⚠️ Veuillez saisir l\'URL du backend', 'error');
    return;
  }
  
  isLoading.value = true;
  statusMessage.value = '';
  lastError.value = null;
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (authToken.value) {
      headers['x-api-key'] = authToken.value;
    }
    
    const response = await fetch(backendUrl.value, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      console.log('Données API récupérées:', data);
      apiData.value = data;
    } else if (data.data && Array.isArray(data.data)) {
      apiData.value = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      apiData.value = data.results;
    } else if (data.items && Array.isArray(data.items)) {
      apiData.value = data.items;
    } else {
      apiData.value = [data];
    }
    
    if (apiData.value.length > 0) {
      console.log('Données API récupérées:', apiData.value);
      sampleRecord.value = apiData.value[0];
      showStatus(`✅ ${apiData.value.length} enregistrement(s) récupéré(s) avec succès`, 'success');
    } else {
      showStatus('⚠️ Aucune donnée trouvée dans la réponse de l\'API', 'error');
    }
  } catch (error) {
    const errorInfo = analyzeError(error, 'api_fetch');
    lastError.value = errorInfo;
    
    const shortMessage = formatErrorShort(errorInfo);
    showStatus(`❌ ${shortMessage}`, 'error');
    
    apiData.value = [];
    sampleRecord.value = undefined;
    
    console.error('Erreur détaillée:', errorInfo);
  } finally {
    isLoading.value = false;
  }
}


async function syncToGrist() {
  if (apiData.value.length === 0) {
    showStatus('⚠️ Aucune donnée à synchroniser. Récupérez d\'abord les données de l\'API.', 'error');
    return;
  }
  
  const validMappings = getValidMappings(mappings.value);
  
  if (validMappings.length === 0) {
    showStatus('⚠️ Veuillez définir au moins un mapping valide', 'error');
    return;
  }
  
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
  
  try {
    const transformedData = transformRecords(apiData.value, validMappings);
    
    if (transformedData.length === 0) {
      showStatus('⚠️ Aucune donnée après transformation', 'error');
      return;
    }
    
    const client = new GristClient(gristConfig.value);
    const result = await client.addRecords(transformedData);
    
    showStatus(
      `✅ ${result.records.length} enregistrement(s) synchronisé(s) avec succès vers Grist!`,
      'success'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    showStatus(`❌ Erreur lors de la synchronisation: ${message}`, 'error');
  } finally {
    isLoading.value = false;
  }
}


async function testGristConnection() {
  if (!gristConfig.value.docId || gristConfig.value.docId === 'YOUR_DOC_ID') {
    showStatus('⚠️ Veuillez configurer votre Document ID Grist', 'error');
    return;
  }
  
  if (!gristConfig.value.tableId || gristConfig.value.tableId === 'YOUR_TABLE_ID') {
    showStatus('⚠️ Veuillez configurer votre Table ID Grist', 'error');
    return;
  }
  
  isLoading.value = true;
  lastError.value = null;
  
  try {
    const client = new GristClient(gristConfig.value);
    const isConnected = await client.testConnection();
    
    if (isConnected) {
      showStatus('✅ Connexion à Grist réussie!', 'success');
    } else {
      showStatus('❌ Impossible de se connecter à Grist. Vérifiez votre configuration.', 'error');
    }
  } catch (error) {
    const errorInfo = analyzeError(error, 'grist_sync');
    lastError.value = errorInfo;
    
    const shortMessage = formatErrorShort(errorInfo);
    showStatus(`❌ ${shortMessage}`, 'error');
    
    console.error('Erreur détaillée:', errorInfo);
  } finally {
    isLoading.value = false;
  }
}

const recordCount = computed(() => apiData.value.length);

const validMappingsCount = computed(() => getValidMappings(mappings.value).length);
</script>

<template>
  <div class="fr-container">
    <h1 level="1">API vers Grist - Synchronisation</h1>
    <p class="fr-mb-4w">
      Synchronisez facilement vos données API vers Grist avec un mapping visuel
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
        icon="ri-plug-line"
        primary
        :loading="isLoading"
        @click="testGristConnection"
        label="Tester la connexion Grist"
      />
    </DsfrFieldset>

    <DsfrFieldset legend="Source de données (Backend)">
      <DsfrInput
        label="URL du backend *"
        v-model="backendUrl"
        type="url"
        placeholder="https://backend.example.com/api/data"
        @keyup.enter="fetchApiData"
        hint="L'URL du backend qui fournit les données. Le backend gère l'authentification de manière sécurisée."
      />
      <DsfrButton
        class="fr-m-4v"
        primary
        icon="ri-download-line"
        :loading="isLoading"
        @click="fetchApiData"
        label="Récupérer les données"
      />
      <DsfrBadge v-if="recordCount > 0" type="info">
        {{ recordCount }} enregistrement(s) chargé(s)
      </DsfrBadge>
      
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
                :id="`technical-details-api-${Date.now()}`"
                class="fr-mt-2w"
              >
                <pre class="fr-text--xs fr-mt-1w fr-code" style="overflow-x: auto;">{{ lastError.technicalDetails }}</pre>
              </DsfrAccordion>
            </div>
          </template>
        </DsfrAlert>
      </div>
    </DsfrFieldset>

    <DsfrFieldset legend="Aperçu des données" v-if="apiData.length > 0">
      <DsfrNotice
        title="Données récupérées avec succès"
        :closeable="false"
      >
        {{ recordCount }}  enregistrement(s) disponible(s) pour la synchronisation lklkdmfsdk
      </DsfrNotice>
      
      <div v-if="sampleRecord" class="fr-mt-2w">
        <p class="fr-text--bold">Exemple de données (premier enregistrement) :</p>
        <div class="fr-table fr-table--bordered">
          <table>
            <thead>
              <tr>
                <th scope="col">Champ</th>
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

    <DsfrFieldset legend="Mapping colonne Grist / champ API" v-if="apiData.length > 0">
      <MappingTable v-model="mappings" :sample-data="sampleRecord" />
      <DsfrBadge v-if="validMappingsCount > 0" type="success">
        {{ validMappingsCount }} mapping(s) valide(s) configuré(s)
      </DsfrBadge>
    </DsfrFieldset>

    <DsfrAlert
      v-if="statusMessage"
      :type="statusType"
      :title="statusType === 'success' ? 'Succès' : statusType === 'error' ? 'Erreur' : 'Info'"
      :description="statusMessage"
      :small="true"
    />

    <div class="fr-mt-4w" v-if="apiData.length > 0">
      <DsfrButton
        icon="ri-upload-cloud-line"
        :loading="isLoading"
        :disabled="validMappingsCount === 0"
        @click="syncToGrist"
        label="Synchroniser vers Grist"
      />
      <p class="fr-text">
        Cette action va insérer {{ recordCount }} enregistrement(s) dans votre table Grist
      </p>
    </div>
  </div>
</template>
