import { createInterface } from 'node:readline/promises';
import { hashPassword } from '../server/auth.mjs';
const rl = createInterface({ input: process.stdin, output: process.stdout });
console.log('Run privately: the terminal echoes input. Do not paste the resulting hash into tracked files.');
const password = await rl.question('Operator password (at least 14 characters): '); rl.close();
if (password.length < 14) throw new Error('Use at least 14 characters');
console.log(hashPassword(password));
