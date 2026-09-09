import { mkdir, cp, rm, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['--check', 'app.js'], {stdio:'inherit'});
for (const file of ['index.html','style.css','app.js','vendor/three.module.js','vendor/three.core.js']) await readFile(file);
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for (const file of ['index.html','style.css','app.js','vendor']) await cp(file,`dist/${file}`,{recursive:true});
console.log('Sunrise built successfully.');
