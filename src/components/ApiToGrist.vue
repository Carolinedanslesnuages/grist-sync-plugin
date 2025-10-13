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


/**
 * Composant principal ApiToGrist
 * 
 * Permet de synchroniser des données depuis n'importe quelle API vers Grist
 * 
 * REFACTORED: L'authentification est maintenant gérée par le backend.
 * Le plugin ne demande plus de token à l'utilisateur, il utilise uniquement
 * l'URL du backend qui s'occupe de l'authentification de manière sécurisée.
 */

// État du formulaire
const backendUrl = ref(''); // REFACTORED: Renommé de apiUrl vers backendUrl pour plus de clarté
const isLoading = ref(false);
const statusMessage = ref('');
const statusType = ref<'success' | 'error' | 'info'>('info');

// Données de l'API
const apiData = ref<any[]>([]);
const sampleRecord = ref<Record<string, any> | undefined>(undefined);

// Configuration du mapping
const mappings = ref<FieldMapping[]>([
  { gristColumn: '', apiField: '' }
]);

// Configuration Grist (éditable)
const gristConfig = ref<GristConfig>({ ...defaultConfig });

// Dernière erreur détaillée
const lastError = ref<ErrorInfo | null>(null);

/**
 * Affiche un message de statut
 */
function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
  statusMessage.value = message;
  statusType.value = type;
  setTimeout(() => {
    if (statusMessage.value === message) {
      statusMessage.value = '';
    }
  }, 5000);
}

/**
 * Récupère les données depuis le backend
 * 
 * REFACTORED: L'authentification avec l'API externe est désormais gérée par le backend.
 * Le plugin fait simplement une requête GET au backend qui retourne les données.
 * Aucun token n'est envoyé depuis le frontend.
 */
async function fetchApiData() {
  if (!backendUrl.value) {
    showStatus('⚠️ Veuillez saisir l\'URL du backend', 'error');
    return;
  }
  
  isLoading.value = true;
  statusMessage.value = '';
  lastError.value = null;
  
  try {
    // REFACTORED: Requête simple sans authentification - le backend gère tout
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(backendUrl.value, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Détecte si c'est un tableau ou un objet avec des données
    if (Array.isArray(data)) {
      apiData.value = data;
    } else if (data.data && Array.isArray(data.data)) {
      apiData.value = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      apiData.value = data.results;
    } else if (data.items && Array.isArray(data.items)) {
      apiData.value = data.items;
    } else {
      // Si ce n'est pas un tableau, on l'enveloppe
      apiData.value = [data];
    }
    
    if (apiData.value.length > 0) {
      sampleRecord.value = apiData.value[0];
      showStatus(`✅ ${apiData.value.length} enregistrement(s) récupéré(s) avec succès`, 'success');
    } else {
      showStatus('⚠️ Aucune donnée trouvée dans la réponse de l\'API', 'error');
    }
  } catch (error) {
    // Analyse détaillée de l'erreur
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

/**
 * Synchronise les données vers Grist
 */
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
    // Transforme les données selon le mapping
    const transformedData = transformRecords(apiData.value, validMappings);
    
    if (transformedData.length === 0) {
      showStatus('⚠️ Aucune donnée après transformation', 'error');
      return;
    }
    
    // Insère dans Grist
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

/**
 * Teste la connexion à Grist
 */
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
    // Analyse détaillée de l'erreur
    const errorInfo = analyzeError(error, 'grist_sync');
    lastError.value = errorInfo;
    
    const shortMessage = formatErrorShort(errorInfo);
    showStatus(`❌ ${shortMessage}`, 'error');
    
    console.error('Erreur détaillée:', errorInfo);
  } finally {
    isLoading.value = false;
  }
}

// Nombre total d'enregistrements
const recordCount = computed(() => apiData.value.length);

// Nombre de mappings valides
const validMappingsCount = computed(() => getValidMappings(mappings.value).length);
</script>

<template>
  <div class="fr-container">
    <h1 level="1">API vers Grist - Synchronisation</h1>
    <p class="fr-mb-4w">
      Synchronisez facilement vos données API vers Grist avec un mapping visuel
    </p>

    <!-- Section Configuration Grist -->
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

    <!-- Section API Source -->
    <!-- REFACTORED: Suppression du champ Token API - l'authentification est gérée par le backend -->
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
      
      <!-- Detailed Error Display -->
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

    <!-- Section Aperçu des données récupérées -->
    <!-- REFACTORED: Affichage des données dans un format lisible avec les styles DSFR -->
    <DsfrFieldset legend="Aperçu des données" v-if="apiData.length > 0">
      <DsfrNotice
        title="Données récupérées avec succès"
        :closeable="false"
      >
        {{ recordCount }} enregistrement(s) disponible(s) pour la synchronisation
      </DsfrNotice>
      
      <!-- Affichage du premier enregistrement comme exemple -->
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

    <!-- Section Mapping -->
    <DsfrFieldset legend="Mapping colonne Grist / champ API" v-if="apiData.length > 0">
      <MappingTable v-model="mappings" :sample-data="sampleRecord" />
      <DsfrBadge v-if="validMappingsCount > 0" type="success">
        {{ validMappingsCount }} mapping(s) valide(s) configuré(s)
      </DsfrBadge>
    </DsfrFieldset>

    <!-- Message de statut -->
    <DsfrAlert
      v-if="statusMessage"
      :type="statusType"
      :title="statusType === 'success' ? 'Succès' : statusType === 'error' ? 'Erreur' : 'Info'"
      :description="statusMessage"
      :small="true"
    />

    <!-- Bouton de synchronisation -->
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
