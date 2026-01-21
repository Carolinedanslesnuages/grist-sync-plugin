#!/usr/bin/env python3
"""
Script de synchronisation quotidienne : API vers Grist
Architecture multi-bureaux avec méthode Upsert

Ce script récupère les données d'une API source et les distribue
vers plusieurs documents Grist (un par bureau/ville).
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import requests

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sync.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class GristSyncConfig:
    """Configuration pour la synchronisation multi-bureaux"""
    
    def __init__(self, config_file: str = 'config.json'):
        """
        Initialise la configuration depuis un fichier JSON
        
        Args:
            config_file: Chemin vers le fichier de configuration
        """
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        self.api_source_url = config['api_source']['url']
        self.api_source_headers = config['api_source'].get('headers', {})
        self.api_filter_field = config['api_source'].get('filter_field', 'bureau')
        
        self.grist_server = config['grist']['server']
        self.grist_api_key = config['grist']['api_key']
        
        # Liste des bureaux avec leurs configurations
        self.bureaux = config['bureaux']
        
    def get_bureau_config(self, bureau_name: str) -> Optional[Dict[str, Any]]:
        """Récupère la configuration d'un bureau spécifique"""
        return next((b for b in self.bureaux if b['name'] == bureau_name), None)


class GristAPI:
    """Gestion des appels à l'API Grist"""
    
    def __init__(self, server_url: str, api_key: str):
        """
        Initialise le client API Grist
        
        Args:
            server_url: URL du serveur Grist
            api_key: Clé API Grist
        """
        self.server_url = server_url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def upsert_records(self, doc_id: str, table_id: str, records: List[Dict[str, Any]], 
                       on_many: str = 'none', allow: str = 'all') -> Dict[str, Any]:
        """
        Effectue un upsert (insert ou update) de records dans une table Grist
        
        Args:
            doc_id: ID du document Grist
            table_id: ID de la table dans le document
            records: Liste des enregistrements à insérer/mettre à jour
            on_many: Comportement en cas de multiples correspondances ('none', 'first', 'all')
            allow: Type d'opérations autorisées ('create', 'update', 'all')
            
        Returns:
            Réponse de l'API Grist
        """
        url = f"{self.server_url}/api/docs/{doc_id}/tables/{table_id}/records"
        
        # Construction de la requête avec les paramètres d'upsert
        params = {
            'onMany': on_many,
            'allow': allow
        }
        
        # Les records doivent être au format {"records": [{"require": {}, "fields": {}}]}
        # Pour un upsert simple, on peut utiliser l'endpoint PUT
        payload = {
            'records': [{'fields': record} for record in records]
        }
        
        try:
            response = requests.put(
                url,
                headers=self.headers,
                params=params,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de l'upsert vers Grist: {e}")
            raise
    
    def add_records(self, doc_id: str, table_id: str, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Ajoute des enregistrements dans une table Grist (POST)
        
        Args:
            doc_id: ID du document Grist
            table_id: ID de la table
            records: Liste des enregistrements à ajouter
            
        Returns:
            Réponse de l'API Grist
        """
        url = f"{self.server_url}/api/docs/{doc_id}/tables/{table_id}/records"
        
        payload = {
            'records': [{'fields': record} for record in records]
        }
        
        try:
            response = requests.post(
                url,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de l'ajout vers Grist: {e}")
            raise


class DailySyncJob:
    """Tâche de synchronisation quotidienne"""
    
    def __init__(self, config: GristSyncConfig):
        """
        Initialise la tâche de synchronisation
        
        Args:
            config: Configuration de synchronisation
        """
        self.config = config
        self.grist_api = GristAPI(config.grist_server, config.grist_api_key)
    
    def fetch_api_data(self) -> List[Dict[str, Any]]:
        """
        Récupère les données depuis l'API source
        
        Returns:
            Liste des enregistrements de l'API
        """
        logger.info(f"Récupération des données depuis {self.config.api_source_url}")
        
        try:
            response = requests.get(
                self.config.api_source_url,
                headers=self.config.api_source_headers,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            # Supporter différents formats de réponse
            if isinstance(data, dict):
                if 'data' in data:
                    records = data['data']
                elif 'records' in data:
                    records = data['records']
                elif 'results' in data:
                    records = data['results']
                else:
                    records = [data]
            elif isinstance(data, list):
                records = data
            else:
                raise ValueError(f"Format de réponse API non supporté: {type(data)}")
            
            logger.info(f"✓ {len(records)} enregistrements récupérés")
            return records
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la récupération des données API: {e}")
            raise
    
    def filter_records_by_bureau(self, records: List[Dict[str, Any]], bureau_name: str) -> List[Dict[str, Any]]:
        """
        Filtre les enregistrements pour un bureau spécifique
        
        Args:
            records: Liste complète des enregistrements
            bureau_name: Nom du bureau pour le filtrage
            
        Returns:
            Enregistrements filtrés pour ce bureau
        """
        filter_field = self.config.api_filter_field
        filtered = [r for r in records if r.get(filter_field) == bureau_name]
        logger.info(f"Bureau '{bureau_name}': {len(filtered)} enregistrements filtrés")
        return filtered
    
    def sync_bureau(self, bureau_config: Dict[str, Any], records: List[Dict[str, Any]]) -> bool:
        """
        Synchronise les données pour un bureau spécifique
        
        Args:
            bureau_config: Configuration du bureau
            records: Enregistrements à synchroniser
            
        Returns:
            True si succès, False sinon
        """
        bureau_name = bureau_config['name']
        doc_id = bureau_config['grist_doc_id']
        table_id = bureau_config['grist_table_id']
        
        if not records:
            logger.info(f"Bureau '{bureau_name}': Aucun enregistrement à synchroniser")
            return True
        
        logger.info(f"Synchronisation de {len(records)} enregistrements vers {bureau_name}")
        logger.info(f"  → Document Grist: {doc_id}")
        logger.info(f"  → Table: {table_id}")
        
        try:
            # Utilisation de l'upsert pour éviter les doublons
            result = self.grist_api.upsert_records(
                doc_id=doc_id,
                table_id=table_id,
                records=records,
                on_many='first',  # En cas de multiples correspondances, utiliser la première
                allow='all'  # Autoriser création et mise à jour
            )
            
            logger.info(f"✓ Bureau '{bureau_name}': Synchronisation réussie")
            return True
            
        except Exception as e:
            logger.error(f"✗ Bureau '{bureau_name}': Échec de la synchronisation - {e}")
            return False
    
    def run(self) -> Dict[str, Any]:
        """
        Exécute la synchronisation complète pour tous les bureaux
        
        Returns:
            Rapport d'exécution avec les statistiques
        """
        start_time = datetime.now()
        logger.info("="*70)
        logger.info("DÉMARRAGE DE LA SYNCHRONISATION QUOTIDIENNE")
        logger.info(f"Date/Heure: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("="*70)
        
        report = {
            'start_time': start_time.isoformat(),
            'bureaux': [],
            'total_records': 0,
            'success_count': 0,
            'error_count': 0
        }
        
        try:
            # Étape 1: Récupération des données de l'API source
            all_records = self.fetch_api_data()
            report['total_records'] = len(all_records)
            
            # Étape 2: Distribution vers chaque bureau
            for bureau_config in self.config.bureaux:
                bureau_name = bureau_config['name']
                logger.info(f"\n--- Traitement du bureau: {bureau_name} ---")
                
                # Filtrer les enregistrements pour ce bureau
                bureau_records = self.filter_records_by_bureau(all_records, bureau_name)
                
                # Synchroniser vers Grist
                success = self.sync_bureau(bureau_config, bureau_records)
                
                bureau_report = {
                    'name': bureau_name,
                    'records_count': len(bureau_records),
                    'success': success
                }
                report['bureaux'].append(bureau_report)
                
                if success:
                    report['success_count'] += 1
                else:
                    report['error_count'] += 1
            
            # Rapport final
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            report['end_time'] = end_time.isoformat()
            report['duration_seconds'] = duration
            
            logger.info("\n" + "="*70)
            logger.info("RAPPORT DE SYNCHRONISATION")
            logger.info("="*70)
            logger.info(f"Durée totale: {duration:.2f} secondes")
            logger.info(f"Enregistrements traités: {report['total_records']}")
            logger.info(f"Bureaux synchronisés avec succès: {report['success_count']}/{len(self.config.bureaux)}")
            logger.info(f"Bureaux en échec: {report['error_count']}/{len(self.config.bureaux)}")
            
            for bureau in report['bureaux']:
                status = "✓" if bureau['success'] else "✗"
                logger.info(f"  {status} {bureau['name']}: {bureau['records_count']} enregistrements")
            
            logger.info("="*70)
            
            return report
            
        except Exception as e:
            logger.error(f"ERREUR FATALE: {e}", exc_info=True)
            report['error'] = str(e)
            report['end_time'] = datetime.now().isoformat()
            raise


def main():
    """Point d'entrée principal du script"""
    try:
        # Charger la configuration depuis un fichier ou variable d'environnement
        config_file = os.environ.get('GRIST_SYNC_CONFIG', 'config.json')
        
        if not os.path.exists(config_file):
            logger.error(f"Fichier de configuration non trouvé: {config_file}")
            logger.info("Veuillez créer un fichier config.json basé sur config.example.json")
            sys.exit(1)
        
        # Initialiser et exécuter la synchronisation
        config = GristSyncConfig(config_file)
        sync_job = DailySyncJob(config)
        report = sync_job.run()
        
        # Sauvegarder le rapport
        report_file = f"sync_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        logger.info(f"\nRapport sauvegardé: {report_file}")
        
        # Code de sortie basé sur le succès
        if report['error_count'] > 0:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"Erreur lors de l'exécution: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
