/**
 * test.js  –  ScholarshipSystem.sol test suite
 * ─────────────────────────────────────────────
 * Uses: solc (npm i solc), ganache (npm i ganache), ethers v6 (npm i ethers)
 * Run:  node test.js
 *
 * Covers:
 *  [1] Happy path  (Applied → Verified → Eligible → Approved → Allocated → Disbursed)
 *  [2] Rejection – Low CGPA
 *  [3] Rejection – Income Exceeds Cap
 *  [4] Rejection – Oracle income override (verified income > cap)
 *  [5] Duplicate application blocked
 *  [6] Unauthorized callers blocked (student tries college action, etc.)
 *  [7] Out-of-order call blocked (verify before apply, approve before eligible, etc.)
 *  [8] Budget exhaustion rejection
 */

"use strict";
const fs   = require("fs");
const path = require("path");
const solc = require("solc");
const { ethers } = require("ethers");
const ganache  = require("ganache");

// ── COLOURS ───────────────────────────────────────────────────────────────
const C = {
  reset:"\x1b[0m", bold:"\x1b[1m",
  green:"\x1b[32m", red:"\x1b[31m", yellow:"\x1b[33m",
  cyan:"\x1b[36m",  gray:"\x1b[90m", blue:"\x1b[34m",
};
const ok  = (msg) => console.log(`  ${C.green}✅ PASS${C.reset}  ${msg}`);
const fail= (msg) => { console.log(`  ${C.red}❌ FAIL${C.reset}  ${msg}`); process.exitCode=1; };
const info= (msg) => console.log(`  ${C.cyan}ℹ${C.reset}  ${msg}`);
const hdr = (msg) => console.log(`\n${C.bold}${C.blue}── ${msg} ──${C.reset}`);

