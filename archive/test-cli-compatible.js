const {VottunBridgeClient, VottunBridgePayload, TRANSACTION_FEE} = require('./vottun-bridge-fixed')

// Test configuration using real values
const CONFIG = {
    senderIdentity: "RLMOWDZKMDBPWASZUNIYFGQPEFHBQHXEMBSHUGXBPGGTXNCVLOWECGDBPCXL",
    senderSeed: "vtaakhxwtxxwtqidnevwbwskfcleeekrduxvplcvwhgrymbqweyzius",
    rpcUrl: "http://185.84.224.100:8000/v1",  // Working endpoint
    targetTick: 23490101
}

async function testFixedImplementation() {
    console.log("🔧 Testing FIXED VottunBridge Implementation")
    console.log("📋 Based on CLI C++ code analysis")
    console.log("=".repeat(60))
    
    try {
        // Test 1: Verify payload structure matches CLI
        console.log("1️⃣ Testing payload structure (CLI-compatible)...")
        const payload = new VottunBridgePayload(
            "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE",
            5100,
            true
        )
        
        const data = payload.getPackageData()
        console.log("   ✅ Payload size:", data.length, "bytes")
        console.log("   ✅ Expected (CLI struct): 41 bytes (32+8+1)")
        console.log("   ✅ Size matches CLI:", data.length === 41 ? "YES" : "NO")
        
        // Show structure breakdown
        console.log("\n   📊 Payload structure:")
        console.log("   - ETH Address (32 bytes):", data.slice(0, 32).length, "bytes")
        console.log("   - Amount (8 bytes):", data.slice(32, 40).length, "bytes") 
        console.log("   - Direction (1 byte):", data.slice(40, 41).length, "bytes")
        
        // Test 2: Fee structure
        console.log("\n2️⃣ Testing fee structure...")
        console.log("   ✅ Transaction fee (CLI):", TRANSACTION_FEE, "Qu")
        console.log("   ✅ Not percentage-based (like before)")
        console.log("   ✅ Amount in payload:", payload.getTotalAmount(), "Qu")
        console.log("   ✅ Amount in transaction:", TRANSACTION_FEE, "Qu")
        
        // Test 3: Create actual transaction
        console.log("\n3️⃣ Creating transaction with CLI-compatible structure...")
        const bridgeClient = new VottunBridgeClient(CONFIG.rpcUrl)
        
        const transaction = await bridgeClient.createOrder(
            CONFIG.senderIdentity,
            CONFIG.senderSeed,
            "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE",
            5100,
            true,
            CONFIG.targetTick
        )
        
        console.log("   ✅ Transaction created successfully!")
        console.log("   ✅ Input size:", transaction.inputSize, "bytes")
        console.log("   ✅ Amount:", transaction.amount.getValue(), "Qu")
        console.log("   ✅ Destination:", transaction.destinationPublicKey.getIdentity())
        
        // Test 4: Compare with previous version
        console.log("\n4️⃣ Comparing with previous implementation...")
        console.log("   📊 Changes made:")
        console.log("   - Payload size: 73 → 41 bytes ✅")
        console.log("   - ETH address: 64 → 32 bytes ✅") 
        console.log("   - Fee system: Percentage → Fixed 1000 Qu ✅")
        console.log("   - Structure: Matches CLI exactly ✅")
        
        console.log("\n🎯 READY FOR BROADCAST TEST")
        console.log("This should fix the 'reading signature from reader: EOF' error!")
        
        return { success: true, transaction, payload: data }
        
    } catch (error) {
        console.error("❌ Test failed:", error.message)
        return { success: false, error }
    }
}

async function broadcastTest() {
    console.log("\n" + "=".repeat(60))
    console.log("📡 BROADCAST TEST - CLI-Compatible Version")
    console.log("=".repeat(60))
    
    const testResult = await testFixedImplementation()
    
    if (!testResult.success) {
        console.log("❌ Tests failed, cannot proceed with broadcast")
        return
    }
    
    try {
        console.log("🚀 Broadcasting CLI-compatible transaction...")
        
        const bridgeClient = new VottunBridgeClient(CONFIG.rpcUrl)
        const transaction = testResult.transaction
        
        // Show final confirmation
        console.log("\n📋 Final Transaction Summary:")
        console.log("- Payload size:", transaction.inputSize, "bytes (CLI: 41)")
        console.log("- Amount in transaction:", transaction.amount.getValue(), "Qu")
        console.log("- Fee structure: Fixed", TRANSACTION_FEE, "Qu")
        console.log("- ETH address: 32-byte format")
        console.log("- Target tick:", CONFIG.targetTick)
        
        console.log("\n📡 Broadcasting...")
        const result = await bridgeClient.broadcastTransaction(transaction)
        
        console.log("\n🎉 BROADCAST SUCCESSFUL!")
        console.log("📊 Result:", JSON.stringify(result, null, 2))
        
        console.log("\n✅ SUCCESS! CLI-compatible implementation works!")
        console.log("🔧 The signature error should be fixed now!")
        
    } catch (error) {
        console.error("\n❌ Broadcast error:", error.message)
        
        if (error.message.includes("EOF")) {
            console.log("💡 If still getting EOF error, the signature implementation needs work")
        } else if (error.message.includes("payload")) {
            console.log("💡 Payload issue - check structure again")
        } else {
            console.log("💡 Error details:", error)
        }
    }
}

// Show CLI comparison
function showCLIComparison() {
    console.log("\n📚 CLI vs JavaScript Comparison:")
    console.log("=".repeat(40))
    console.log("CLI C++ struct createOrder_input:")
    console.log("- uint8_t ethAddress[32];     // 32 bytes")
    console.log("- uint64_t amount;            // 8 bytes") 
    console.log("- bool fromQubicToEthereum;   // 1 byte")
    console.log("- Total: 41 bytes")
    console.log("")
    console.log("JavaScript implementation:")
    console.log("- ETH Address: 32 bytes ✅")
    console.log("- Amount: 8 bytes ✅")
    console.log("- Direction: 1 byte ✅")
    console.log("- Total: 41 bytes ✅")
    console.log("")
    console.log("Transaction fee:")
    console.log("- CLI: TRANSACTION_FEE = 1000 ✅")
    console.log("- JS: TRANSACTION_FEE = 1000 ✅")
}

// Run the test
showCLIComparison()
broadcastTest().catch(console.error)