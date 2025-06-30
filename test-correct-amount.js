// Test para buscar la orden con el AMOUNT CORRECTO (después del fee)
const { VottunBridgeQuery } = require('./query-bridge-order-fixed');

async function testWithCorrectAmount() {
    console.log("🔍 TESTING WITH CORRECT AMOUNT (after fee deduction)");
    console.log("=" .repeat(60));
    
    try {
        const bridge = new VottunBridgeQuery();
        
        // Parámetros originales del test exitoso
        const ethAddress = "0x146bfa2958592230783039303337386139633830";
        const originalAmount = 17005592192950993000; // Amount que enviamos
        
        // Calcular amount real almacenado (después del fee)
        const feeRate = 5000000; // 0.5% en billionths
        const fee = Math.floor((originalAmount * feeRate) / 1000000000);
        const storedAmount = originalAmount - fee; // Amount que se almacenó realmente
        
        console.log("🔢 Amount calculation:");
        console.log("- Original amount sent:", originalAmount, "Qu");
        console.log("- Fee (0.5%):", fee, "Qu");
        console.log("- Amount stored in contract:", storedAmount, "Qu");
        console.log();
        
        console.log("🎯 Searching with CORRECT stored amount...");
        console.log("- ETH Address:", ethAddress);
        console.log("- Stored Amount:", storedAmount, "Qu (not", originalAmount, ")");
        console.log();
        
        // Buscar con el amount correcto
        const result = await bridge.findRecentOrder(ethAddress, storedAmount);
        
        if (result.found) {
            console.log("🎉 FOUND! Order located with correct amount!");
            console.log("📊 Order details:");
            console.log("- Order ID:", result.orderId);
            console.log("- Status:", result.statusName);
            console.log("🏆 getOrderByDetails FIX CONFIRMED WORKING!");
            
        } else {
            console.log("❌ Still not found with correct amount");
            console.log("🔍 May need further investigation...");
            
            // También probar con amount original por si acaso
            console.log("\n🔄 Trying with original amount as backup...");
            const backupResult = await bridge.findRecentOrder(ethAddress, originalAmount);
            
            if (backupResult.found) {
                console.log("🎉 Found with original amount! Fee calculation might differ.");
            }
        }
        
        return result;
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        throw error;
    }
}

// También probar con múltiples amounts cerca del original
async function testMultipleAmounts() {
    console.log("\n🔍 TESTING MULTIPLE AMOUNTS AROUND THE ORIGINAL");
    console.log("=" .repeat(60));
    
    const bridge = new VottunBridgeQuery();
    const ethAddress = "0x090378a9c80c5E1Ced85e56B2128c1e514E75357";
    
    // Probar diferentes amounts posibles
    const amountsToTry = [
        5100, // Original
        5075, // After 0.5% fee
        5074, // Rounding variations
        5076,
        5095, // Other possible values
        5105
    ];
    
    for (const amount of amountsToTry) {
        console.log(`\n🧪 Testing amount: ${amount} Qu`);
        
        try {
            // Solo probar status 'created' para ser más rápido
            const result = await bridge.queryOrderByDetails(ethAddress, amount, 0);
            
            if (result.found) {
                console.log(`🎉 FOUND WITH AMOUNT ${amount}!`);
                console.log("- Order ID:", result.orderId);
                return { found: true, amount, orderId: result.orderId };
            } else {
                console.log(`❌ Not found with amount ${amount}`);
            }
            
        } catch (error) {
            console.log(`❌ Error with amount ${amount}:`, error.message);
        }
    }
    
    console.log("\n❌ Order not found with any tested amount");
    return { found: false };
}

// Ejecutar tests
if (require.main === module) {
    testWithCorrectAmount()
        .then(() => testMultipleAmounts())
        .catch(console.error);
}

module.exports = { testWithCorrectAmount, testMultipleAmounts };