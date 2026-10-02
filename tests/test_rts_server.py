import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('rts_server',ROOT/'server/app.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class RTSSaveTests(unittest.TestCase):
    def setUp(self):
        self.save=json.loads((ROOT/'tests/rts-save.json').read_text(encoding='utf-8'))
    def test_positions_orders_and_castles_are_preserved(self):
        s=self.save['state']
        s['units'][0]['order']={'type':'move','x':1800,'y':1400,'target':0,'resource':None}
        s['buildings'].append({'id':s['nextId'],'kind':'castle','x':1696,'y':1488,'hp':1400,'progress':.5,'cooldown':0,'rally':{'x':1800,'y':1550},'queue':[]})
        s['nextId']+=1
        self.assertEqual(module.validate_save(self.save),self.save)
    def test_invalid_entities_and_orders_are_rejected(self):
        for field,value in [('hp',10000),('team',False),('kind','script')]:
            bad=copy.deepcopy(self.save)
            bad['state']['units'][0][field]=value
            with self.assertRaises(ValueError):module.validate_save(bad)
        bad=copy.deepcopy(self.save)
        bad['state']['units'][0]['order']['target']=99999
        with self.assertRaises(ValueError):module.validate_save(bad)
    def test_unexpected_fields_are_discarded(self):
        self.save['state']['personalEmail']='untrusted@example.invalid'
        self.save['state']['units'][0]['script']='unexpected'
        clean=module.validate_save(self.save)
        self.assertNotIn('personalEmail',clean['state'])
        self.assertNotIn('script',clean['state']['units'][0])
