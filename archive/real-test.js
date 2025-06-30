const {VottunBridgeClient} = require('./vottun-bridge')

// CONFIGURATION - Replace with your real values
const CONFIG = {
    senderIdentity: "RLMOWDZKMDBPWASZUNIYFGQPEFHBQHXEMBSHUGXBPGGTXNCVLOWECGDBPCXL",  // ⚠️ REPLACE THIS
    senderSeed: "vtaakhxwtxxwtqidnevwbwskfcleeekrduxvplcvwhgrymbqweyzius",                   // ⚠️ REPLACE THIS
    rpcUrl: "http://185.84.224.10:8000/v1",               // Your original working URL
    targetTick: 23490101  // ✅ UPDATED from get-tick.js (current: 23490001 + 100)
}

// Test with small amount first
async function testRealTransaction() {
    console.log("🚀 Testing Real VottunBridge Transaction")
    console.log("⚠️  TESTING WITH SMALL AMOUNT FIRST!")
    console.log("=".repeat(50))
    
    // Validate configuration
    if (!CONFIG.senderIdentity || CONFIG.senderIdentity.includes("YOUR_")) {
        console.error("❌ Please set your real senderIdentity in CONFIG")
        console.error("💡 It should be 60 characters long, like: ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ12")
        return
    }
    
    if (!CONFIG.senderSeed || CONFIG.senderSeed.includes("your_")) {
        console.error("❌ Please set your real senderSeed in CONFIG")
        console.error("💡 This is your wallet seed phrase or private key")
        return
    }
    
    try {
        const bridgeClient = new VottunBridgeClient(CONFIG.rpcUrl)
        
        console.log("📝 Creating order with:")
        console.log("- From:", CONFIG.senderIdentity)
        console.log("- ETH Address: 0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE")
        console.log("- Amount: 5100 Qu (+ 25 Qu fee = 5125 total)")
        console.log("- Direction: Qubic → Ethereum")
        console.log("- Target Tick:", CONFIG.targetTick, "(current: 23490001 + 100)")
        
        console.log("\n🔧 Creating transaction...")
        
        const transaction = await bridgeClient.createOrder(
            CONFIG.senderIdentity,
            CONFIG.senderSeed,
            "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE",  // ETH address
            5100,        // Small test amount
            true,        // Qubic to Ethereum
            CONFIG.targetTick
        )
        
        console.log("\n✅ Transaction created successfully!")
        console.log("📦 Transaction details:")
        console.log("- Source:", transaction.sourcePublicKey.getIdentity())
        console.log("- Destination:", transaction.destinationPublicKey.getIdentity())
        console.log("- Amount:", transaction.amount.getValue(), "Qu")
        console.log("- Input Type:", transaction.inputType)
        console.log("- Input Size:", transaction.inputSize, "bytes")
        
        // Ask for confirmation before broadcasting
        console.log("\n⚠️  READY TO BROADCAST!")
        console.log("⚠️  This will send a REAL transaction to the network!")
        console.log("⚠️  Make sure you have at least 5125 Qu in your wallet")
        console.log("⚠️  This should fix the previous errors:")
        console.log("     ✅ Payload: 73 bytes (was 51)")
        console.log("     ✅ Destination: NAA... contract (was PXA... admin)")
        console.log("     ✅ Amount parsing: Should work correctly")
        
        console.log("\n💡 To broadcast, uncomment the next lines and run again:")
        console.log("// const result = await bridgeClient.broadcastTransaction(transaction)")
        console.log("// console.log('🎉 Order created:', result)")
        
        // Uncomment these lines when ready to broadcast:
        // console.log("\n📡 Broadcasting transaction...")
        // const result = await bridgeClient.broadcastTransaction(transaction)
        // console.log("🎉 Order created successfully:", result)
        
    } catch (error) {
        console.error("❌ Error:", error.message)
        if (error.message.includes("fetch")) {
            console.error("💡 Network error - check RPC URL:", CONFIG.rpcUrl)
        }
        if (error.message.includes("Identity")) {
            console.error("💡 Check your senderIdentity format (must be 60 chars)")
        }
    }
}

// Large amount example (for reference)
async function createLargeOrderExample() {
    console.log("\n" + "=".repeat(50))
    console.log("📚 Example for larger amounts:")
    
    const largeAmount = 1000000  // 1M Qu
    const fee = Math.floor(largeAmount * 0.005)  // 0.5%
    const total = largeAmount + fee
    
    console.log(`
// For ${largeAmount} Qu transfer:
const transaction = await bridgeClient.createOrder(
    "${CONFIG.senderIdentity}",
    "${CONFIG.senderSeed}",
    "0xYourEthereumAddress",
    ${largeAmount},        // ${largeAmount} Qu
    true,                  // Qubic → Ethereum  
    ${CONFIG.targetTick + 50}      // Updated target tick
)

// Fee: ${fee} Qu (0.5%)
// Total needed: ${total} Qu
`)
}

// Show current network status
function showNetworkStatus() {
    console.log("\n📊 CURRENT NETWORK STATUS:")
    console.log("- Current Tick: 23490001")
    console.log("- Target Tick: 23490101 (current + 100)")
    console.log("- Epoch: 159")
    console.log("- RPC URL: http://185.84.224.10:8000/v1")
    console.log("- Contract: NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML")
}

// Run the test
console.log("🎯 VottunBridge Real Transaction Test")
showNetworkStatus()

testRealTransaction().then(() => {
    createLargeOrderExample()
}).catch(console.error)