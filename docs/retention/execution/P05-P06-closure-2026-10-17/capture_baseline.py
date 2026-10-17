from pathlib import Path
import datetime, hashlib, json, subprocess
here = Path(__file__).resolve().parent
root = here.parents[3]
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root)
paths = set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').decode().split('\0'))
prefix = here.relative_to(root).as_posix() + '/'
hashes = {}
for name in sorted(paths):
    if not name or name.startswith(prefix): continue
    p = root / name
    if p.is_file(): hashes[name] = hashlib.sha256(p.read_bytes()).hexdigest()
report = {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'head': git('rev-parse', 'HEAD').decode().strip(),
          'branch': git('branch', '--show-current').decode().strip(), 'hashes': hashes}
target = here / 'BASELINE.json'
if target.exists(): raise SystemExit('Refusing to replace baseline')
target.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
(here / 'WORKTREE_STATUS.z').write_bytes(git('status', '--porcelain=v1', '-z', '--untracked-files=all'))
print(json.dumps({'head': report['head'], 'files': len(hashes)}))
