const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process')
const root = path.resolve(__dirname, '../../../..'), phase = process.argv[2]
if (!['red', 'green'].includes(phase)) throw new Error('Expected red or green')
const label = 'ui-' + phase
if (fs.existsSync(path.join(__dirname, label + '.results.json'))) throw new Error('Preserve prior results before rerun')
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|SYSTEMDRIVE)$/i.test(key)))
env.NODE_ENV = 'test'
const args = ['node_modules/jest/bin/jest.js', '--config', path.join(__dirname, 'jest.ui.cjs'), '--runInBand', '--runTestsByPath', 'components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx', '--json', '--outputFile', path.join(__dirname, label + '.results.json')]
if (phase === 'red') args.push('--testNamePattern', 'P05 retains original intent')
const r = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true })
fs.writeFileSync(path.join(__dirname, label + '.log'), (r.stdout || '') + (r.stderr || ''))
fs.writeFileSync(path.join(__dirname, label + '.execution.json'), JSON.stringify({ utc: new Date().toISOString(), command: [process.execPath, ...args], exit: r.status }, null, 2))
console.log(label + ': ' + r.status); process.exitCode = r.status ?? 1
