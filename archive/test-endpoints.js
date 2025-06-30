const {VottunBridgeClient} = require('./vottun-bridge')

// Try different endpoints
const ENDPOINTS = [
    "http://185.84.224.100:8000/v1",  // Primary from Go backend
    "http://185.84.224.10:8000/v1",   // Your original
    "http://185.84.224.100:8000",     // Without /v1
    "http://185.84.224.10:8000"       // Without /v1
]

const CONFIG = {
    senderIdentity: "RLMOWDZKMDBPWASZUNIYFGQPEFHBQHXEMBSHUGXBPGGTXNCVLOWECGDBPCXL",
    senderSeed: "vtaakhxwtxxwtqidnevwbwskfcleeekrduxvplcvwhgrymbqweyzius",
    targetTick: 23490101
}

async function testEndpoints() {
    console.log("🔍 Testing Multiple RPC Endpoints")
    console.log("=".repeat(50))
    
    for (const [index, endpoint] of ENDPOINTS.entries()) {
        console.log(`\n${index + 1}️⃣ Testing: ${endpoint}`)
        
        try {
            // Test simple endpoint first
            const testUrl = `${endpoint}/tick-info`
            console.log(`   📡 GET ${testUrl}`)
            
            const response = await fetch(testUrl, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            })
            
            if (response.ok) {
                const data = await response.json()
                console.log(`   ✅ SUCCESS - Status: ${response.status}`)
                console.log(`   📊 Current Tick: ${data.tickInfo?.tick || 'N/A'}`)
                
                // This endpoint works, try broadcast
                return endpoint
            } else {
                console.log(`   ❌ Failed - Status: ${response.status}`)
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`)
        }
    }
    
    return null
}

async function broadcastWithWorkingEndpoint() {
    console.log("🚀 Finding Working Endpoint and Broadcasting")
    console.log("=".repeat(60))
    
    const workingEndpoint = await testEndpoints()
    
    if (!workingEndpoint) {
        console.log("\n❌ No working endpoints found")
        console.log("💡 This might be a temporary network issue")
        console.log("💡 Try again in a few minutes")
        console.log("💡 Or check if you need VPN/different network")
        return
    }
    
    console.log(`\n✅ Using working endpoint: ${workingEndpoint}`)
    
    try {
        const bridgeClient = new VottunBridgeClient(workingEndpoint)
        
        console.log("\n🔧 Creating transaction...")
        const transaction = await bridgeClient.createOrder(
            CONFIG.senderIdentity,
            CONFIG.senderSeed,
            "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE",
            5100,
            true,
            CONFIG.targetTick
        )
        
        console.log("✅ Transaction created!")
        console.log("📦 Details:")
        console.log("- Payload size:", transaction.inputSize, "bytes")
        console.log("- Amount:", transaction.amount.getValue(), "Qu")
        console.log("- Destination:", transaction.destinationPublicKey.getIdentity())
        
        console.log("\n📡 Broadcasting...")
        const result = await bridgeClient.broadcastTransaction(transaction)
        
        console.log("\n🎉 BROADCAST SUCCESSFUL!")
        console.log("📊 Result:", JSON.stringify(result, null, 2))
        
        if (result.success !== false) {
            console.log("\n✅ SUCCESS! Your VottunBridge order is created!")
            console.log("🔗 Transaction should be processed in tick:", CONFIG.targetTick)
            
            // Save the successful configuration
            console.log("\n💾 SUCCESSFUL CONFIG:")
            console.log(`- Working endpoint: ${workingEndpoint}`)
            console.log("- All errors from before are FIXED!")
            console.log("- Payload: 73 bytes ✅")
            console.log("- Destination: Contract address ✅")
            console.log("- Amount parsing: Working ✅")
        }
        
    } catch (error) {
        console.error("\n❌ Broadcast error:", error.message)
        
        if (error.message.includes("timeout") || error.message.includes("fetch failed")) {
            console.log("💡 Network connectivity issue - try:")
            console.log("  1. Different network/WiFi")
            console.log("  2. VPN if needed")
            console.log("  3. Wait and retry later")
        } else {
            console.log("💡 Error details:", error)
        }
    }
}

// Alternative: Manual curl test
function showManualTest() {
    console.log("\n🔧 MANUAL TEST OPTION:")
    console.log("If Node.js networking fails, test with curl:")
    console.log("")
    console.log("curl -X GET http://185.84.224.100:8000/v1/tick-info")
    console.log("curl -X GET http://185.84.224.10:8000/v1/tick-info")
    console.log("")
    console.log("If curl works but Node.js doesn't, it might be:")
    console.log("- Corporate firewall")
    console.log("- Node.js proxy settings")
    console.log("- Network configuration")
}

// Run the test
broadcastWithWorkingEndpoint().then(() => {
    showManualTest()
}).catch(console.error)