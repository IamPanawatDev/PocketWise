/**
 * PocketWise Advanced Security & Penetration Testing Suite
 * OWASP API Security Top 10 Assessment
 * Focus Areas:
 *  1. JWT Integrity & Tampering Attacks (Alg none, Signature forged, Sub altered, Role elevated)
 *  2. Refresh Token Rotation & Replay Attack Defense (RFC 6749 / BCP)
 *  3. Insecure Direct Object References (IDOR / Cross-Tenant Horizontal Privilege Escalation)
 *  4. Mass Assignment Vulnerability Auditing
 *  5. Brute Force & Credential Stuffing Telemetry (SecurityEvents Logging)
 *  6. Information Disclosure & Exception Leaks
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const API_BASE = 'http://localhost:5268';
const EVIDENCE_DIR = 'C:\\Users\\Panawat\\.gemini\\antigravity\\brain\\8bb74052-adb4-434d-88c6-dac298c527de\\security_deep_audit';

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Master Security Assessment Matrix
const secAuditMatrix = {
  timestamp: new Date().toISOString(),
  target: API_BASE,
  auditor: 'Senior Application Security Specialist',
  standards: ['OWASP Top 10:2021', 'OWASP API Security Top 10:2023'],
  summary: { total: 0, passed: 0, failed: 0 },
  results: []
};

function recordSecTest(id, owaspCategory, testName, expectedStatus, actualStatus, passCondition, details = {}) {
  const passed = Boolean(passCondition);
  secAuditMatrix.summary.total++;
  if (passed) secAuditMatrix.summary.passed++;
  else secAuditMatrix.summary.failed++;

  const entry = {
    id,
    owaspCategory,
    testName,
    expectedStatus,
    actualStatus,
    status: passed ? 'SECURE (PASS)' : 'VULNERABLE (FAIL)',
    details
  };
  secAuditMatrix.results.push(entry);

  const icon = passed ? '🛡️ [SECURE]' : '🚨 [VULN]';
  console.log(`${icon} [${id}] [${owaspCategory}] ${testName} -> Expected: ${expectedStatus}, Actual: ${actualStatus}`);
}

async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers
  };
  if (body) options.body = typeof body === 'string' ? body : JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    let data = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, data: { error: err.message } };
  }
}

// Helper to construct custom test JWTs
function buildTestJwt(header, payload, secret = null) {
  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  let signature = '';
  if (secret) {
    signature = crypto.createHmac('sha256', secret).update(`${encHeader}.${encPayload}`).digest('base64url');
  }
  return `${encHeader}.${encPayload}.${signature}`;
}

async function runPenetrationSuite() {
  console.log('======================================================================');
  console.log('   POCKETWISE DEEP APPLICATION SECURITY & PENETRATION AUDIT');
  console.log('   Target: ASP.NET Core 10 Web API (Localhost:5268)');
  console.log('======================================================================\n');

  // ----------------------------------------------------------------------
  // SETUP: Authenticate Two Distinct Users (User A = Member, User B = Admin)
  // ----------------------------------------------------------------------
  console.log('[Setup] Authenticating test subjects...');
  
  // Subject A: Member (qa.tester.check@pocketwise.local)
  const loginMember = await apiCall('/api/v1/auth/login', 'POST', {
    email: 'qa.tester.check@pocketwise.local',
    password: 'Password123!'
  });
  if (!loginMember.ok) throw new Error('Member authentication failed');
  const memberToken = loginMember.data.data.accessToken;
  const memberRefreshToken = loginMember.data.data.refreshToken;
  const memberId = loginMember.data.data.user.id;
  console.log(` -> Subject A (Member) Authenticated. Id: ${memberId}`);

  // Subject B: Admin (famreplay@gmail.com)
  const loginAdmin = await apiCall('/api/v1/auth/login', 'POST', {
    email: 'famreplay@gmail.com',
    password: 'famreplay09'
  });
  if (!loginAdmin.ok) throw new Error('Admin authentication failed');
  const adminToken = loginAdmin.data.data.accessToken;
  const adminId = loginAdmin.data.data.user.id;
  console.log(` -> Subject B (Admin) Authenticated. Id: ${adminId}\n`);

  // ======================================================================
  // MODULE 1: JWT INTEGRITY & CRYPTOGRAPHIC TAMPERING (API2:2023 Broken Auth)
  // ======================================================================
  console.log('--- MODULE 1: JWT INTEGRITY & CRYPTOGRAPHIC TAMPERING ---');

  // 1.1 Tampered Token Signature (Sub changed from Member to Admin with original signature)
  const [h64, p64, s64] = memberToken.split('.');
  const origPayload = JSON.parse(Buffer.from(p64, 'base64url').toString('utf8'));
  const tamperedPayload = { ...origPayload, sub: String(adminId), email: 'famreplay@gmail.com' };
  const tamperedTokenWithOldSig = `${h64}.${Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url')}.${s64}`;
  
  const test1_1 = await apiCall('/api/v1/auth/me', 'GET', null, tamperedTokenWithOldSig);
  recordSecTest(
    'PENTEST-JWT-01',
    'API2:2023 Broken Authentication',
    'Tampered Payload with Original Signature (Privilege Forgery)',
    401,
    test1_1.status,
    test1_1.status === 401,
    { reason: 'Tampered token rejected by cryptographic signature validator' }
  );

  // 1.2 Algorithm None Attack (alg: "none")
  const noneAlgToken = buildTestJwt(
    { alg: 'none', typ: 'JWT' },
    { ...origPayload, sub: String(adminId), role: 'Admin' },
    null
  );
  const test1_2 = await apiCall('/api/v1/admin/overview', 'GET', null, noneAlgToken);
  recordSecTest(
    'PENTEST-JWT-02',
    'API2:2023 Broken Authentication',
    'Algorithm None Attack (CVE-2015-9235 defense)',
    401,
    test1_2.status,
    test1_2.status === 401,
    { reason: 'Unsigned / alg:none token strictly rejected' }
  );

  // 1.3 Forged Token Signed with Arbitrary/Weak Key
  const fakeKeyToken = buildTestJwt(
    { alg: 'HS256', typ: 'JWT' },
    { ...origPayload, sub: String(adminId), role: 'Admin' },
    'arbitrary-attacker-secret-key-1234567890'
  );
  const test1_3 = await apiCall('/api/v1/admin/overview', 'GET', null, fakeKeyToken);
  recordSecTest(
    'PENTEST-JWT-03',
    'API2:2023 Broken Authentication',
    'Token Signed with Foreign Key (Signature Spoofing)',
    401,
    test1_3.status,
    test1_3.status === 401,
    { reason: 'Foreign signature rejected' }
  );

  // 1.4 Expired Token Lifespan Check
  const expiredPayload = {
    ...origPayload,
    exp: Math.floor(Date.now() / 1000) - 3600 // expired 1 hour ago
  };
  const expiredToken = buildTestJwt(
    { alg: 'HS256', typ: 'JWT' },
    expiredPayload,
    'PocketWise-Dev-Secret-Key-Do-Not-Use-In-Production-123!'
  );
  const test1_4 = await apiCall('/api/v1/auth/me', 'GET', null, expiredToken);
  recordSecTest(
    'PENTEST-JWT-04',
    'API2:2023 Broken Authentication',
    'Expired Token Acceptance (Zero ClockSkew Validation)',
    401,
    test1_4.status,
    test1_4.status === 401,
    { reason: 'Expired token strictly denied' }
  );

  // 1.5 Malformed Garbage Bearer Token
  const test1_5 = await apiCall('/api/v1/auth/me', 'GET', null, 'malformed_jwt_token_string_xxx');
  recordSecTest(
    'PENTEST-JWT-05',
    'API2:2023 Broken Authentication',
    'Malformed Garbage Token Header',
    401,
    test1_5.status,
    test1_5.status === 401,
    { reason: 'Garbage token refused cleanly' }
  );

  // ======================================================================
  // MODULE 2: REFRESH TOKEN ROTATION & REPLAY ATTACK (OAuth 2.0 Security BCP)
  // ======================================================================
  console.log('\n--- MODULE 2: REFRESH TOKEN ROTATION & REPLAY ATTACK DEFENSE ---');

  // Step 2.1: Legitimate Token Refresh
  const refresh1 = await apiCall('/api/v1/auth/refresh', 'POST', {
    refreshToken: memberRefreshToken
  });
  const refresh1Ok = refresh1.status === 200 && refresh1.data?.data?.accessToken;
  const newRefreshToken = refresh1.data?.data?.refreshToken;
  recordSecTest(
    'PENTEST-REFRESH-01',
    'API2:2023 Broken Authentication',
    'Legitimate Refresh Token Exchange (Generates New Token Pair)',
    200,
    refresh1.status,
    refresh1Ok,
    { reason: 'Refresh issued new token pair successfully' }
  );

  // Step 2.2: Replay Attack (Reusing old/already rotated Refresh Token)
  console.log('[Attack] Attempting Refresh Token Replay Attack with previously consumed token...');
  const replayAttack = await apiCall('/api/v1/auth/refresh', 'POST', {
    refreshToken: memberRefreshToken // Old rotated token
  });
  recordSecTest(
    'PENTEST-REFRESH-02',
    'API2:2023 Broken Authentication',
    'Refresh Token Replay Attack (Rotated Token Reuse)',
    401,
    replayAttack.status,
    replayAttack.status === 401,
    { reason: 'Reused refresh token rejected per OAuth 2.0 BCP rotation' }
  );

  // Step 2.3: Session Logout Revocation
  console.log('[Test] Testing Session Logout Revocation...');
  // Login temporary user to test logout
  const tempLogin = await apiCall('/api/v1/auth/login', 'POST', {
    email: 'qa.tester.check@pocketwise.local',
    password: 'Password123!'
  });
  const tempToken = tempLogin.data.data.accessToken;
  const tempRefreshToken = tempLogin.data.data.refreshToken;

  // Perform Logout
  const logoutRes = await apiCall('/api/v1/auth/logout', 'POST', null, tempToken);
  
  // Try to use revoked refresh token after logout
  const postLogoutRefresh = await apiCall('/api/v1/auth/refresh', 'POST', {
    refreshToken: tempRefreshToken
  });
  recordSecTest(
    'PENTEST-REFRESH-03',
    'API2:2023 Broken Authentication',
    'Revocation on Logout (Refresh token invalidated upon user logout)',
    401,
    postLogoutRefresh.status,
    postLogoutRefresh.status === 401,
    { reason: 'Refresh token revoked after user logout' }
  );

  // Step 2.4: Bogus / Fake Refresh Token Check
  const fakeRefreshToken = await apiCall('/api/v1/auth/refresh', 'POST', {
    refreshToken: 'completely-fake-unregistered-refresh-token-123456789'
  });
  recordSecTest(
    'PENTEST-REFRESH-04',
    'API2:2023 Broken Authentication',
    'Unregistered / Fake Refresh Token Rejection',
    401,
    fakeRefreshToken.status,
    fakeRefreshToken.status === 401,
    { reason: 'Fake refresh token strictly rejected' }
  );

  // ======================================================================
  // MODULE 3: IDOR & CROSS-TENANT DATA ISOLATION (API1:2023 Broken Object Level Auth)
  // ======================================================================
  console.log('\n--- MODULE 3: IDOR & CROSS-TENANT DATA ISOLATION (BOLA) ---');

  // Step 3.0: Create Private Assets for Subject A (Member)
  const memberPrivateAcc = await apiCall('/api/v1/bank-accounts', 'POST', {
    bankName: 'ธนาคารความลับ A',
    accountName: `ความลับเฉพาะ User A ${Date.now()}`,
    accountType: 'Bank'
  }, memberToken);
  const memberAccId = memberPrivateAcc.data?.data?.bankAccountId || memberPrivateAcc.data?.data?.id;

  const memberPrivateTx = await apiCall('/api/v1/transactions', 'POST', {
    amount: 99999,
    currencyCode: 'THB',
    type: 'Expense',
    transactionDate: new Date().toISOString(),
    description: 'ธุรกรรมลับ User A',
    bankAccountId: memberAccId
  }, memberToken);
  const memberTxId = memberPrivateTx.data?.data?.transactionId || memberPrivateTx.data?.data?.id;

  console.log(` -> Subject A created secret asset: BankAccountId ${memberAccId}, TransactionId ${memberTxId}`);

  // 3.1 IDOR Read Attack: Subject B (Admin / Another User) tries to read Subject A's Bank Account
  const idorReadAcc = await apiCall(`/api/v1/bank-accounts/${memberAccId}`, 'GET', null, adminToken);
  recordSecTest(
    'PENTEST-IDOR-01',
    'API1:2023 Broken Object Level Authorization',
    'Cross-Tenant Bank Account Read (IDOR attempt on other user account)',
    404,
    idorReadAcc.status,
    idorReadAcc.status === 404,
    { reason: 'Cross-user account access hidden with 404 Not Found' }
  );

  // 3.2 IDOR Update Attack: Subject B tries to modify Subject A's Bank Account
  const idorUpdateAcc = await apiCall(`/api/v1/bank-accounts/${memberAccId}`, 'PUT', {
    bankName: 'ธนาคารที่ถูกแฮก',
    accountName: 'บัญชีถูกดัดแปลงโดยผู้ใช้อื่น',
    accountType: 'Bank'
  }, adminToken);
  recordSecTest(
    'PENTEST-IDOR-02',
    'API1:2023 Broken Object Level Authorization',
    'Cross-Tenant Bank Account Modification (IDOR tampering attempt)',
    404,
    idorUpdateAcc.status,
    idorUpdateAcc.status === 404,
    { reason: 'Cross-user account modification blocked' }
  );

  // 3.3 IDOR Read Attack: Subject B tries to read Subject A's Private Transaction
  const idorReadTx = await apiCall(`/api/v1/transactions/${memberTxId}`, 'GET', null, adminToken);
  recordSecTest(
    'PENTEST-IDOR-03',
    'API1:2023 Broken Object Level Authorization',
    'Cross-Tenant Transaction Inspection (IDOR spy attempt)',
    404,
    idorReadTx.status,
    idorReadTx.status === 404,
    { reason: 'Cross-user transaction access hidden with 404 Not Found' }
  );

  // 3.4 IDOR Update Attack: Subject B tries to alter Subject A's Private Transaction
  const idorUpdateTx = await apiCall(`/api/v1/transactions/${memberTxId}`, 'PUT', {
    amount: 1,
    currencyCode: 'THB',
    type: 'Expense',
    transactionDate: new Date().toISOString(),
    description: 'แอบแก้รายการคนอื่น'
  }, adminToken);
  recordSecTest(
    'PENTEST-IDOR-04',
    'API1:2023 Broken Object Level Authorization',
    'Cross-Tenant Transaction Alteration (IDOR financial tampering)',
    404,
    idorUpdateTx.status,
    idorUpdateTx.status === 404,
    { reason: 'Cross-user transaction edit blocked' }
  );

  // 3.5 IDOR Delete Attack: Subject B tries to delete Subject A's Private Transaction
  const idorDeleteTx = await apiCall(`/api/v1/transactions/${memberTxId}`, 'DELETE', null, adminToken);
  recordSecTest(
    'PENTEST-IDOR-05',
    'API1:2023 Broken Object Level Authorization',
    'Cross-Tenant Transaction Deletion (IDOR sabotage attempt)',
    404,
    idorDeleteTx.status,
    idorDeleteTx.status === 404,
    { reason: 'Cross-user transaction deletion blocked' }
  );

  // ======================================================================
  // MODULE 4: MASS ASSIGNMENT & PRIVILEGE ESCALATION (API3:2023 Broken Object Property)
  // ======================================================================
  console.log('\n--- MODULE 4: MASS ASSIGNMENT & PROPERTY INJECTION ---');

  // 4.1 Member attempts to inject 'roles' or 'isAdmin' via Profile Update
  const massAssignPayload = {
    displayName: 'Hacked Self Admin',
    email: 'qa.tester.check@pocketwise.local',
    roles: ['Admin', 'SuperAdmin'],
    isAdmin: true,
    isSuspended: false,
    emailConfirmed: true
  };
  const massAssignRes = await apiCall('/api/v1/auth/me', 'PUT', massAssignPayload, memberToken);
  
  // Verify member's current profile does NOT have 'Admin' role
  const checkProfile = await apiCall('/api/v1/auth/me', 'GET', null, memberToken);
  const rolesArray = checkProfile.data?.data?.roles || [];
  const isElevated = rolesArray.includes('Admin');
  recordSecTest(
    'PENTEST-MASS-01',
    'API3:2023 Broken Object Property Level Auth',
    'Mass Assignment: Role Injection in Profile Update',
    'Roles Unchanged (Member)',
    isElevated ? 'Elevated to Admin!' : 'Role remains Member',
    !isElevated,
    { roles: rolesArray, reason: 'DTO ignores undeclared privilege fields' }
  );

  // ======================================================================
  // MODULE 5: BRUTE FORCE TELEMETRY & SECURITY EVENTS LOGGING
  // ======================================================================
  console.log('\n--- MODULE 5: BRUTE FORCE & AUDIT TRAIL LOGGING ---');

  // Trigger failed login attempts
  for (let i = 1; i <= 3; i++) {
    await apiCall('/api/v1/auth/login', 'POST', {
      email: 'famreplay@gmail.com',
      password: `WrongPasswordAttempt${i}!`
    });
  }

  // Admin checks SecurityEvents table via Admin API
  const secEventsRes = await apiCall('/api/v1/admin/security-events?pageSize=10', 'GET', null, adminToken);
  const hasAuditEvents = secEventsRes.status === 200 && Array.isArray(secEventsRes.data?.data?.items);
  const failedLoginLogged = hasAuditEvents && secEventsRes.data.data.items.some(e => e.eventType === 'LOGIN_FAILED');
  recordSecTest(
    'PENTEST-AUDIT-01',
    'API10:2023 Unsafe Consumption / Logging',
    'Security Event Logging on Authentication Failures',
    200,
    secEventsRes.status,
    failedLoginLogged,
    { reason: 'LOGIN_FAILED security events recorded in audit log' }
  );

  // ======================================================================
  // MODULE 6: INFORMATION DISCLOSURE & EXCEPTION LEAKS
  // ======================================================================
  console.log('\n--- MODULE 6: INFORMATION DISCLOSURE & EXCEPTION LEAKS ---');

  // Send malformed JSON payload
  const malformedRes = await apiCall('/api/v1/transactions', 'POST', '{"malformed_json: missing_brace', memberToken);
  const leaksStackTrace = JSON.stringify(malformedRes.data).includes('Exception') && 
                          (JSON.stringify(malformedRes.data).includes('line') || JSON.stringify(malformedRes.data).includes('StackTrace'));
  recordSecTest(
    'PENTEST-INFO-01',
    'API8:2023 Security Misconfiguration',
    'Malformed Request Stack Trace Leakage Prevention',
    400,
    malformedRes.status,
    malformedRes.status === 400 && !leaksStackTrace,
    { response: malformedRes.data }
  );

  // Save Results JSON
  const resultJsonPath = path.join(EVIDENCE_DIR, 'deep_security_matrix.json');
  fs.writeFileSync(resultJsonPath, JSON.stringify(secAuditMatrix, null, 2), 'utf-8');

  console.log('\n======================================================================');
  console.log('   DEEP APPLICATION SECURITY & PENETRATION AUDIT COMPLETED');
  console.log(`   Total Scenarios: ${secAuditMatrix.summary.total}`);
  console.log(`   Passed (Secure): ${secAuditMatrix.summary.passed} | Vulnerable (Failed): ${secAuditMatrix.summary.failed}`);
  console.log(`   Security Posture Rating: ${((secAuditMatrix.summary.passed / secAuditMatrix.summary.total) * 100).toFixed(1)}%`);
  console.log(`   Evidence Matrix: ${resultJsonPath}`);
  console.log('======================================================================\n');
}

runPenetrationSuite().catch(err => {
  console.error('Fatal penetration suite error:', err);
  process.exit(1);
});
