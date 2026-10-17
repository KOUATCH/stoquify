"""Run only the reviewed queue fixture against already installed Chromium; no install."""
from pathlib import Path
import os
import subprocess

here = Path(__file__).resolve().parent
root = here.parents[4]
cache = Path('C:/Users/J COMPUTER/AppData/Local/ms-playwright')
executable = cache / 'chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'
if not executable.is_file():
    raise SystemExit('Existing reviewed Chromium executable missing; no install attempted')
env = os.environ.copy()
env['PLAYWRIGHT_BROWSERS_PATH'] = str(cache)
command = ['node', 'node_modules/jest/bin/jest.js', '--config', 'jest.retention-offline.config.cjs',
           '--runInBand', '--no-cache', '--runTestsByPath', 'lib/pos/__tests__/offline-local-queue.test.ts',
           '--json', '--outputFile', 'docs/retention/execution/P06/evidence/OFFLINE_BROWSER_EXPLICIT_CACHE.json']
with (here / 'BROWSER_RUN_LOG.txt').open('w', encoding='utf-8') as log:
    result = subprocess.run(command, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT)
print('Browser fixture exit code:', result.returncode)
raise SystemExit(result.returncode)
