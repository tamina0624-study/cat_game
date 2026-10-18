"""Inspect the files passed by pre-commit without printing secret values."""
import argparse
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KEYWORDS = ROOT / '00.secret' / 'security-keywords.json'


def check_files(filenames):
    failures = []
    terms = {}
    if KEYWORDS.exists():
        terms = json.loads(KEYWORDS.read_text(encoding='utf-8-sig'))
        if not isinstance(terms, dict) or any(
            not isinstance(values, list) or any(not isinstance(value, str) or not value.strip() for value in values)
            for values in terms.values()
        ):
            raise ValueError('Invalid local keyword configuration')
    with tempfile.TemporaryDirectory(prefix='mugi-security-') as temporary:
        snapshot = Path(temporary)
        count = 0
        for filename in filenames:
            source = ROOT / filename
            if not source.is_file():
                continue
            relative = source.resolve().relative_to(ROOT.resolve())
            parts = {part.lower() for part in relative.parts}
            name = source.name.lower()
            if '00.secret' in parts or (
                (name.startswith('.env') or name.startswith('.dev.vars'))
                and not name.endswith('.example')
            ):
                failures.append((relative.as_posix(), 'secret file path'))
                continue
            target = snapshot / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            count += 1
            data = source.read_bytes()
            if b'\0' in data:
                continue
            try:
                text = data.decode('utf-8-sig')
            except UnicodeDecodeError:
                continue
            for number, line in enumerate(text.splitlines(), 1):
                if re.search(r'[A-Za-z]:[\\/]Users[\\/][^\\/\s]+', line):
                    failures.append((f'{relative.as_posix()}:{number}', 'local user path'))
                if re.search(r'[\w.+-]+@(?:gmail|yahoo|hotmail|outlook|icloud)\.[A-Za-z.]+', line, re.I):
                    failures.append((f'{relative.as_posix()}:{number}', 'personal email'))
                for category, words in terms.items():
                    if any(word.casefold() in line.casefold() for word in words):
                        failures.append((f'{relative.as_posix()}:{number}', f'local keyword ({category})'))
        if count:
            executable = ROOT / 'work' / 'tools' / 'gitleaks' / 'gitleaks.exe'
            if not executable.is_file():
                raise RuntimeError('Gitleaks is missing; follow 01.doc/security-checks.md')
            report = snapshot / 'report.json'
            result = subprocess.run([
                str(executable), 'dir', str(snapshot), '--no-banner', '--redact',
                '--config', str(ROOT / 'GitSecurityTool/GitSecurityTool/.gitleaks.toml'),
                '--report-format', 'json', '--report-path', str(report),
            ], capture_output=True, check=False)
            if result.returncode not in (0, 1):
                raise RuntimeError('Gitleaks failed to run (details suppressed to protect secrets)')
            if report.exists():
                for item in json.loads(report.read_text(encoding='utf-8')):
                    location = Path(item['File'])
                    try:
                        location = location.relative_to(snapshot)
                    except ValueError:
                        pass
                    failures.append((f'{location}:{item.get("StartLine", "?")}', item.get('RuleID', 'credential')))
    for location, rule in failures:
        print(f'{location}: blocked by {rule}; value redacted')
    return bool(failures)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('files', nargs='*')
    args = parser.parse_args()
    try:
        return int(check_files(args.files))
    except (OSError, ValueError, RuntimeError) as error:
        print(f'Security check could not complete: {type(error).__name__}. Check local tool setup and keyword JSON.')
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
