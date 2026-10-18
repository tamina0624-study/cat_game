"""Integration checks using synthetic credentials only; no external API calls."""
import contextlib
import importlib.util
import io
import secrets
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('security_check', ROOT / '02.src/tools/check_security.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class SecurityTests(unittest.TestCase):
    def test_detection_and_redaction(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'work', prefix='security-test-') as temporary:
            folder = Path(temporary)
            clean = folder / 'clean.txt'
            clean.write_text('ordinary project text\n', encoding='utf-8')
            self.assertFalse(checker.check_files([str(clean.relative_to(ROOT))]))
            secret_file = folder / '.env.test'
            secret_file.write_text('EXAMPLE=1', encoding='utf-8')
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertTrue(checker.check_files([str(secret_file.relative_to(ROOT))]))
            token = 'sk-' + secrets.token_urlsafe(48)
            credential = folder / 'credential.txt'
            credential.write_text('OPENAI_API_KEY="' + token + '"', encoding='utf-8')
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                self.assertTrue(checker.check_files([str(credential.relative_to(ROOT))]))
            self.assertNotIn(token, output.getvalue())

    def test_local_keywords_and_invalid_configuration(self):
        original = checker.KEYWORDS
        try:
            with tempfile.TemporaryDirectory(dir=ROOT / 'work', prefix='security-test-') as temporary:
                folder = Path(temporary)
                checker.KEYWORDS = folder / 'keywords.json'
                checker.KEYWORDS.write_text('{"name": ["synthetic-protected-phrase"]}', encoding='utf-8')
                source = folder / 'input.txt'
                source.write_text('SYNTHETIC-PROTECTED-PHRASE', encoding='utf-8')
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertTrue(checker.check_files([str(source.relative_to(ROOT))]))
                checker.KEYWORDS.write_text('{"name": "invalid"}', encoding='utf-8')
                with self.assertRaises(ValueError):
                    checker.check_files([str(source.relative_to(ROOT))])
        finally:
            checker.KEYWORDS = original


if __name__ == '__main__':
    unittest.main()
