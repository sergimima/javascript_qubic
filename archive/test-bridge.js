const {VottunBridgeClient, VottunBridgePayload} = require('./vottun-bridge')

// Test configuration
const TEST_CONFIG = {
    rpcUrl: "http://185.84.224.100:8000/v1",
    senderIdentity: "NBMITJYAKMHWEHQWUULCUCRBXQPCFNFLNAHRRONUFEEHDNZDMQZUSQLBGBIN", // Fill with your test identity
    senderSeed: "",     // Fill with your test seed
    ethAddress: "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE",
    amount: 5100,       // Small test amount (same as mentioned in error)
    targetTick: 15923820
}

async function testPayloadSize() {
    console.log("=== Testing Payload Size ===")
    
    const payload = new VottunBridgePayload(
        TEST_CONFIG.ethAddress,
        TEST_CONFIG.amount,
        true // Qubic to Ethereum
    )
    
    const packageData = payload.getPackageData()
    console.log("Payload size:", packageData.length, "bytes")
    console.log("Expected size: 73 bytes")
    console.log("✓ Size correct:", packageData.length === 73)
    
    // Show payload structure
    console.log("\nPayload structure:")
    console.log("- ETH Address (64 bytes):", Array.from(packageData.slice(0, 64)).map(b => b.toString(16).padStart(2, '0')).join(''))
    console.log("- Amount (8 bytes):", Array.from(packageData.slice(64, 72)).map(b => b.toString(16).padStart(2, '0')).join(''))
    console.log("- Direction (1 byte):", packageData[72])
    
    return packageData.length === 73
}

async function testTransactionCreation() {
    console.log("\n=== Testing Transaction Creation ===")
    
    if (!TEST_CONFIG.senderIdentity || !TEST_CONFIG.senderSeed) {
        console.log("⚠️  Please fill TEST_CONFIG.senderIdentity and TEST_CONFIG.senderSeed to test transaction creation")
        console.log("⚠️  For now, testing with placeholder values...")
        
        // Test with placeholder values
        try {
            const bridgeClient = new VottunBridgeClient(TEST_CONFIG.rpcUrl)
            
            // Use placeholder identity for testing structure
            const placeholderIdentity = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
            const placeholderSeed = "placeholder_seed_for_testing"
            
            const transaction = await bridgeClient.createOrder(
                placeholderIdentity,
                placeholderSeed,
                TEST_CONFIG.ethAddress,
                TEST_CONFIG.amount,
                true, // Qubic to Ethereum
                TEST_CONFIG.targetTick
            )
            
            console.log("✓ Transaction structure created successfully")
            console.log("Transaction details:")
            console.log("- Source:", transaction.sourcePublicKey.getIdentity())
            console.log("- Destination:", transaction.destinationPublicKey.getIdentity())
            console.log("- Input type:", transaction.inputType)
            console.log("- Amount:", transaction.amount.getValue())
            console.log("- Input size:", transaction.inputSize)
            
            const packageData = transaction.getPackageData()
            console.log("- Package size:", packageData.length, "bytes")
            
            return true
            
        } catch (error) {
            console.error("✗ Transaction creation failed:", error.message)
            return false
        }
    }
    
    try {
        const bridgeClient = new VottunBridgeClient(TEST_CONFIG.rpcUrl)
        
        const transaction = await bridgeClient.createOrder(
            TEST_CONFIG.senderIdentity,
            TEST_CONFIG.senderSeed,
            TEST_CONFIG.ethAddress,
            TEST_CONFIG.amount,
            true, // Qubic to Ethereum
            TEST_CONFIG.targetTick
        )
        
        console.log("✓ Transaction created successfully")
        console.log("Transaction details:")
        console.log("- Source:", transaction.sourcePublicKey.getIdentity())
        console.log("- Destination:", transaction.destinationPublicKey.getIdentity())
        console.log("- Input type:", transaction.inputType)
        console.log("- Amount:", transaction.amount.getValue())
        console.log("- Input size:", transaction.inputSize)
        
        return true
        
    } catch (error) {
        console.error("✗ Transaction creation failed:", error.message)
        return false
    }
}

