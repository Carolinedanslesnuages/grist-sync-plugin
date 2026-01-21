#!/usr/bin/env python3
"""
Tests unitaires pour le script de synchronisation quotidienne
"""

import sys
import json
from io import StringIO
from unittest.mock import Mock, patch, MagicMock
import unittest

# Import the main script (note: in real scenario, we'd refactor to make testable)
sys.path.insert(0, '.')


class TestGristSyncConfig(unittest.TestCase):
    """Tests pour la classe GristSyncConfig"""
    
    def setUp(self):
        """Prépare les données de test"""
        self.test_config = {
            "api_source": {
                "url": "https://api.test.com/data",
                "headers": {"Authorization": "Bearer test"},
                "filter_field": "bureau"
            },
            "grist": {
                "server": "https://docs.getgrist.com",
                "api_key": "test_key"
            },
            "bureaux": [
                {
                    "name": "Paris",
                    "grist_doc_id": "DOC_PARIS",
                    "grist_table_id": "Table1"
                },
                {
                    "name": "Lyon",
                    "grist_doc_id": "DOC_LYON",
                    "grist_table_id": "Table1"
                }
            ]
        }
    
    def test_config_loading(self):
        """Test le chargement de la configuration"""
        # Créer un fichier temporaire avec la config
        with open('test_config.json', 'w') as f:
            json.dump(self.test_config, f)
        
        try:
            from daily_sync import GristSyncConfig
            config = GristSyncConfig('test_config.json')
            
            self.assertEqual(config.api_source_url, "https://api.test.com/data")
            self.assertEqual(config.grist_api_key, "test_key")
            self.assertEqual(len(config.bureaux), 2)
            self.assertEqual(config.api_filter_field, "bureau")
        finally:
            import os
            if os.path.exists('test_config.json'):
                os.remove('test_config.json')
    
    def test_get_bureau_config(self):
        """Test la récupération de config d'un bureau spécifique"""
        with open('test_config.json', 'w') as f:
            json.dump(self.test_config, f)
        
        try:
            from daily_sync import GristSyncConfig
            config = GristSyncConfig('test_config.json')
            
            paris_config = config.get_bureau_config("Paris")
            self.assertIsNotNone(paris_config)
            self.assertEqual(paris_config['grist_doc_id'], "DOC_PARIS")
            
            unknown_config = config.get_bureau_config("Unknown")
            self.assertIsNone(unknown_config)
        finally:
            import os
            if os.path.exists('test_config.json'):
                os.remove('test_config.json')


class TestDailySyncJob(unittest.TestCase):
    """Tests pour la classe DailySyncJob"""
    
    def setUp(self):
        """Prépare les mocks et données de test"""
        self.test_config = {
            "api_source": {
                "url": "https://api.test.com/data",
                "headers": {},
                "filter_field": "bureau"
            },
            "grist": {
                "server": "https://docs.getgrist.com",
                "api_key": "test_key"
            },
            "bureaux": [
                {"name": "Paris", "grist_doc_id": "DOC1", "grist_table_id": "T1"}
            ]
        }
        
        with open('test_config.json', 'w') as f:
            json.dump(self.test_config, f)
    
    def tearDown(self):
        """Nettoie après les tests"""
        import os
        if os.path.exists('test_config.json'):
            os.remove('test_config.json')
    
    def test_filter_records_by_bureau(self):
        """Test le filtrage des enregistrements par bureau"""
        from daily_sync import GristSyncConfig, DailySyncJob
        
        config = GristSyncConfig('test_config.json')
        sync_job = DailySyncJob(config)
        
        records = [
            {"id": 1, "bureau": "Paris", "name": "Alice"},
            {"id": 2, "bureau": "Lyon", "name": "Bob"},
            {"id": 3, "bureau": "Paris", "name": "Charlie"},
        ]
        
        paris_records = sync_job.filter_records_by_bureau(records, "Paris")
        self.assertEqual(len(paris_records), 2)
        self.assertEqual(paris_records[0]["name"], "Alice")
        self.assertEqual(paris_records[1]["name"], "Charlie")
        
        lyon_records = sync_job.filter_records_by_bureau(records, "Lyon")
        self.assertEqual(len(lyon_records), 1)
        self.assertEqual(lyon_records[0]["name"], "Bob")


def run_tests():
    """Exécute tous les tests"""
    print("="*70)
    print("TESTS DU SCRIPT DE SYNCHRONISATION")
    print("="*70)
    
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    suite.addTests(loader.loadTestsFromTestCase(TestGristSyncConfig))
    suite.addTests(loader.loadTestsFromTestCase(TestDailySyncJob))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "="*70)
    if result.wasSuccessful():
        print("✓ TOUS LES TESTS RÉUSSIS")
        return 0
    else:
        print("✗ CERTAINS TESTS ONT ÉCHOUÉ")
        return 1


if __name__ == '__main__':
    sys.exit(run_tests())
