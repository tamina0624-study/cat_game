"""Install the repository hook with a project-local cache."""
import os
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
os.chdir(root)
os.environ['PYTHONUTF8'] = '1'
os.environ['PRE_COMMIT_HOME'] = str(root / 'work/pre-commit-cache')
subprocess.check_call([sys.executable, '-m', 'pre_commit', 'install'])
hook = Path(subprocess.check_output(['git', 'rev-parse', '--git-path', 'hooks/pre-commit'], text=True).strip())
text = hook.read_text(encoding='utf-8')
marker = '# start templated'
if 'export PRE_COMMIT_HOME=' not in text:
    text = text.replace(marker, 'export PRE_COMMIT_HOME="$(git rev-parse --show-toplevel)/work/pre-commit-cache"\nexport PYTHONUTF8=1\n\n' + marker, 1)
    hook.write_text(text, encoding='utf-8', newline='\n')
print('Hook installed with project-local cache')
