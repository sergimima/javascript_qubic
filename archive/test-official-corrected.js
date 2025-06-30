// VottunBridge con la librería OFICIAL de Qubic - IMPORTS CORREGIDOS
const { QubicHelper } = require('qubic-ts-library/dist/qubicHelper');
const { Signature } = require('qubic-ts-library/dist/qubic-types/Signature');
const { QubicTransaction } = require('qubic-ts-library/dist/qubic-types/QubicTransaction');

async function testOfficialQubicLibrary() {
    console.log("🎯 TESTING WITH OFFICIAL QUBIC LIBRARY - CORRECTED IMPORTS");
    console.log("=" .repeat(60));
    
    try {
        console.log("✅ Imports successful!");
        console.log("- QubicHelper imported");
        console.log("- Signature imported");
        console.log("- QubicTransaction imported");
        console.log();
        
        // Credenciales de prueba
        const qubicSeed = "vtaakhxwtxxwtqidnevwbwskfcleeekrduxvplcvwhgrymbqweyzius";
        
        console.log("🔑 Creating identity with official library...");
        const helper = new QubicHelper();
        const id = await helper.createIdPackage(qubicSeed);
        
        console.log("✅ Identity created with OFFICIAL library:");
        console.log("- Identity:", id.publicId);
        console.log("- Private key available:", !!id.privateKey);
        console.log("- Public key available:", !!id.publicKey);
        console.log();
        
        return { helper, id };
        
    } catch (error) {
        console.error("❌ Error with official library:", error.message);
        console.error("Stack:", error.stack);
        throw error;
    }
}

async function createVottunBridgeTransaction() {
    console.log("🌉 Creating VottunBridge transaction with OFFICIAL library...");
    
    try {
        const { helper, id } = await testOfficialQubicLibrary();
        
        // Parámetros del bridge
        const ethAddress = "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE";
        const amount = 5100;
        const direction = true; // Qubic → Ethereum
        const targetTick = 21395400;
        
        console.log("🔧 Bridge parameters:");
        console.log("- ETH Address:", ethAddress);
        console.log("- Amount:", amount, "Qu");
        console.log("- Direction:", direction ? "Qubic → Ethereum" : "Ethereum → Qubic");
        console.log("- Target tick:", targetTick);
        console.log();
        
        // Calcular fee
        const requiredFee = Math.floor((amount * 5000000) / 1000000000);
        console.log("- Required fee:", requiredFee, "Qu");
        console.log();
        
        // Crear payload (73 bytes) - usar mi implementación que ya está perfecta
        const { VottunBridgePayloadSchnorrQ } = require('./vottun-bridge-schnorrq');
        const bridgePayload = new VottunBridgePayloadSchnorrQ(ethAddress, amount, direction);
        
        console.log("✅ Payload created (JavaScript implementation):");
        console.log("- Size:", bridgePayload.getPackageSize(), "bytes");
        
        // Ahora crear transaction con librería oficial
        console.log("🔐 Creating transaction with OFFICIAL library...");
        
        const transaction = new QubicTransaction();
        
        // Examinar qué métodos tiene disponibles
        console.log("🔍 Available transaction methods:");
        Object.getOwnPropertyNames(Object.getPrototypeOf(transaction)).forEach(method => {
            if (typeof transaction[method] === 'function') {
                console.log(`  - ${method}()`);
            }
        });
        
        console.log();
        console.log("🎉 SUCCESS!");
        console.log("We now have access to OFFICIAL Qubic signature methods!");
        
        return { helper, id, transaction, bridgePayload };
        
    } catch (error) {
        console.error("❌ Error creating transaction:", error.message);
        throw error;
    }
}

// Ejecutar test
async function main() {
    try {
        await createVottunBridgeTransaction();
        
        console.log();
        console.log("🎯 NEXT STEPS:");
        console.log("1. Explore QubicTransaction methods");
        console.log("2. Use official signature methods");
        console.log("3. Integrate with our VottunBridge payload");
        console.log("4. Test broadcast with REAL Qubic signatures!");
        
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    testOfficialQubicLibrary,
    createVottunBridgeTransaction
};