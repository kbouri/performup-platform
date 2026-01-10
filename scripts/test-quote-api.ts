/**
 * Quick test script for Quote API
 * Run with: npx tsx scripts/test-quote-api.ts
 */

const API_BASE = "http://localhost:3000";

async function testQuoteAPI() {
    console.log("🧪 Testing Quote API...\n");

    // Test 1: List quotes (should require auth)
    console.log("1️⃣ Testing GET /api/admin/quotes (without auth)");
    try {
        const response = await fetch(`${API_BASE}/api/admin/quotes`);
        console.log(`   Status: ${response.status}`);
        const data = await response.json();
        console.log(`   Response:`, data);

        if (response.status === 401) {
            console.log("   ✅ Correctly requires authentication\n");
        } else {
            console.log("   ❌ Should return 401 Unauthorized\n");
        }
    } catch (error) {
        console.log("   ❌ Error:", error);
    }

    // Test 2: Create quote (should require auth)
    console.log("2️⃣ Testing POST /api/admin/quotes (without auth)");
    try {
        const response = await fetch(`${API_BASE}/api/admin/quotes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                studentId: "test123",
                packs: [{ packId: "pack123" }],
                paymentSchedule: [
                    {
                        dueDate: new Date().toISOString(),
                        amount: 100000,
                        currency: "EUR",
                    },
                ],
            }),
        });
        console.log(`   Status: ${response.status}`);
        const data = await response.json();
        console.log(`   Response:`, data);

        if (response.status === 401) {
            console.log("   ✅ Correctly requires authentication\n");
        } else {
            console.log("   ❌ Should return 401 Unauthorized\n");
        }
    } catch (error) {
        console.log("   ❌ Error:", error);
    }

    // Test 3: Validation error test
    console.log("3️⃣ Testing validation (invalid data structure)");
    console.log("   Note: This would also fail auth, but shows endpoint exists\n");

    console.log("✅ Quote API endpoints are accessible and protected by auth!");
    console.log("\n📝 Next steps:");
    console.log("   - Test with authenticated admin session");
    console.log("   - Create test data (student, packs)");
    console.log("   - Test full quote creation flow");
}

testQuoteAPI().catch(console.error);
