import { execFileSync } from 'child_process';

execFileSync('clawvault', ['context', 'task', '--profile', 'planning'], { shell: false });
