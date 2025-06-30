// Test para comparar con qubic-cli real
const { QubicCryptoFinal, QubicKeyConverter } = require('./vottun-bridge-final');

function analyzeQubicKeys() {
    console.log("🔍 ANALYZING QUBIC KEY CONVERSION");
    console.log("=" .repeat(50));
    
    // Claves reales de Qubic
    const qubicSeed = "vtaakhxwtxxwtqidnevwbwskfcleeekrduxvplcvwhgrymbqweyzius";
    const qubicPrivateKey = "qxhhnqdchmjbkevvhoivqrugiuecctuphxcfbvyvqcxfcxijrxmgwqteaimh";
    const qubicPublicKey = "rlmowdzkmdbpwaszuniyfgqpefhbqhxembshugxbpggtxncvlowecgdbpcxl";
    const qubicIdentity = "RLMOWDZKMDBPWASZUNIYFGQPEFHBQHXEMBSHUGXBPGGTXNCVLOWECGDBPCXL";
    
    console.log("📝 Qubic credentials:");
    console.log("- Seed length:", qubicSeed.length, "chars");
    console.log("- Private key length:", qubicPrivateKey.length, "chars");
    console.log("- Public key length:", qubicPublicKey.length, "chars");
    console.log("- Identity length:", qubicIdentity.length, "chars");
    console.log();
    
    // Analizar patrones
    console.log("🔤 Character analysis:");
    console.log("- Seed chars:", [...new Set(qubicSeed)].sort().join(''));
    console.log("- Private key chars:", [...new Set(qubicPrivateKey)].sort().join(''));
    console.log("- Public key chars:", [...new Set(qubicPublicKey)].sort().join(''));
    console.log("- Identity chars:", [...new Set(qubicIdentity)].sort().join(''));
    console.log();
    
    // Test nuestra conversión
    console.log("🧪 Our conversion results:");
    try {
        const convertedPrivateKey = QubicKeyConverter.qubicPrivateKeyToBytes(qubicPrivateKey);
        const convertedPublicKey = QubicKeyConverter.qubicPublicKeyToBytes(qubicPublicKey);
        
        console.log("- Converted private key (first 16 bytes):");
        console.log("  ", [...convertedPrivateKey.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        console.log("- Converted public key (first 16 bytes):");
        console.log("  ", [...convertedPublicKey.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        console.log();
        console.log("📊 Conversion summary:");
        console.log("- Private key: 60 chars →", convertedPrivateKey.length, "bytes");
        console.log("- Public key: 60 chars →", convertedPublicKey.length, "bytes");
        
    } catch (error) {
        console.error("❌ Conversion error:", error);
    }
    
    console.log();
    console.log("💡 NEXT STEPS:");
    console.log("1. Use qubic-cli to create a transaction and capture the bytes");
    console.log("2. Compare the public key bytes qubic-cli generates vs ours");
    console.log("3. Analyze the exact key derivation algorithm");
    console.log();
    console.log("🚀 CLI COMMAND TO TEST:");
    console.log("cd ../qubic-cli");
    console.log("./qubic-cli -nodeip 185.84.224.100 -nodeport 8000 \\");
    console.log(`  -seed "${qubicSeed}" \\`);
    console.log("  -createorder \\");
    console.log("  -ethaddress \"0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE\" \\");
    console.log("  -amount 5100 \\");
    console.log("  -direction qubictoeth \\");
    console.log("  -scheduledtickoffset 100");
}

if (require.main === module) {
    analyzeQubicKeys();
}

module.exports = { analyzeQubicKeys };