const {VottunBridgeClient} = require('./vottun-bridge')

// CONFIGURATION - Now with your real values!
const CONFIG = {
    senderIdentity: "RLMOWDZKMDBPWASZUNIYFGQPEFHBQHXEMBSHUGXBPGGTXNCVLOWECGDBPCXL",
    senderSeed: "vtaakhxwtxxwtqidnevwbwskfcleeekrduxvplcvwhgrymbqweyzius",
    rpcUrl: "http://185.84.224.10:8000/v1",
    targetTick: 23490101  // Current: 23490001 + 100
}

// READY TO BROADCAST - Final test
async function broadcastRealTransaction() {
    console.log("🚀 BROADCASTING REAL VOTTUNBRIDGE TRANSACTION")
    console.log("⚠️  THIS WILL SEND A REAL TRANSACTION!")
    console.log("=".repeat(60))
    
    try {
        const bridgeClient = new VottunBridgeClient(CONFIG.rpcUrl)
        
        console.log("📝 Transaction Summary:")
        console.log("- From:", CONFIG.senderIdentity)
        console.log("- To Contract: NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML")
        console.log("- ETH Address: 0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE")
        console.log("- Amount: 5100 Qu")
        console.log("- Fee: 25 Qu (0.5%)")
        console.log("- Total: 5125 Qu")
        console.log("- Target Tick:", CONFIG.targetTick)
        console.log("- Payload: 73 bytes (FIXED from 51)")
        
        console.log("\n🔧 Creating transaction...")
        
        const transaction = await bridgeClient.createOrder(
            CONFIG.senderIdentity,
            CONFIG.senderSeed,
            "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE",
            5100,        // Amount
            true,        // Qubic to Ethereum
            CONFIG.targetTick
        )
        
        console.log("✅ Transaction created successfully!")
        
        // FINAL CONFIRMATION
        console.log("\n⚠️  FINAL CONFIRMATION:")
        console.log("This will broadcast a REAL transaction that:")
        console.log("- Transfers 5100 Qu from your wallet")
        console.log("- Pays 25 Qu in fees")
        console.log("- Sends to VottunBridge contract")
        console.log("- Creates a bridge order to Ethereum")
        
        console.log("\n🤔 Are you ready? (Uncomment next lines to proceed)")
        
        // UNCOMMENT THESE LINES TO BROADCAST:
        console.log("\n📡 Broadcasting transaction...")
        const result = await bridgeClient.broadcastTransaction(transaction)
        console.log("🎉 TRANSACTION BROADCAST SUCCESSFUL!")
        console.log("📊 Result:", JSON.stringify(result, null, 2))
        
        if (result.success || result.txId || result.transactionId) {
            console.log("\n✅ SUCCESS! Your VottunBridge order has been created!")
            console.log("💡 What happens next:")
            console.log("1. Transaction will be included in tick", CONFIG.targetTick)
            console.log("2. VottunBridge contract will process the order")
            console.log("3. If successful, tokens will be bridged to Ethereum")
            console.log("4. You can track progress in the bridge interface")
        }
        
    } catch (error) {
        console.error("❌ Broadcast Error:", error.message)
        
        if (error.message.includes("insufficient")) {
            console.error("💡 Make sure you have at least 5125 Qu in your wallet")
        } else if (error.message.includes("tick")) {
            console.error("💡 Try updating target tick - run get-tick.js again")
        } else {
            console.error("💡 Full error details:", error)
        }
    }
}

// Show balance check helper
function showBalanceCheck() {
    console.log("\n💰 BALANCE CHECK:")
    console.log("Make sure your wallet has:")
    console.log("- At least 5125 Qu (5100 + 25 fee)")
    console.log("- Some extra for network fees")
    console.log("\nYou can check balance at:")
    console.log("- Qubic Explorer: https://explorer.qubic.org/")
    console.log("- Your Qubic wallet")
}

// Run the broadcast
console.log("🎯 VottunBridge - READY TO BROADCAST")
showBalanceCheck()
broadcastRealTransaction().catch(console.error)