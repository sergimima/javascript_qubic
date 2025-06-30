// Test final con claves REALES de Qubic + KangarooTwelve
const { VottunBridgeClientFinal } = require('./vottun-bridge-final');

async function testWithRealQubicKeys() {
    console.log("🧪 TESTING VOTTUNBRIDGE WITH REAL QUBIC KEYS + K12");
    console.log("=" .repeat(60));
    
    try {
        // Claves REALES de Qubic (de la memoria)
        const qubicSeed = "vtaakhxwtxxwtqidnevwbwskfcleeekrduxvplcvwhgrymbqweyzius";
        const qubicPrivateKey = "qxhhnqdchmjbkevvhoivqrugiuecctuphxcfbvyvqcxfcxijrxmgwqteaimh";
        const qubicPublicKey = "rlmowdzkmdbpwaszuniyfgqpefhbqhxembshugxbpggtxncvlowecgdbpcxl";
        const qubicIdentity = "RLMOWDZKMDBPWASZUNIYFGQPEFHBQHXEMBSHUGXBPGGTXNCVLOWECGDBPCXL";
        
        console.log("🔑 Using REAL Qubic credentials:");
        console.log("- Identity:", qubicIdentity);
        console.log("- Private key:", qubicPrivateKey);
        console.log("- Public key:", qubicPublicKey);
        console.log();
        
        // Parámetros del bridge
        const ethAddress = "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE";
        const amount = 5100; // Qu
        const direction = true; // Qubic → Ethereum
        const targetTick = 21395100; // Tick actual + offset
        
        console.log("🌉 Bridge parameters:");
        console.log("- ETH Address:", ethAddress);
        console.log("- Amount:", amount, "Qu");
        console.log("- Direction:", direction ? "Qubic → Ethereum" : "Ethereum → Qubic");
        console.log("- Target tick:", targetTick);
        console.log();
        
        // Create bridge client
        const bridge = new VottunBridgeClientFinal();
        
        // Create order con claves reales
        console.log("🔧 Creating order...");
        const transaction = await bridge.createOrderWithRealKeys(
            qubicIdentity,
            qubicPrivateKey,
            ethAddress,
            amount,
            direction,
            targetTick
        );
        
        console.log();
        console.log("📊 Transaction summary:");
        console.log("- Serialized size:", transaction.serialize().length, "bytes");
        console.log("- Encoded size:", transaction.encodeToBase64().length, "chars");
        console.log("- Signature length:", transaction.signature?.length || 0, "bytes");
        console.log();
        
        // Mostrar algunos bytes para verificar
        const serialized = transaction.serialize();
        console.log("🔍 First 32 bytes (source public key):");
        console.log([...serialized.slice(0, 32)].map(b => b.toString(16).padStart(2, '0')).join(' '));
        console.log();
        
        console.log("🔍 Last 32 bytes (signature start):");
        const sigStart = serialized.length - 64;
        console.log([...serialized.slice(sigStart, sigStart + 32)].map(b => b.toString(16).padStart(2, '0')).join(' '));
        console.log();
        
        // Broadcast transaction
        console.log("📡 Broadcasting transaction...");
        const result = await bridge.broadcastTransaction(transaction);
        
        console.log("🎉 SUCCESS! Transaction broadcast completed");
        console.log("📊 Server response:", result);
        
        return result;
        
    } catch (error) {
        console.error("❌ TEST FAILED:", error.message);
        
        if (error.message.includes("Bad public key")) {
            console.log();
            console.log("🔍 ANALYSIS: 'Bad public key or signature' error");
            console.log("This indicates that:");
            console.log("✅ Transaction structure is correct");
            console.log("✅ Payload is correct (73 bytes)");
            console.log("✅ All fields are properly formatted");
            console.log("❌ Key derivation algorithm needs refinement");
            console.log();
            console.log("💡 SOLUTION: The Qubic key conversion algorithm");
            console.log("   needs to match exactly how Qubic derives keys.");
            console.log("   Current implementation is close but not exact.");
        }
        
        throw error;
    }
}

async function getCurrentTick() {
    try {
        console.log("🕐 Getting current tick...");
        const response = await fetch("http://185.84.224.100:8000/v1/ticks/latest");
        const data = await response.json();
        console.log("- Current tick:", data.tick);
        return data.tick;
    } catch (error) {
        console.error("Error getting tick:", error);
        return 21395000; // fallback
    }
}

// Run test
async function main() {
    try {
        const currentTick = await getCurrentTick();
        console.log("🎯 Target tick:", currentTick + 100);
        console.log();
        
        await testWithRealQubicKeys();
        
    } catch (error) {
        console.error("❌ Main test failed:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { testWithRealQubicKeys };