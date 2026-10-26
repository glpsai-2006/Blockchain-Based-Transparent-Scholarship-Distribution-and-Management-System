# ScholarChain – Blockchain-Based Transparent Scholarship Distribution & Management System

A **consortium (permissioned) blockchain** college project that records scholarship
applications, verifications, decisions, fund allocations, and bank-transfer references
on-chain while keeping actual documents off-chain (only their keccak256 hash is stored).

---

## 📁 Project Structure

```
├── ScholarshipSystem.sol   ← Solidity smart contract (^0.8.20)
├── ScholarChain.html       ← Single-file frontend (ethers.js v6, dark theme)
├── test.js                 ← Node.js test suite (solc + ganache + ethers)
├── README.md               ← This file
└── package.json            ← (created after npm install)
```

---

## ⚡ Quick Start (Ganache Desktop)

### Prerequisites
| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| npm | ≥ 9 | bundled with Node |
| Ganache Desktop | ≥ 2.7 | https://trufflesuite.com/ganache/ |

### Step 1 – Install test dependencies
```bash
cd "d:\Blockchain-Based Transparent Scholarship Distribution and Management System"
npm init -y
npm install solc ganache ethers
```

### Step 2 – Compile the contract & get bytecode
```bash
npx solc --bin --abi --optimize ScholarshipSystem.sol -o build/
```
*Or inline:*
```bash
node -e "
  const fs=require('fs'),solc=require('solc');
  const src=fs.readFileSync('ScholarshipSystem.sol','utf8');
  const inp={language:'Solidity',sources:{'S.sol':{content:src}},settings:{outputSelection:{'*':{'*':['abi','evm.bytecode']}}}};
  const out=JSON.parse(solc.compile(JSON.stringify(inp)));
  const c=out.contracts['S.sol']['ScholarshipSystem'];
  fs.writeFileSync('build/ScholarshipSystem.bin','0x'+c.evm.bytecode.object);
  console.log('Bytecode written to build/ScholarshipSystem.bin');
"
```

### Step 3 – Paste bytecode into the HTML (for Run Full Demo)
1. Open `build/ScholarshipSystem.bin` and copy the full hex string.
2. Open `ScholarChain.html` and find the comment near the bottom:
   ```js
   // const COMPILED_BYTECODE = "0x608060405234...";
   ```
3. Uncomment it and paste your bytecode.

### Step 4 – Start Ganache Desktop
- Open Ganache Desktop → **Quickstart** (Ethereum)
- Default port: **7545** — note down at least 7 account addresses

### Step 5 – Open the frontend
```bash
# Simply double-click ScholarChain.html
# OR serve with a local server:
npx http-server . -p 3000
# then open http://localhost:3000/ScholarChain.html
```

### Step 6 – Connect & Run Demo
1. Confirm RPC URL is `http://127.0.0.1:7545` (Ganache Desktop default)
2. Click **Connect to Ganache**
3. Click **▶ Run Full Demo**
4. Watch the log — expect all 12 steps to complete

---

## 🧪 Running the Test Suite

```bash
node test.js
```

