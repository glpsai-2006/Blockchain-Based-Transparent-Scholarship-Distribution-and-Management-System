// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ScholarshipSystem
 * @author ScholarChain Project
 * @notice Blockchain-Based Transparent Scholarship Distribution and Management System.
 *         Consortium (permissioned) blockchain design. Demo runs on a local Ganache chain.
 *         Business participants: Student, Donor.
 *         Blockchain nodes: College (verifier), Scholarship Authority (deployer/admin), Auditor.
 *         Consensus design: PBFT (described in report; not run by Ganache).
 *         NO cryptocurrency / tokens. Payment is a recorded bank-transfer reference string.
 *         On-chain: application events, verification, decisions, fund allocation, payment reference,
 *                   document hashes (keccak256).
 *         Off-chain: actual documents (PDFs, mark sheets, income certificates).
 * @dev    Roles: authority (deployer), colleges, auditors, optional oracle.
 */
contract ScholarshipSystem {

    // ─────────────────────────────────────────────────────────────────────────
    //  ENUMS & CONSTANTS
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Lifecycle states of a scholarship application
    enum Status {
        Applied,     // 0 – student submitted application
        Verified,    // 1 – college confirmed enrollment / docs
        Eligible,    // 2 – passed eligibility rules
        Rejected,    // 3 – failed a rule; reason stored
        Approved,    // 4 – authority formally approved
        Allocated,   // 5 – funds ring-fenced in the scheme budget
        Disbursed    // 6 – bank transfer reference recorded
    }

    /// @notice Named rejection reasons (stored on-chain for auditability)
    enum RejectionReason {
        None,              // 0 – not rejected
        NotEnrolled,       // 1 – college did not verify enrollment
        LowCGPA,           // 2 – CGPA below scheme minimum
        IncomeExceeds,     // 3 – annual family income above cap
        BudgetExhausted,   // 4 – scheme fund fully allocated
        DuplicateApp,      // 5 – student already applied to this scheme
        OracleIncomeHigh   // 6 – oracle income data overrides self-reported value
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STRUCTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice A scholarship scheme created by the authority
     * @dev    budgetRemaining tracks how much fund is still allocatable
     */
    struct Scheme {
        uint256 id;
        string  name;
        uint256 totalBudget;        // in smallest unit (e.g. paise / cents, no real currency)
        uint256 budgetRemaining;
        uint256 maxAwardPerStudent; // cap per student
        uint256 minCGPA;            // scaled ×100 (e.g. 750 = 7.50)
        uint256 maxAnnualIncome;    // annual family income cap (same unit as budget)
        bool    active;
    }

    /**
     * @notice A student registered on the system
     * @dev    documentHash is keccak256 of the off-chain documents bundle
     */
    struct Student {
        address wallet;
        string  name;
        string  collegeName;
        bytes32 documentHash;      // keccak256 of off-chain document bundle
        bool    registered;
        bool    enrolled;          // set true by college verifier
    }

    /**
     * @notice An individual scholarship application
     */
    struct Application {
        uint256 id;
        uint256 schemeId;
        address student;
        uint256 selfReportedIncome;  // family income reported by student (visible on-chain in demo)
        uint256 cgpa;                // scaled ×100 (e.g. 820 = 8.20) – visible on-chain in demo
        uint256 awardAmount;         // amount allocated/disbursed
        Status  status;
        RejectionReason rejectionReason;
        string  bankTransferRef;     // payment reference (empty until Disbursed)
        uint256 appliedAt;           // block.timestamp
        uint256 lastUpdatedAt;       // block.timestamp of last state change
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────

    address public authority;          // deployer = Scholarship Authority node

    mapping(address => bool)    public colleges;
    mapping(address => bool)    public auditors;
    address public oracle;             // optional income-data oracle

    mapping(address => Student)            public students;
    mapping(uint256 => Scheme)             public schemes;
    mapping(uint256 => Application)        public applications;

    /// @dev student => schemeId => applicationId (0 means none)
    mapping(address => mapping(uint256 => uint256)) private _studentSchemeApp;

    uint256 public schemeCount;
    uint256 public applicationCount;

    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS (the on-chain audit trail)
    // ─────────────────────────────────────────────────────────────────────────

    event StudentRegistered(address indexed student, string name, string collegeName, bytes32 documentHash);
    event CollegeAdded(address indexed college);
    event AuditorAdded(address indexed auditor);
    event OracleSet(address indexed oracle);
    event SchemeCreated(uint256 indexed schemeId, string name, uint256 totalBudget, uint256 maxAwardPerStudent, uint256 minCGPA, uint256 maxAnnualIncome);
    event ApplicationSubmitted(uint256 indexed appId, address indexed student, uint256 indexed schemeId, uint256 cgpa, uint256 selfReportedIncome);
    event ApplicationVerified(uint256 indexed appId, address indexed college);
    event OracleIncomeSubmitted(uint256 indexed appId, address indexed oracle, uint256 verifiedIncome);
    event EligibilityEvaluated(uint256 indexed appId, bool eligible, RejectionReason reason);
    event ApplicationApproved(uint256 indexed appId, address indexed authority, uint256 awardAmount);
    event FundsAllocated(uint256 indexed appId, uint256 indexed schemeId, uint256 amount);
    event DisbursementRecorded(uint256 indexed appId, address indexed student, uint256 amount, string bankTransferRef);
    event ApplicationRejected(uint256 indexed appId, RejectionReason reason, string description);

    // ─────────────────────────────────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyAuthority() {
        require(msg.sender == authority, "ScholarshipSystem: caller is not the authority");
        _;
    }

    modifier onlyCollege() {
        require(colleges[msg.sender], "ScholarshipSystem: caller is not a registered college");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "ScholarshipSystem: caller is not the oracle");
        _;
    }

    modifier onlyAuditorOrAuthority() {
        require(auditors[msg.sender] || msg.sender == authority, "ScholarshipSystem: restricted to auditor or authority");
        _;
    }

    modifier applicationExists(uint256 appId) {
        require(appId > 0 && appId <= applicationCount, "ScholarshipSystem: application does not exist");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Deploy and become the Scholarship Authority.
     * @param _oracle Optional oracle address (pass address(0) to skip).
     */
    constructor(address _oracle) {
        authority = msg.sender;
        if (_oracle != address(0)) {
            oracle = _oracle;
            emit OracleSet(_oracle);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ADMIN – ROLE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register a college node address so it can verify applications.
     * @param college Ethereum address of the college node.
     */
    function addCollege(address college) external onlyAuthority {
        require(college != address(0), "ScholarshipSystem: zero address");
        colleges[college] = true;
        emit CollegeAdded(college);
    }

    /**
     * @notice Register an auditor address so it can read full audit data.
     * @param auditor Ethereum address of the auditor node.
     */
    function addAuditor(address auditor) external onlyAuthority {
        require(auditor != address(0), "ScholarshipSystem: zero address");
        auditors[auditor] = true;
        emit AuditorAdded(auditor);
    }

    /**
     * @notice Set or update the income oracle address.
     * @param _oracle Oracle address.
     */
    function setOracle(address _oracle) external onlyAuthority {
        require(_oracle != address(0), "ScholarshipSystem: zero address");
        oracle = _oracle;
        emit OracleSet(_oracle);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AUTHORITY – SCHEME MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Create a new scholarship scheme.
     * @param name             Human-readable scheme name.
     * @param totalBudget      Total fund available for this scheme.
     * @param maxAwardPerStudent Maximum award any single student can receive.
     * @param minCGPA          Minimum CGPA ×100 (e.g. 700 = 7.00).
     * @param maxAnnualIncome  Maximum annual family income allowed.
     */
    function createScheme(
        string calldata name,
        uint256 totalBudget,
        uint256 maxAwardPerStudent,
        uint256 minCGPA,
        uint256 maxAnnualIncome
    ) external onlyAuthority returns (uint256 schemeId) {
        require(bytes(name).length > 0, "ScholarshipSystem: scheme name empty");
        require(totalBudget > 0, "ScholarshipSystem: budget must be > 0");
        require(maxAwardPerStudent > 0 && maxAwardPerStudent <= totalBudget, "ScholarshipSystem: invalid award cap");

        schemeCount++;
        schemeId = schemeCount;

        schemes[schemeId] = Scheme({
            id: schemeId,
            name: name,
            totalBudget: totalBudget,
            budgetRemaining: totalBudget,
            maxAwardPerStudent: maxAwardPerStudent,
            minCGPA: minCGPA,
            maxAnnualIncome: maxAnnualIncome,
            active: true
        });

        emit SchemeCreated(schemeId, name, totalBudget, maxAwardPerStudent, minCGPA, maxAnnualIncome);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 1 – STUDENT REGISTRATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register yourself as a student. Only the student's own wallet.
     * @param name         Full name.
     * @param collegeName  College the student is enrolled in.
     * @param documentHash keccak256 hash of off-chain documents (mark sheets, income cert, ID).
     */
    function registerStudent(
        string calldata name,
        string calldata collegeName,
        bytes32 documentHash
    ) external {
        require(!students[msg.sender].registered, "ScholarshipSystem: already registered");
        require(bytes(name).length > 0, "ScholarshipSystem: name empty");
        require(documentHash != bytes32(0), "ScholarshipSystem: document hash required");

        students[msg.sender] = Student({
            wallet: msg.sender,
            name: name,
            collegeName: collegeName,
            documentHash: documentHash,
            registered: true,
            enrolled: false
        });

        emit StudentRegistered(msg.sender, name, collegeName, documentHash);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 2 – APPLICATION SUBMISSION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Apply for a scholarship scheme.
     * @param schemeId           ID of the target scheme.
     * @param cgpa               Self-reported CGPA ×100 (e.g. 820 = 8.20).
     * @param selfReportedIncome Annual family income (same unit as scheme budget).
     * @dev   Blocks duplicate applications for the same scheme.
     */
    function applyForScholarship(
        uint256 schemeId,
        uint256 cgpa,
        uint256 selfReportedIncome
    ) external returns (uint256 appId) {
        Student storage s = students[msg.sender];
        require(s.registered, "ScholarshipSystem: student not registered");

        Scheme storage sc = schemes[schemeId];
        require(sc.id != 0 && sc.active, "ScholarshipSystem: scheme not found or inactive");

        // Block duplicate applications
        require(
            _studentSchemeApp[msg.sender][schemeId] == 0,
            "ScholarshipSystem: duplicate application for this scheme"
        );

        applicationCount++;
        appId = applicationCount;

        applications[appId] = Application({
            id: appId,
            schemeId: schemeId,
            student: msg.sender,
            selfReportedIncome: selfReportedIncome,
            cgpa: cgpa,
            awardAmount: 0,
            status: Status.Applied,
            rejectionReason: RejectionReason.None,
            bankTransferRef: "",
            appliedAt: block.timestamp,
            lastUpdatedAt: block.timestamp
        });

        _studentSchemeApp[msg.sender][schemeId] = appId;

        emit ApplicationSubmitted(appId, msg.sender, schemeId, cgpa, selfReportedIncome);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 3 – COLLEGE VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice College node verifies enrollment and document authenticity.
     * @param appId  Application to verify.
     * @dev   Marks the student's enrolled flag and moves application to Verified.
     */
    function verifyApplication(uint256 appId)
        external
        onlyCollege
        applicationExists(appId)
    {
        Application storage app = applications[appId];
        require(app.status == Status.Applied, "ScholarshipSystem: application not in Applied state");

        students[app.student].enrolled = true;
        app.status = Status.Verified;
        app.lastUpdatedAt = block.timestamp;

        emit ApplicationVerified(appId, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 4 (OPTIONAL) – ORACLE INCOME SUBMISSION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Oracle submits verified income data, overriding student self-report.
     * @param appId          Application ID.
     * @param verifiedIncome Oracle-confirmed annual family income.
     * @dev   Only callable after Verified state.
     */
    function submitOracleIncome(uint256 appId, uint256 verifiedIncome)
        external
        onlyOracle
        applicationExists(appId)
    {
        Application storage app = applications[appId];
        require(app.status == Status.Verified, "ScholarshipSystem: application not in Verified state");

        app.selfReportedIncome = verifiedIncome; // oracle overwrites the field
        app.lastUpdatedAt = block.timestamp;

        emit OracleIncomeSubmitted(appId, msg.sender, verifiedIncome);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 5 – ELIGIBILITY EVALUATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Authority evaluates eligibility rules and sets Eligible or Rejected.
     * @param appId Application ID.
     * @dev   Rules checked in order; first failure sets the rejection reason.
     *        Rules: enrolled, min CGPA, max income, remaining budget.
     */
    function evaluateEligibility(uint256 appId)
        external
        onlyAuthority
        applicationExists(appId)
    {
        Application storage app = applications[appId];
        require(app.status == Status.Verified, "ScholarshipSystem: application not in Verified state");

        Scheme storage sc = schemes[app.schemeId];
        Student storage st = students[app.student];

        // Rule 1: Enrollment
        if (!st.enrolled) {
            _reject(appId, RejectionReason.NotEnrolled, "Student not enrolled per college verification");
            return;
        }

        // Rule 2: CGPA
        if (app.cgpa < sc.minCGPA) {
            _reject(appId, RejectionReason.LowCGPA, "CGPA below scheme minimum");
            return;
        }

        // Rule 3: Income (uses oracle-overridden value if available)
        if (app.selfReportedIncome > sc.maxAnnualIncome) {
            _reject(appId, RejectionReason.IncomeExceeds, "Annual family income exceeds scheme cap");
            return;
        }

        // Rule 4: Budget
        if (sc.budgetRemaining < sc.maxAwardPerStudent) {
            _reject(appId, RejectionReason.BudgetExhausted, "Scheme budget exhausted");
            return;
        }

        app.status = Status.Eligible;
        app.lastUpdatedAt = block.timestamp;

        emit EligibilityEvaluated(appId, true, RejectionReason.None);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 6 – AUTHORITY APPROVAL
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Authority formally approves an eligible application.
     * @param appId       Application ID.
     * @param awardAmount Exact amount approved (must be <= scheme maxAwardPerStudent).
     */
    function approveApplication(uint256 appId, uint256 awardAmount)
        external
        onlyAuthority
        applicationExists(appId)
    {
        Application storage app = applications[appId];
        require(app.status == Status.Eligible, "ScholarshipSystem: application not Eligible");

        Scheme storage sc = schemes[app.schemeId];
        require(awardAmount > 0 && awardAmount <= sc.maxAwardPerStudent, "ScholarshipSystem: invalid award amount");

        app.awardAmount = awardAmount;
        app.status = Status.Approved;
        app.lastUpdatedAt = block.timestamp;

        emit ApplicationApproved(appId, msg.sender, awardAmount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 7 – FUND ALLOCATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Authority ring-fences budget for the approved application.
     * @param appId Application ID.
     */
    function allocateFunds(uint256 appId)
        external
        onlyAuthority
        applicationExists(appId)
    {
        Application storage app = applications[appId];
        require(app.status == Status.Approved, "ScholarshipSystem: application not Approved");

        Scheme storage sc = schemes[app.schemeId];
        require(sc.budgetRemaining >= app.awardAmount, "ScholarshipSystem: insufficient scheme budget");

        sc.budgetRemaining -= app.awardAmount;
        app.status = Status.Allocated;
        app.lastUpdatedAt = block.timestamp;

        emit FundsAllocated(appId, app.schemeId, app.awardAmount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 8 – DISBURSEMENT (bank-transfer reference)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Record the bank transfer reference once actual payment is sent off-chain.
     * @param appId           Application ID.
     * @param bankTransferRef Bank / NEFT / RTGS reference string provided by the bank.
     * @dev   No Ether moves. This is purely a reference-record on-chain.
     */
    function recordDisbursement(uint256 appId, string calldata bankTransferRef)
        external
        onlyAuthority
        applicationExists(appId)
    {
        Application storage app = applications[appId];
        require(app.status == Status.Allocated, "ScholarshipSystem: application not Allocated");
        require(bytes(bankTransferRef).length > 0, "ScholarshipSystem: transfer reference required");

        app.bankTransferRef = bankTransferRef;
        app.status = Status.Disbursed;
        app.lastUpdatedAt = block.timestamp;

        emit DisbursementRecorded(appId, app.student, app.awardAmount, bankTransferRef);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev Internal helper to mark an application as Rejected with a reason.
     */
    function _reject(uint256 appId, RejectionReason reason, string memory description) internal {
        Application storage app = applications[appId];
        app.status = Status.Rejected;
        app.rejectionReason = reason;
        app.lastUpdatedAt = block.timestamp;

        emit EligibilityEvaluated(appId, false, reason);
        emit ApplicationRejected(appId, reason, description);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW / QUERY FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Retrieve full application data (auditor-facing).
     */
    function getApplication(uint256 appId)
        external
        view
        applicationExists(appId)
        returns (Application memory)
    {
        return applications[appId];
    }

    /**
     * @notice Retrieve student data.
     */
    function getStudent(address wallet) external view returns (Student memory) {
        return students[wallet];
    }

    /**
     * @notice Retrieve scheme data.
     */
    function getScheme(uint256 schemeId) external view returns (Scheme memory) {
        require(schemeId > 0 && schemeId <= schemeCount, "ScholarshipSystem: scheme does not exist");
        return schemes[schemeId];
    }

    /**
     * @notice Get the application ID for a student-scheme pair (0 if none).
     */
    function getStudentSchemeApp(address student, uint256 schemeId) external view returns (uint256) {
        return _studentSchemeApp[student][schemeId];
    }

    /**
     * @notice Return summary counts.
     */
    function getSummary() external view returns (
        uint256 totalSchemes,
        uint256 totalApplications,
        address authorityAddr,
        address oracleAddr
    ) {
        return (schemeCount, applicationCount, authority, oracle);
    }

    /**
     * @notice Check if an address is a registered college.
     */
    function isCollege(address addr) external view returns (bool) {
        return colleges[addr];
    }

    /**
     * @notice Check if an address is a registered auditor.
     */
    function isAuditor(address addr) external view returns (bool) {
        return auditors[addr];
    }
}
