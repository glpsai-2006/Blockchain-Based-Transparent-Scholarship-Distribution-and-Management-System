const fs = require('fs');
const path = require('path');

const bin = fs.readFileSync(path.join(__dirname, 'build', 'ScholarshipSystem.bin'), 'utf8').trim();
let html = fs.readFileSync(path.join(__dirname, 'ScholarChain.html'), 'utf8');

html = html.replace('const CONTRACT_BYTECODE = "BYTECODE_PLACEHOLDER";', 'const CONTRACT_BYTECODE = "' + bin + '";');
html = html.replace('// const COMPILED_BYTECODE = "0x608060405234...";', 'const COMPILED_BYTECODE = "' + bin + '";');
if (!html.includes(bin)) {
  html = html.replace('// PASTE YOUR COMPILED BYTECODE HERE:', 'const COMPILED_BYTECODE = "' + bin + '";');
}

fs.writeFileSync(path.join(__dirname, 'ScholarChain.html'), html);
console.log('Successfully embedded bytecode into ScholarChain.html! Contains bin:', html.includes(bin));