Expected output (all green):
```
═══════════════════════════════════════════════════
   ScholarshipSystem.sol – Test Suite
═══════════════════════════════════════════════════

  ℹ  Compiling ScholarshipSystem.sol …
  ℹ  Compiled OK.
  ℹ  Starting in-process Ganache …

── Group 1: Role Setup & Scheme Creation ──
  ✅ PASS  addCollege by authority
  ✅ PASS  addAuditor by authority
  ✅ PASS  addCollege by non-authority blocked
  ✅ PASS  addAuditor by non-authority blocked
  ✅ PASS  Scheme #1 created with correct params

── Group 2: Student Registration ──
  ✅ PASS  STU1 registered
  ✅ PASS  STU2 registered
  ✅ PASS  STU3 registered
  ✅ PASS  STU4 registered
  ✅ PASS  Duplicate registration blocked

── Group 3: Happy Path (STU1 → Disbursed) ──
  ✅ PASS  STU1 applied – status: Applied
  ✅ PASS  Unregistered student apply blocked
  ✅ PASS  App #1 verified – status: Verified
  ✅ PASS  App #1 eligible – status: Eligible
  ✅ PASS  App #1 approved – amount: 50000
  ✅ PASS  App #1 allocated – status: Allocated
  ✅ PASS  Scheme budget reduced correctly
  ✅ PASS  App #1 disbursed

── Group 4: Rejection – Low CGPA ──
  ✅ PASS  App #2 rejected – reason: LowCGPA

── Group 5: Rejection – Oracle Income Override ──
  ✅ PASS  App #3 rejected after oracle override

── Group 6: Duplicate Application Blocked ──
  ✅ PASS  Duplicate application blocked

── Group 7: Unauthorized Callers Blocked ──
  ✅ PASS  Student calling verifyApplication blocked
  ✅ PASS  Random calling evaluateEligibility blocked
  ✅ PASS  Student calling approveApplication blocked
  ✅ PASS  Random calling recordDisbursement blocked
  ✅ PASS  Student calling submitOracleIncome blocked

── Group 8: Out-of-Order Calls Blocked ──
  ✅ PASS  evaluateEligibility before verify blocked
  ✅ PASS  approveApplication before eligible blocked
  ✅ PASS  allocateFunds before approved blocked
  ✅ PASS  recordDisbursement before allocated blocked
  ✅ PASS  submitOracleIncome before verify blocked

── Group 9: Budget Exhaustion ──
  ✅ PASS  App #4 rejected – reason: BudgetExhausted

── Group 10: View Functions ──
  ✅ PASS  getSummary returns correct authority
  ✅ PASS  getSummary returns correct oracle
  ✅ PASS  isCollege(COLLEGE) = true
  ✅ PASS  isAuditor(AUDITOR) = true
  ✅ PASS  getStudentSchemeApp returns correct app ID

═══════════════════════════════════════════════════
   ✅ ALL TESTS PASSED
═══════════════════════════════════════════════════
```

---

## 🔑 Account Roles in Demo (Ganache accounts in order)

| # | Role | Description |
|---|------|-------------|
| 0 | **Scholarship Authority** (deployer) | Creates schemes, evaluates, approves, disburses |
| 1 | **College Node** | Verifies student enrollment & documents |
| 2 | **Auditor Node** | Read-only audit access |
| 3 | **Oracle** | Submits verified income data |
| 4 | **Student 1** (Arjun Mehta) | Happy path → Disbursed |
| 5 | **Student 2** (Priya Sharma) | Rejected – Low CGPA |
| 6 | **Student 3** (Kiran Rao) | Rejected – Oracle income override |

---

## ⚠️ Known Limitations (Honest Disclosure for Report)

1. **CGPA and income are visible on-chain**: In this demo, these numeric values are stored as plain `uint256`. In a production system, only commitments or zero-knowledge proofs would be used.
2. **No actual document storage**: Only the keccak256 hash of documents is stored on-chain. The actual PDFs must be stored off-chain (IPFS or secure server).
3. **Ganache is not a consortium chain**: The demo uses Ganache (single-node) for simplicity. The consortium/PBFT design is described in the architecture but not executed by Ganache.
4. **Oracle centralization**: A single oracle address is trusted. A production system would use multiple oracle sources with aggregation.
5. **No encryption**: All on-chain data is publicly readable by any node. Role-based access is enforced at the contract function level, not at data visibility level.
6. **Gas limits are hardcoded**: `gasLimit: 3_000_000` is used to compensate for Ganache's gas estimation under-counting.

---

## 🔧 Ganache CLI Alternative (port 8545)

```bash
npm install -g ganache
ganache --port 8545 --accounts 10 --deterministic
```
Then change the RPC URL in the HTML to `http://127.0.0.1:8545`.

---

## 📝 Architecture & Workflow (Report Section)

See the **Architecture and Workflow** artifact/section below for the full write-up.
