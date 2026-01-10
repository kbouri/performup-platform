/**
 * API Health Check Script
 * Tests all accounting API endpoints for accessibility and authentication
 * Run with: npx tsx scripts/test-accounting-apis.ts
 */

const API_BASE = "http://localhost:3000";

interface TestResult {
    endpoint: string;
    method: string;
    status: number;
    success: boolean;
    message: string;
}

const results: TestResult[] = [];

async function testEndpoint(
    method: string,
    endpoint: string,
    expectedStatus: number = 401
): Promise<TestResult> {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers: method === "POST" || method === "PUT" ? {
                "Content-Type": "application/json",
            } : undefined,
            body: method === "POST" || method === "PUT" ? JSON.stringify({}) : undefined,
        });

        const success = response.status === expectedStatus;
        const message = success
            ? `✅ Correctly returns ${expectedStatus}`
            : `❌ Expected ${expectedStatus}, got ${response.status}`;

        return {
            endpoint,
            method,
            status: response.status,
            success,
            message,
        };
    } catch (error) {
        return {
            endpoint,
            method,
            status: 0,
            success: false,
            message: `❌ Error: ${error}`,
        };
    }
}

async function runTests() {
    console.log("🧪 Testing Accounting API Endpoints...\n");

    // Quote API Tests
    console.log("📋 Quote API:");
    results.push(await testEndpoint("POST", "/api/admin/quotes"));
    results.push(await testEndpoint("GET", "/api/admin/quotes"));
    results.push(await testEndpoint("GET", "/api/admin/quotes/test-id", 401));
    results.push(await testEndpoint("PUT", "/api/admin/quotes/test-id"));
    results.push(await testEndpoint("POST", "/api/admin/quotes/test-id/send"));
    results.push(await testEndpoint("POST", "/api/admin/quotes/test-id/validate"));

    // Payment API Tests
    console.log("\n💰 Payment API:");
    results.push(await testEndpoint("POST", "/api/admin/payments/student"));
    results.push(await testEndpoint("POST", "/api/admin/payments/mentor"));
    results.push(await testEndpoint("POST", "/api/admin/payments/professor"));
    results.push(await testEndpoint("GET", "/api/admin/payments"));
    results.push(await testEndpoint("GET", "/api/admin/payments/test-id", 401));
    results.push(await testEndpoint("GET", "/api/admin/payments/student/test-id/schedules", 401));

    // Mission API Tests
    console.log("\n🎯 Mission API:");
    results.push(await testEndpoint("POST", "/api/admin/missions"));
    results.push(await testEndpoint("GET", "/api/admin/missions"));
    results.push(await testEndpoint("GET", "/api/admin/missions/test-id", 401));
    results.push(await testEndpoint("PUT", "/api/admin/missions/test-id"));
    results.push(await testEndpoint("POST", "/api/admin/missions/test-id/validate"));
    results.push(await testEndpoint("POST", "/api/admin/missions/test-id/reject"));
    results.push(await testEndpoint("GET", "/api/admin/missions/mentor/test-id", 401));
    results.push(await testEndpoint("GET", "/api/admin/missions/professor/test-id", 401));

    // Print results
    console.log("\n" + "=".repeat(80));
    console.log("📊 Test Results Summary\n");

    let passCount = 0;
    let failCount = 0;

    for (const result of results) {
        console.log(`${result.method.padEnd(6)} ${result.endpoint.padEnd(50)} ${result.message}`);
        if (result.success) passCount++;
        else failCount++;
    }

    console.log("\n" + "=".repeat(80));
    console.log(`\n✅ Passed: ${passCount}/${results.length}`);
    console.log(`❌ Failed: ${failCount}/${results.length}`);

    if (failCount === 0) {
        console.log("\n🎉 All API endpoints are accessible and properly protected!");
    } else {
        console.log("\n⚠️  Some endpoints failed. Check the results above.");
    }

    console.log("\n📝 Next Steps:");
    console.log("   1. Test with authenticated admin session");
    console.log("   2. Create test data (students, mentors, professors)");
    console.log("   3. Test full workflows (quote → payment → allocation)");
    console.log("   4. Verify journal entries are created correctly");
}

runTests().catch(console.error);
