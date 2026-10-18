"""Run pre-commit against tracked and non-ignored new files."""
import os
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
os.chdir(root)
os.environ['PRE_COMMIT_HOME'] = str(root / 'work/pre-commit-cache')
os.environ['PYTHONUTF8'] = '1'
files = subprocess.check_output(
    ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
).decode('utf-8').split('\0')
files = sorted({name for name in files if name and (root / name).is_file()})
raise SystemExit(subprocess.call([sys.executable, '-m', 'pre_commit', 'run', '--files', *files]))
