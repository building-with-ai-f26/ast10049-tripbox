import base64
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server

IMAGE = 'data:image/jpeg;base64,' + base64.b64encode(b'\xff\xd8\xfftest').decode()

class APITests(unittest.TestCase):
    def test_request_bounds_and_remote_url_rejected(self):
        for photos in ([], [{'id': i, 'image': IMAGE} for i in range(13)], [{'id': 0, 'image': 'https://example.org/photo.jpg'}], [{'id': 0, 'image': IMAGE}] * 2):
            with self.assertRaises(ValueError):
                server.prepare_request({'photos': photos, 'count': 1})

    def test_secret_not_in_payload(self):
        with patch.dict(server.os.environ, {'OPENROUTER_API_KEY': 'private-test-value'}):
            payload, ids, count = server.prepare_request({'photos': [{'id': 4, 'image': IMAGE}], 'count': 1})
        self.assertNotIn('private-test-value', json.dumps(payload))
        self.assertEqual(ids, [4])
        self.assertEqual(count, 1)
        self.assertEqual(payload['max_tokens'], 800)

    def test_model_must_return_exact_valid_unique_ids(self):
        for picks in ([{'id': 99, 'reason': 'bad'}], [{'id': 4, 'reason': ''}], [], [{'id': True, 'reason': 'bad'}]):
            result = {'choices': [{'message': {'content': json.dumps({'picks': picks})}}]}
            with self.assertRaises(ValueError):
                server.validate_response(result, [4], 1)
        result = {'choices': [{'message': {'content': json.dumps({'picks': [{'id': 4, 'reason': 'Color and composition'}]})}}], 'usage': {'prompt_tokens': 20, 'completion_tokens': 10, 'cost': 0.000009, 'private': 'not copied'}}
        clean = server.validate_response(result, [4], 1)
        self.assertEqual(clean['picks'][0]['id'], 4)
        self.assertNotIn('private', clean['usage'])


class HTTPTests(unittest.TestCase):
    def setUp(self):
        import threading
        self.http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.http.server_port}'
        server.Handler.calls = 0
        server.Handler.last_call = 0

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()

    def send(self, data, origin=None):
        from urllib.request import Request, urlopen
        headers = {'Content-Type': 'application/json'}
        if origin: headers['Origin'] = origin
        return urlopen(Request(self.base + '/api/recommend', data=json.dumps(data).encode(), headers=headers))

    def test_no_key_and_cross_origin_are_rejected(self):
        from urllib.error import HTTPError
        with patch.dict(server.os.environ, {'OPENROUTER_API_KEY': ''}):
            with self.assertRaises(HTTPError) as ctx: self.send({})
            self.assertEqual(ctx.exception.code, 503)
            with self.assertRaises(HTTPError) as ctx: self.send({}, 'https://example.com')
            self.assertEqual(ctx.exception.code, 403)

    def test_secret_path_not_served(self):
        from urllib.request import urlopen
        from urllib.error import HTTPError
        with self.assertRaises(HTTPError) as ctx: urlopen(self.base + '/.env')
        self.assertEqual(ctx.exception.code, 404)

    def test_successful_route_with_mocked_provider_then_rate_limit(self):
        import io
        from urllib.error import HTTPError
        result = {'choices': [{'message': {'content': json.dumps({'picks': [{'id': 4, 'reason': 'Clear composition'}]})}}], 'usage': {'prompt_tokens': 25, 'completion_tokens': 10, 'cost': 0}}
        with patch.dict(server.os.environ, {'OPENROUTER_API_KEY': 'test-only'}), patch.object(server, 'urlopen', return_value=io.BytesIO(json.dumps(result).encode())) as upstream:
            with self.send({'photos': [{'id': 4, 'image': IMAGE}], 'count': 1}, self.base) as r:
                clean = json.load(r)
            self.assertEqual(clean['picks'][0]['id'], 4)
            self.assertEqual(upstream.call_count, 1)
            with self.assertRaises(HTTPError) as ctx:
                self.send({'photos': [{'id': 4, 'image': IMAGE}], 'count': 1})
            self.assertEqual(ctx.exception.code, 429)

if __name__ == '__main__':
    unittest.main()
