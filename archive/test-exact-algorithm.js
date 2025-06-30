// Test FINAL con algoritmo EXACTO de Qubic keyUtils.cpp
const { VottunBridgeClientExact } = require('./vottun-bridge-exact');

async function testWithExactQubicAlgorithm() {
    console.log("🎯 TESTING WITH EXACT QUBIC keyUtils.cpp ALGORITHM");
    console.log("=" .repeat(60));
    
    try {
        // Credenciales reales
        const qubicSeed = "vtaakhxwtxxwtqidnevwbwskfcleeekrduxvplcvwhgrymbqweyzius";
        const qubicIdentity = "RLMOWDZKMDBPWASZUNIYFGQPEFHBQHXEMBSHUGXBPGGTXNCVLOWECGDBPCXL";
        
        console.log("🔑 Using EXACT Qubic algorithm:");
        console.log("- Seed:", qubicSeed);
        console.log("- Identity:", qubicIdentity);
        console.log("- Algorithm: qubic-cli/keyUtils.cpp EXACT");
        console.log();
        
        // Parámetros
        const ethAddress = "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE";
        const amount = 5100;
        const direction = true; // Qubic → Ethereum
        const targetTick = 21395200;
        
        console.log("🌉 Bridge parameters:");
        console.log("- ETH Address:", ethAddress);
        console.log("- Amount:", amount, "Qu");
        console.log("- Direction:", direction ? "Qubic → Ethereum" : "Ethereum → Qubic");
        console.log("- Target tick:", targetTick);
        console.log();
        
        // Create bridge client
        const bridge = new VottunBridgeClientExact();
        
        // Create order con algoritmo EXACTO
        console.log("🔧 Creating order with EXACT Qubic algorithm...");
        const transaction = await bridge.createOrderWithExactAlgorithm(
            qubicIdentity,
            qubicSeed,
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
        
        // Mostrar public key generada
        console.log("🔍 Generated public key (EXACT algorithm):");
        console.log([...transaction.sourcePublicKey.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join(' '));
        console.log();
        
        // Broadcast transaction
        console.log("📡 Broadcasting transaction with EXACT signature...");
        const result = await bridge.broadcastTransaction(transaction);
        
        console.log("🎉 SUCCESS! Transaction accepted by Qubic network!");
        console.log("📊 Server response:", result);
        
        return result;
        
    } catch (error) {
        console.error("❌ TEST FAILED:", error.message);
        
        if (error.message.includes("Bad public key")) {
            console.log();
            console.log("🔍 Still getting 'Bad public key or signature'");
            console.log("This means we need to check if Qubic uses different signing algorithm");
            console.log("than standard Schnorr. Let me check the C++ signing code...");
        }
        
        throw error;
    }
}

// Run test
async function main() {
    try {
        await testWithExactQubicAlgorithm();
        
    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { testWithExactQubicAlgorithm };