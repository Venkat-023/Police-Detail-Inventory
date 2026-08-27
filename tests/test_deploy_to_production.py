# Unit tests for TEST-004
from src.services.deploy_to_production_service import execute_deploy_to_production

def test_execute_deploy_to_production():
    res = execute_deploy_to_production()
    assert res['status'] == 'success'