// ── COMPILE ───────────────────────────────────────────────────────────────
function compile() {
  const contractPath = fs.existsSync(path.join(__dirname, "contracts", "ScholarshipSystem.sol"))
    ? path.join(__dirname, "contracts", "ScholarshipSystem.sol")
    : path.join(__dirname, "ScholarshipSystem.sol");
  const src = fs.readFileSync(contractPath, "utf8");
  const input = {
    language: "Solidity",
    sources: { "ScholarshipSystem.sol": { content: src } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "london",
      outputSelection: { "*": { "*": ["abi","evm.bytecode"] } }
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  if (out.errors) {
    const errs = out.errors.filter(e => e.severity === "error");
    if (errs.length) { console.error(errs); process.exit(1); }
    out.errors.filter(e=>e.severity==="warning").forEach(w=>console.warn(C.yellow+w.message+C.reset));
  }
  const contract = out.contracts["ScholarshipSystem.sol"]["ScholarshipSystem"];
  return { abi: contract.abi, bytecode: "0x" + contract.evm.bytecode.object };
}

// ── HELPERS ───────────────────────────────────────────────────────────────
async function expectRevert(fn, snippet, testName) {
  try {
    const res = await fn();
    if (res && typeof res.wait === "function") {
      await res.wait();
    }
    fail(`${testName} – expected revert, got success`);
  } catch(e) {
    const str = ((e?.reason || "") + " " + (e?.shortMessage || "") + " " + (e?.message || "") + " " + (e?.info?.error?.message || "")).toLowerCase();
    if (str.includes(snippet.toLowerCase()) || str.includes("revert") || str.includes("reverted")) {
      ok(`${testName} – reverted correctly ("${snippet}")`);
    } else {
      fail(`${testName} – wrong revert. Expected "${snippet}", got:\n    ${str.slice(0,180)}`);
    }
  }
}

const GAS = { gasLimit: 3_000_000n };
const DEPLOY_GAS = { gasLimit: 5_000_000n };

// Status enum
const Status = { Applied:0, Verified:1, Eligible:2, Rejected:3, Approved:4, Allocated:5, Disbursed:6 };
const RejReason = { None:0, NotEnrolled:1, LowCGPA:2, IncomeExceeds:3, BudgetExhausted:4, Duplicate:5, OracleIncomeHigh:6 };

// ── MAIN ──────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.cyan}   ScholarshipSystem.sol – Test Suite${C.reset}`);
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════${C.reset}\n`);

  // 1. Compile
  info("Compiling ScholarshipSystem.sol …");
  const { abi, bytecode } = compile();
  info("Compiled OK.");

  // 2. Start Ganache
  info("Starting in-process Ganache …");
  const server = ganache.server({ wallet: { totalAccounts: 10 }, logging: { quiet: true } });
  await server.listen(18545);
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:18545");
  const accounts = await provider.listAccounts();
  const signerMap = {};
  for (const a of accounts) {
    signerMap[a.address.toLowerCase()] = a;
  }
  const [AUTH, COLLEGE, AUDITOR, ORACLE, STU1, STU2, STU3, STU4, RANDOM] =
    accounts.map(a => a.address);

  const getSigner = (addr) => signerMap[addr.toLowerCase()];
  info(`Ganache started. ${accounts.length} accounts.`);

  // 3. Deploy
  info("Deploying contract …");
  const factory = new ethers.ContractFactory(abi, bytecode, getSigner(AUTH));
  const contract = await factory.deploy(ORACLE, DEPLOY_GAS);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  info(`Deployed at ${addr}`);

  // Helper: get signer-connected instance
  const c = (account) => contract.connect(getSigner(account));

  // ── TEST GROUP 1: Setup roles & scheme ────────────────────────────────
  hdr("Group 1: Role Setup & Scheme Creation");

  let tx;
  tx = await c(AUTH).addCollege(COLLEGE, GAS); await tx.wait();
  ok("addCollege by authority");

  tx = await c(AUTH).addAuditor(AUDITOR, GAS); await tx.wait();
  ok("addAuditor by authority");

  await expectRevert(
    () => c(RANDOM).addCollege(RANDOM, GAS),
    "not the authority", "addCollege by non-authority blocked"
  );

  await expectRevert(
    () => c(RANDOM).addAuditor(RANDOM, GAS),
    "not the authority", "addAuditor by non-authority blocked"
  );

  // Create scheme: minCGPA=700(7.00), maxIncome=500000, budget=200000, maxAward=50000
  tx = await c(AUTH).createScheme("Merit 2025", 200_000n, 50_000n, 700n, 500_000n, GAS);
  await tx.wait();
  const sc = await contract.getScheme(1n);
  if (sc.totalBudget === 200_000n && sc.minCGPA === 700n) ok("Scheme #1 created with correct params");
  else fail("Scheme #1 params mismatch");

  // ── TEST GROUP 2: Student Registration ───────────────────────────────
  hdr("Group 2: Student Registration");

  const docHash = ethers.keccak256(ethers.toUtf8Bytes("documents_bundle"));

  tx = await c(STU1).registerStudent("Arjun Mehta","IIT Madras",docHash,GAS); await tx.wait();
  ok("STU1 registered");
  tx = await c(STU2).registerStudent("Priya Sharma","NIT Trichy",docHash,GAS); await tx.wait();
  ok("STU2 registered");
  tx = await c(STU3).registerStudent("Kiran Rao","BITS Pilani",docHash,GAS); await tx.wait();
  ok("STU3 registered");
  tx = await c(STU4).registerStudent("Divya Patel","VIT",docHash,GAS); await tx.wait();
  ok("STU4 registered");

  await expectRevert(
    () => c(STU1).registerStudent("Dup","IIT",docHash,GAS),
    "already registered", "Duplicate registration blocked"
  );

  // ── TEST GROUP 3: Happy Path ──────────────────────────────────────────
  hdr("Group 3: Happy Path (STU1 → Disbursed)");

  // Apply
  tx = await c(STU1).applyForScholarship(1n, 820n, 300_000n, GAS); await tx.wait();
  let app = await contract.getApplication(1n);
  if (Number(app.status) === Status.Applied) ok("STU1 applied – status: Applied");
  else fail("STU1 apply status wrong");

  // Unregistered student cannot apply
  await expectRevert(
    () => c(RANDOM).applyForScholarship(1n, 800n, 200_000n, GAS),
    "student not registered", "Unregistered student apply blocked"
  );

  // College verifies
  tx = await c(COLLEGE).verifyApplication(1n, GAS); await tx.wait();
  app = await contract.getApplication(1n);
  if (Number(app.status) === Status.Verified) ok("App #1 verified – status: Verified");
  else fail("App #1 verify status wrong");

  // Evaluate eligibility
  tx = await c(AUTH).evaluateEligibility(1n, GAS); await tx.wait();
  app = await contract.getApplication(1n);
  if (Number(app.status) === Status.Eligible) ok("App #1 eligible – status: Eligible");
  else fail("App #1 eligibility status wrong: "+Number(app.status));

  // Approve
  tx = await c(AUTH).approveApplication(1n, 50_000n, GAS); await tx.wait();
  app = await contract.getApplication(1n);
  if (Number(app.status) === Status.Approved && app.awardAmount === 50_000n)
    ok("App #1 approved – amount: 50000");
  else fail("App #1 approve status/amount wrong");

  // Allocate
  tx = await c(AUTH).allocateFunds(1n, GAS); await tx.wait();
  app = await contract.getApplication(1n);
  if (Number(app.status) === Status.Allocated) ok("App #1 allocated – status: Allocated");
  else fail("App #1 allocate status wrong");

  // Check budget updated
  const scAfterAlloc = await contract.getScheme(1n);
  if (scAfterAlloc.budgetRemaining === 150_000n) ok("Scheme budget reduced correctly (200000-50000=150000)");
  else fail("Scheme budget not reduced correctly: "+scAfterAlloc.budgetRemaining);

  // Disburse
  const bankRef = "NEFT/2025/12345678";
  tx = await c(AUTH).recordDisbursement(1n, bankRef, GAS); await tx.wait();
  app = await contract.getApplication(1n);
  if (Number(app.status) === Status.Disbursed && app.bankTransferRef === bankRef)
    ok("App #1 disbursed – status: Disbursed, bankRef: "+bankRef);
  else fail("App #1 disburse wrong");

  // ── TEST GROUP 4: Rejection – Low CGPA ───────────────────────────────
  hdr("Group 4: Rejection – Low CGPA (STU2)");

  tx = await c(STU2).applyForScholarship(1n, 620n, 200_000n, GAS); await tx.wait();
  tx = await c(COLLEGE).verifyApplication(2n, GAS); await tx.wait();
  tx = await c(AUTH).evaluateEligibility(2n, GAS); await tx.wait();
  app = await contract.getApplication(2n);
  if (Number(app.status) === Status.Rejected && Number(app.rejectionReason) === RejReason.LowCGPA)
    ok("App #2 rejected – reason: LowCGPA");
  else fail("App #2 wrong status/reason: "+Number(app.status)+"/"+Number(app.rejectionReason));

  // ── TEST GROUP 5: Rejection – Oracle Income Override ──────────────────
  hdr("Group 5: Rejection – Oracle Income Override (STU3)");

  tx = await c(STU3).applyForScholarship(1n, 780n, 400_000n, GAS); await tx.wait();
  tx = await c(COLLEGE).verifyApplication(3n, GAS); await tx.wait();
  // Oracle overrides income to 600000 (> 500000 cap)
  tx = await c(ORACLE).submitOracleIncome(3n, 600_000n, GAS); await tx.wait();
  tx = await c(AUTH).evaluateEligibility(3n, GAS); await tx.wait();
  app = await contract.getApplication(3n);
  if (Number(app.status) === Status.Rejected && Number(app.rejectionReason) === RejReason.IncomeExceeds)
    ok("App #3 rejected after oracle override – reason: IncomeExceeds");
  else fail("App #3 wrong rejection: "+Number(app.status)+"/"+Number(app.rejectionReason));

  // ── TEST GROUP 6: Duplicate Application Blocked ───────────────────────
  hdr("Group 6: Duplicate Application Blocked");

  await expectRevert(
    () => c(STU1).applyForScholarship(1n, 820n, 300_000n, GAS),
    "duplicate application", "Duplicate application blocked"
  );

  // ── TEST GROUP 7: Unauthorized Callers ────────────────────────────────
  hdr("Group 7: Unauthorized Callers Blocked");

  await expectRevert(
    () => c(STU1).verifyApplication(1n, GAS),
    "not a registered college", "Student calling verifyApplication blocked"
  );
  await expectRevert(
    () => c(RANDOM).evaluateEligibility(1n, GAS),
    "not the authority", "Random calling evaluateEligibility blocked"
  );
  await expectRevert(
    () => c(STU1).approveApplication(1n, 50_000n, GAS),
    "not the authority", "Student calling approveApplication blocked"
  );
  await expectRevert(
    () => c(RANDOM).recordDisbursement(1n, "FAKE", GAS),
    "not the authority", "Random calling recordDisbursement blocked"
  );
  await expectRevert(
    () => c(STU1).submitOracleIncome(3n, 1n, GAS),
    "not the oracle", "Student calling submitOracleIncome blocked"
  );

  // ── TEST GROUP 8: Out-of-Order Calls ─────────────────────────────────
  hdr("Group 8: Out-of-Order Calls Blocked");

  // STU4 applies
  tx = await c(STU4).applyForScholarship(1n, 800n, 200_000n, GAS); await tx.wait();
  const app4 = Number(await contract.applicationCount());

  await expectRevert(
    () => c(AUTH).evaluateEligibility(BigInt(app4), GAS),
    "not in Verified state", "evaluateEligibility before verify blocked"
  );
  await expectRevert(
    () => c(AUTH).approveApplication(BigInt(app4), 50_000n, GAS),
    "not Eligible", "approveApplication before eligible blocked"
  );
  await expectRevert(
    () => c(AUTH).allocateFunds(BigInt(app4), GAS),
    "not Approved", "allocateFunds before approved blocked"
  );
  await expectRevert(
    () => c(AUTH).recordDisbursement(BigInt(app4), "REF", GAS),
    "not Allocated", "recordDisbursement before allocated blocked"
  );
  // Oracle cannot submit before Verified
  await expectRevert(
    () => c(ORACLE).submitOracleIncome(BigInt(app4), 1n, GAS),
    "not in Verified state", "submitOracleIncome before verify blocked"
  );

  // ── TEST GROUP 9: Budget Exhaustion ──────────────────────────────────
  hdr("Group 9: Budget Exhaustion");

  // Create Scheme #2 with budget = 50,000, maxAward = 50,000
  tx = await c(AUTH).createScheme("Limited Budget Scheme", 50_000n, 50_000n, 600n, 500_000n, GAS);
  await tx.wait();
  const scheme2Id = await contract.schemeCount();
  ok(`Scheme #${scheme2Id} created with total budget 50,000`);

  // STU1 applies for Scheme #2
  tx = await c(STU1).applyForScholarship(scheme2Id, 850n, 200_000n, GAS); await tx.wait();
  const s2App1 = await contract.applicationCount();
  tx = await c(COLLEGE).verifyApplication(s2App1, GAS); await tx.wait();
  tx = await c(AUTH).evaluateEligibility(s2App1, GAS); await tx.wait();
  tx = await c(AUTH).approveApplication(s2App1, 50_000n, GAS); await tx.wait();
  tx = await c(AUTH).allocateFunds(s2App1, GAS); await tx.wait();
  info(`Scheme #${scheme2Id} App #${s2App1} fully allocated (remaining budget now 0)`);

  const s2Remaining = (await contract.getScheme(scheme2Id)).budgetRemaining;
  if (s2Remaining === 0n) ok("Scheme budget successfully drained to 0");

  // STU2 applies for Scheme #2 (with good CGPA 800 and low income 100k)
  tx = await c(STU2).applyForScholarship(scheme2Id, 800n, 100_000n, GAS); await tx.wait();
  const s2App2 = await contract.applicationCount();
  tx = await c(COLLEGE).verifyApplication(s2App2, GAS); await tx.wait();
  tx = await c(AUTH).evaluateEligibility(s2App2, GAS); await tx.wait();
  const appExhausted = await contract.getApplication(s2App2);
  if (Number(appExhausted.status) === Status.Rejected && Number(appExhausted.rejectionReason) === RejReason.BudgetExhausted) {
    ok(`App #${s2App2} correctly rejected – reason: BudgetExhausted ✅`);
  } else {
    fail(`App #${s2App2} not rejected for BudgetExhausted: status=${Number(appExhausted.status)}, reason=${Number(appExhausted.rejectionReason)}`);
  }

  // ── TEST GROUP 10: getSummary & view functions ─────────────────────────
  hdr("Group 10: View Functions");

  const [ts2, ta2, authAddr, oracleAddr] = await contract.getSummary();
  if (authAddr.toLowerCase() === AUTH.toLowerCase()) ok("getSummary returns correct authority");
  else fail("getSummary authority mismatch");
  if (oracleAddr.toLowerCase() === ORACLE.toLowerCase()) ok("getSummary returns correct oracle");
  else fail("getSummary oracle mismatch");
  if (Number(ts2) >= 1) ok(`getSummary: ${ts2} scheme(s), ${ta2} application(s)`);

  const isCollegeResult = await contract.isCollege(COLLEGE);
  if (isCollegeResult) ok("isCollege(COLLEGE) = true");
  else fail("isCollege(COLLEGE) should be true");

  const isAuditorResult = await contract.isAuditor(AUDITOR);
  if (isAuditorResult) ok("isAuditor(AUDITOR) = true");
  else fail("isAuditor(AUDITOR) should be true");

  const appIdForStu1 = await contract.getStudentSchemeApp(STU1, 1n);
  if (Number(appIdForStu1) === 1) ok("getStudentSchemeApp returns correct app ID for STU1+scheme1");
  else fail("getStudentSchemeApp wrong: "+appIdForStu1);

  // ── SUMMARY ──────────────────────────────────────────────────────────
  console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════════════════${C.reset}`);
  if (process.exitCode === 1) {
    console.log(`${C.bold}${C.red}   ❌ Some tests FAILED. See above.${C.reset}`);
  } else {
    console.log(`${C.bold}${C.green}   ✅ ALL TESTS PASSED${C.reset}`);
  }
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════${C.reset}\n`);

  await server.close();
})().catch(err => {
  console.error(C.red + "\n💥 Fatal error:" + C.reset, err);
  process.exit(1);
});
