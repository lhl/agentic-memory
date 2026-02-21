import { execFileSync } from 'child_process';

execFileSync('clawvault', ['context', 'task', '--profile', 'auto'], { shell: true });
