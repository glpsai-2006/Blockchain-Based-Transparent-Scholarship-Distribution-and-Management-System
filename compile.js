const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = fs.existsSync(path.join(__dirname, 'contracts', 'ScholarshipSystem.sol'))
  ? path.join(__dirname, 'contracts', 'ScholarshipSystem.sol')
  : path.join(__dirname, 'ScholarshipSystem.sol');
const src = fs.readFileSync(contractPath, 'utf8');
const inp = {
  language: 'Solidity',
  sources: { 'ScholarshipSystem.sol': { content: src } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'london',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
  }
};

const out = JSON.parse(solc.compile(JSON.stringify(inp)));
if (out.errors) {
  const errs = out.errors.filter(e => e.severity === 'error');
  if (errs.length) {
    console.error('Compilation errors:', errs);
    process.exit(1);
  }
}

const c = out.contracts['ScholarshipSystem.sol']['ScholarshipSystem'];
const bytecode = '0x' + c.evm.bytecode.object;

const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

fs.writeFileSync(path.join(buildDir, 'ScholarshipSystem.bin'), bytecode);
fs.writeFileSync(path.join(buildDir, 'ScholarshipSystem.json'), JSON.stringify(c.abi, null, 2));

console.log('Contract compiled successfully!');
console.log('Bytecode length:', bytecode.length, 'characters');
console.log('Saved to build/ScholarshipSystem.bin and build/ScholarshipSystem.json');
