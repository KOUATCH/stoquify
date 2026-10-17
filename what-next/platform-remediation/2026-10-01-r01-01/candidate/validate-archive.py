"""Validate this run's local source archive against its frozen manifest; never extract."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import tarfile
from datetime import datetime, timezone

run = Path(__file__).resolve().parent
manifest_path = run / 'r01-source-candidate.json'
archive_path = run / 'r01-source-candidate.tar.gz'
receipt_path = run / 'archive-validation.json'
if receipt_path.exists():
    raise SystemExit('Existing validation receipt is preserved; do not overwrite it')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
if manifest['status'] != 'FROZEN_SOURCE_CANDIDATE':
    raise SystemExit('Candidate capture did not pass')
expected = {item['path']: item for item in manifest['files']}
observed = set()
errors = []
with tarfile.open(archive_path, 'r:gz') as archive:
    for member in archive:
        name = member.name
        while name.startswith('./'):
            name = name[2:]
        parsed = PurePosixPath(name)
        if parsed.is_absolute() or '..' in parsed.parts or '\\' in name or ':' in name:
            errors.append(f'Unsafe archive path: {name}')
            continue
        if member.isdir():
            continue
        if not member.isfile():
            errors.append(f'Non-regular archive entry: {name}')
            continue
        if name in observed or name not in expected:
            errors.append(f'Duplicate or unexpected archive file: {name}')
            continue
        observed.add(name)
        digest = hashlib.sha256()
        stream = archive.extractfile(member)
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
        if digest.hexdigest() != expected[name]['sha256'] or member.size != expected[name]['bytes']:
            errors.append(f'Content mismatch: {name}')
errors.extend(f'Missing archive file: {name}' for name in sorted(set(expected) - observed))
result = {
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'status': 'PASS' if not errors else 'FAILED',
    'candidateId': manifest['candidateId'],
    'archive': archive_path.name,
    'archiveBytes': archive_path.stat().st_size,
    'archiveSha256': hashlib.sha256(archive_path.read_bytes()).hexdigest(),
    'manifestSha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
    'verifiedFiles': len(observed),
    'extracted': False,
    'scope': 'Local source archive integrity only; not a build, secret-scan, runtime or release certificate.',
    'errors': errors,
}
receipt_path.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
raise SystemExit(1 if errors else 0)
