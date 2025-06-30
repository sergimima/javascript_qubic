// Get current tick from Qubic network using REAL endpoints from backend Go
async function getCurrentTick() {
    // Real endpoints from vottun-qubic-bridge-go backend
    const endpoints = {
        primary: "http://185.84.224.100:8000",  // From backend Go constants
        fallback: "http://185.84.224.10:8000"   // Your original URL
    }
    
    console.log("🔍 Getting current tick from Qubic network...")
    console.log("📍 Using endpoints from VottunBridge Go backend")
    
    // Try primary endpoint first (from Go backend)
    for (const [name, baseUrl] of Object.entries(endpoints)) {
        try {
            console.log(`\n🔄 Trying ${name} endpoint: ${baseUrl}`)
            
            // Real endpoint from Go backend: /tick-info
            const tickInfoUrl = `${baseUrl}/v1/tick-info`
            console.log(`📡 GET ${tickInfoUrl}`)
            
            const response = await fetch(tickInfoUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "GET"
            })
            
            console.log(`📊 Response status: ${response.status}`)
            
            if (response.status === 200) {
                const data = await response.json()
                console.log("✅ Raw response:", JSON.stringify(data, null, 2))
                
                // Parse according to Go backend structure
                if (data.tickInfo && data.tickInfo.tick) {
                    const currentTick = data.tickInfo.tick
                    const recommendedTargetTick = currentTick + 100 // Add buffer
                    
                    console.log("\n🎯 TICK INFORMATION:")
                    console.log("✅ Current Tick:", currentTick)
                    console.log("✅ Epoch:", data.tickInfo.epoch || "N/A")
                    console.log("✅ Duration:", data.tickInfo.duration || "N/A")
                    console.log("✅ Initial Tick:", data.tickInfo.initialTick || "N/A")
                    console.log("💡 Recommended Target Tick:", recommendedTargetTick)
                    
                    console.log("\n📝 UPDATE YOUR CONFIG:")
                    console.log(`targetTick: ${recommendedTargetTick}  // Current: ${currentTick} + 100 buffer`)
                    
                    return {
                        currentTick,
                        recommendedTargetTick,
                        tickInfo: data.tickInfo
                    }
                }
                
                // If direct tick field exists
                if (data.tick) {
                    const currentTick = data.tick
                    const recommendedTargetTick = currentTick + 100
                    
                    console.log("\n🎯 TICK INFORMATION:")
                    console.log("✅ Current Tick:", currentTick)
                    console.log("💡 Recommended Target Tick:", recommendedTargetTick)
                    
                    return {
                        currentTick,
                        recommendedTargetTick
                    }
                }
                
                console.log("⚠️  Tick info found but structure unexpected")
                
            } else {
                const errorText = await response.text()
                console.log(`❌ Error ${response.status}:`, errorText)
            }
            
        } catch (error) {
            console.log(`❌ Error with ${name} endpoint:`, error.message)
        }
    }
    
    return null
}

// Try other endpoints mentioned in Go backend
async function tryOtherEndpoints() {
    const endpoints = [
        "http://185.84.224.100:8000/v1/block-height",
        "http://185.84.224.100:8000/v1/ticks",
        "http://185.84.224.10:8000/v1/tick-info",
        "http://185.84.224.10:8000/v1/block-height"
    ]
    
    console.log("\n🔄 Trying other documented endpoints...")
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n🔍 Testing: ${endpoint}`)
            const response = await fetch(endpoint, {
                headers: { 'Accept': 'application/json' }
            })
            
            if (response.status === 200) {
                const data = await response.json()
                console.log("✅ Success:", JSON.stringify(data, null, 2))
                
                // Look for tick information in any format
                if (data.tick) {
                    console.log("🎯 Found tick:", data.tick)
                }
                if (data.currentTick) {
                    console.log("🎯 Found currentTick:", data.currentTick)
                }
                if (data.tickInfo) {
                    console.log("🎯 Found tickInfo:", data.tickInfo)
                }
                
            } else {
                console.log(`❌ Status ${response.status}`)
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`)
        }
    }
}

// Manual calculation helper
function showManualOptions() {
    console.log("\n💡 MANUAL OPTIONS:")
    console.log("=".repeat(50))
    console.log("1. 🌐 Check Qubic Explorer: https://explorer.qubic.org/")
    console.log("2. 📱 Use Qubic wallet to see current tick")
    console.log("3. 🔗 Check other Qubic RPC endpoints")
    console.log("4. 📊 Use target tick formula: current_tick + 50-100")
    
    console.log("\n⚠️  IMPORTANT:")
    console.log("- Target tick must be FUTURE tick (current + buffer)")
    console.log("- Too far in future = transaction might expire")
    console.log("- Too close = might miss the tick")
    console.log("- Recommended buffer: 50-100 ticks")
}

// Main function
async function main() {
    console.log("⏰ Qubic Network Tick Information Tool")
    console.log("🔧 Using REAL endpoints from VottunBridge Go backend")
    console.log("=".repeat(60))
    
    const result = await getCurrentTick()
    
    if (!result) {
        console.log("\n🔍 Primary endpoints failed, trying alternatives...")
        await tryOtherEndpoints()
        showManualOptions()
        
        console.log("\n📋 NEXT STEPS:")
        console.log("1. Find current tick manually")
        console.log("2. Add 50-100 ticks as buffer")
        console.log("3. Update real-test.js with: targetTick: YOUR_CALCULATED_TICK")
        
    } else {
        console.log("\n🎉 SUCCESS! Update your configuration:")
        console.log(`\n// In real-test.js, update:`)
        console.log(`targetTick: ${result.recommendedTargetTick}`)
        
        console.log("\n📋 NEXT STEPS:")
        console.log("1. ✅ Tick information obtained")
        console.log("2. 📝 Update real-test.js with credentials")
        console.log("3. 🚀 Run: node real-test.js")
    }
}

main().catch(console.error)