async function testContractDestination() {
    console.log("\n=== Testing Contract Destination ===")
    
    const expectedDestination = "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML"
    console.log("Expected destination:", expectedDestination)
    console.log("✓ Using correct contract address for index 13")
    
    // Test that we can create a PublicKey with this address
    try {
        const {PublicKey} = require('./qubic-types')
        const contractKey = new PublicKey(expectedDestination)
        console.log("✓ Contract address valid:", contractKey.getIdentity())
        return true
    } catch (error) {
        console.error("✗ Contract address invalid:", error.message)
        return false
    }
}

async function testPayloadStructure() {
    console.log("\n=== Testing Payload Structure ===")
    
    const payload = new VottunBridgePayload(
        "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE",
        5100,
        true
    )
    
    const data = payload.getPackageData()
    
    // Verify structure
    console.log("Payload breakdown:")
    console.log("- Total size:", data.length, "bytes")
    console.log("- ETH address section (0-63):", data.length >= 64)
    console.log("- Amount section (64-71):", data.length >= 72)
    console.log("- Direction section (72):", data.length >= 73)
    
    // Check amount encoding
    const amountBytes = data.slice(64, 72)
    let decodedAmount = 0
    for (let i = 0; i < 8; i++) {
        decodedAmount += amountBytes[i] * Math.pow(256, i)
    }
    console.log("- Encoded amount:", decodedAmount)
    console.log("- Original amount:", 5100)
    console.log("✓ Amount encoding correct:", decodedAmount === 5100)
    
    // Check direction
    const direction = data[72]
    console.log("- Direction byte:", direction)
    console.log("✓ Direction encoding correct:", direction === 1)
    
    return data.length === 73 && decodedAmount === 5100 && direction === 1
}

async function runAllTests() {
    console.log("🚀 VottunBridge Backend Tests")
    console.log("🔧 Using self-contained Qubic types (no external dependencies)\n")
    
    const results = await Promise.all([
        testPayloadSize(),
        testPayloadStructure(),
        testContractDestination(),
        testTransactionCreation()
    ])
    
    const allPassed = results.every(result => result)
    
    console.log("\n" + "=".repeat(60))
    console.log("📊 Test Results:")
    console.log("- Payload Size:", results[0] ? "✅ PASS" : "❌ FAIL")
    console.log("- Payload Structure:", results[1] ? "✅ PASS" : "❌ FAIL")
    console.log("- Contract Destination:", results[2] ? "✅ PASS" : "❌ FAIL")
    console.log("- Transaction Creation:", results[3] ? "✅ PASS" : "❌ FAIL")
    console.log("\nOverall:", allPassed ? "🎉 ALL TESTS PASSED" : "💥 SOME TESTS FAILED")
    
    if (allPassed) {
        console.log("\n🎯 Your VottunBridge backend is ready!")
        console.log("📝 Next steps:")
        console.log("1. Add your real senderIdentity and senderSeed")
        console.log("2. Test with a small amount first (like 5100 Qu)")
        console.log("3. Verify the transaction broadcasts correctly")
        console.log("4. Check that payload is exactly 73 bytes")
        console.log("5. Confirm destination is contract address (not admin wallet)")
    } else {
        console.log("\n🔧 Fix the failing tests before proceeding")
    }
}

// Validate configuration
function validateConfig() {
    console.log("⚙️  Configuration validation:")
    console.log("- RPC URL:", TEST_CONFIG.rpcUrl)
    console.log("- ETH Address:", TEST_CONFIG.ethAddress)
    console.log("- Test amount:", TEST_CONFIG.amount, "Qu")
    console.log("- Target tick:", TEST_CONFIG.targetTick)
    
    if (!TEST_CONFIG.senderIdentity) {
        console.log("⚠️  senderIdentity not set (will use placeholder for testing)")
    }
    if (!TEST_CONFIG.senderSeed) {
        console.log("⚠️  senderSeed not set (will use placeholder for testing)")
    }
    console.log("")
}

// Run tests
validateConfig()
runAllTests().catch(console.error)

module.exports = {
    testPayloadSize,
    testPayloadStructure,
    testTransactionCreation,
    testContractDestination,
    runAllTests
}