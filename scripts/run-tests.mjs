import { spawnSync } from 'node:child_process';

const npmExecutable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const compile = spawnSync(npmExecutable, ['tsc', '-p', 'tsconfig.node-tests.json'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (compile.status !== 0) process.exit(compile.status ?? 1);
const tests = spawnSync(process.execPath, ['--test', 'tests/prime.node-test.cjs'], { stdio: 'inherit' });
process.exit(tests.status ?? 1);
