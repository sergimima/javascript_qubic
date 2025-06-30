// Script para consultar getContractInfo del smart contract VottunBridge CON DEBUG INFO
const { QubicHelper } = require('qubic-ts-library/dist/qubicHelper');

/**
 * Cliente para consultar getContractInfo del VottunBridge CON DEBUG
 */
class VottunBridgeContractInfoDebug {
    constructor(rpcUrl = "http://185.84.224.100:8000/v1") {
        this.rpcUrl = rpcUrl;
        this.contractIndex = 13;
    }
    
    /**
     * Consultar getContractInfo con información de debug
     */
    async getContractInfo() {
        console.log("🔍 Querying VottunBridge Contract Info WITH DEBUG...");
        console.log("- Contract Index:", this.contractIndex);
        console.log("- Function: getContractInfo (ID 8)");
        console.log();
        
        try {
            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 8, // getContractInfo function ID
                inputSize: 0, // Sin input
                requestData: "" // Payload vacío
            };
            
            console.log("📡 Sending query...");
            
            const response = await fetch(`${this.rpcUrl}/querySmartContract`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryRequest)
            });
            
            console.log("📊 Response status:", response.status);
            
            if (response.status !== 200) {
                const errorText = await response.text();
                console.error("❌ Query failed:", errorText);
                throw new Error(`Query failed (${response.status}): ${errorText}`);
            }
            
            const data = await response.json();
            console.log("✅ Raw smart contract response:", JSON.stringify(data, null, 2));
            
            // Parsear la respuesta CON DEBUG
            const result = this.parseContractInfoWithDebug(data);
            
            console.log("🎯 Parsed Contract Info:");
            if (result.success) {
                console.log("- Admin ID:", result.admin);
                console.log("- Next Order ID:", result.nextOrderId);
                console.log("- Locked Tokens:", result.lockedTokens, "Qu");
                console.log("- Total Received Tokens:", result.totalReceivedTokens, "Qu");
                console.log("- Earned Fees:", result.earnedFees, "Qu");
                console.log("- Trade Fee (billionths):", result.tradeFeeBillionths);
                console.log("- Source Chain:", result.sourceChain);
                console.log("- Number of managers:", result.managers.filter(m => m !== 'NULL_ID').length);
                
                // DEBUG INFO
                console.log();
                console.log("🔍 DEBUG INFO:");
                console.log("- Total Orders Found:", result.totalOrdersFound);
                console.log("- Empty Slots:", result.emptySlots);
                console.log("- Capacity:", result.totalOrdersFound + result.emptySlots);
                
                console.log();
                console.log("📋 FIRST 8 ORDERS:");
                for (let i = 0; i < result.firstOrders.length; i++) {
                    const order = result.firstOrders[i];
                    console.log(`Order ${i}:`);
                    console.log(`  - Order ID: ${order.orderId}`);
                    console.log(`  - Status: ${order.status} ${this.getStatusName(order.status)}`);
                    console.log(`  - Amount: ${order.amount} Qu`);
                    console.log(`  - ETH Address: ${order.ethAddress}`);
                    console.log(`  - Sender: ${order.qubicSender}`);
                    console.log(`  - Direction: ${order.fromQubicToEthereum ? 'Qubic→Ethereum' : 'Ethereum→Qubic'}`);
                }
                
                if (result.nextOrderId > 1) {
                    console.log("🎉 CONTRACT HAS CREATED ORDERS! Next order ID:", result.nextOrderId);
                } else {
                    console.log("❌ No orders have been created yet (nextOrderId = 1)");
                }
            } else {
                console.log("❌ Failed to parse contract info:", result.error);
            }
            
            return result;
            
        } catch (error) {
            console.error("❌ Error querying contract info:", error.message);
            throw error;
        }
    }
    
    /**
     * Parsear respuesta de getContractInfo CON DEBUG CORREGIDO
     */
    parseContractInfoWithDebug(data) {
        if (!data.responseData) {
            return {
                success: false,
                error: 'No response data from smart contract'
            };
        }
        
        try {
            // Decodificar base64
            const responseBytes = this.base64ToUint8Array(data.responseData);
            
            console.log("📊 Response bytes length:", responseBytes.length);
            console.log("📊 First 64 bytes:", Array.from(responseBytes.slice(0, 64)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            // ESTRUCTURA REAL CORREGIDA basada en get-contract-info-fixed.js:
            // Los offsets correctos son:
            // - Admin: offset 0 (32 bytes)
            // - Managers: offset 32 (512 bytes) 
            // - NextOrderId: offset 544 (8 bytes)
            // - LockedTokens: offset 552 (8 bytes)
            // - TotalReceivedTokens: offset 560 (8 bytes) 
            // - EarnedFees: offset 568 (8 bytes)
            // - TradeFeeBillionths: offset 576 (4 bytes)
            // - SourceChain: offset 580 (4 bytes)
            // - Después vienen las órdenes...
            
            let offset = 0;
            
            // Admin ID (32 bytes)
            const adminBytes = responseBytes.slice(offset, offset + 32);
            const admin = this.bytesToQubicId(adminBytes);
            console.log("🔍 Admin bytes:", Array.from(adminBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            offset = 32;
            
            // Managers array (16 * 32 = 512 bytes)
            const managers = [];
            for (let i = 0; i < 16; i++) {
                const managerBytes = responseBytes.slice(offset, offset + 32);
                const manager = this.bytesToQubicId(managerBytes);
                managers.push(manager);
                offset += 32;
            }
            
            // Usar offsets correctos como en get-contract-info-fixed.js
            const nextOrderId = this.readUint64LE(responseBytes, 544);
            const lockedTokens = this.readUint64LE(responseBytes, 552);
            const totalReceivedTokens = this.readUint64LE(responseBytes, 560);
            const earnedFees = this.readUint64LE(responseBytes, 568);
            const tradeFeeBillionths = this.readUint32LE(responseBytes, 576);
            const sourceChain = this.readUint32LE(responseBytes, 580);
            
            console.log("🔍 PARSING DEBUG:");
            console.log("- NextOrderId offset 544:", nextOrderId);
            console.log("- EarnedFees offset 568:", earnedFees);
            console.log("- TradeFeeBillionths offset 576:", tradeFeeBillionths);
            
            // BUSCAR ÓRDENES REALES en la respuesta
            // Las órdenes pueden estar después del offset 584
            const ordersStartOffset = 584;
            const firstOrders = [];
            let totalOrdersFound = 0;
            let emptySlots = 0;
            
            // Analizar hasta 20 posibles órdenes para encontrar las reales
            for (let i = 0; i < 20 && (ordersStartOffset + (i * 96)) < responseBytes.length - 96; i++) {
                const orderOffset = ordersStartOffset + (i * 96);
                const order = this.parseBridgeOrderCorrected(responseBytes, orderOffset, i);
                
                if (i < 8) { // Solo mostrar las primeras 8 en el debug
                    firstOrders.push(order);
                }
                
                // Contar órdenes reales vs vacías
                if (order.status === 255 || (order.orderId === 0 && order.amount === 0 && order.qubicSender === 'NULL_ID')) {
                    emptySlots++;
                } else if (order.orderId > 0 || order.amount > 0 || order.status !== 255) {
                    totalOrdersFound++;
                }
            }
            
            // Si nextOrderId > 1, debe haber órdenes creadas
            if (nextOrderId > 1) {
                console.log("🎯 DETECTADA ACTIVIDAD: nextOrderId =", nextOrderId, "(debería haber", nextOrderId - 1, "órdenes)");
                
                // Buscar órdenes usando getOrder directamente
                console.log("🔍 BUSCANDO ÓRDENES INDIVIDUALES...");
                // Esta búsqueda se hará en el método principal
            }
            
            return {
                success: true,
                admin,
                managers,
                nextOrderId,
                lockedTokens,
                totalReceivedTokens,
                earnedFees,
                tradeFeeBillionths,
                sourceChain,
                // DEBUG INFO CORREGIDO
                firstOrders,
                totalOrdersFound,
                emptySlots
            };
            
        } catch (error) {
            console.log("⚠️  Debug parsing failed, trying basic parsing:", error.message);
            return this.parseBasicContractInfo(this.base64ToUint8Array(data.responseData));
        }
    }
    
    /**
     * Parsear BridgeOrder (96 bytes) - VERSIÓN ORIGINAL
     */
    parseBridgeOrder(bytes, offset) {
        // id qubicSender (32 bytes)
        const qubicSenderBytes = bytes.slice(offset, offset + 32);
        const qubicSender = this.bytesToQubicId(qubicSenderBytes);
        
        // Array<uint8, 64> ethAddress (64 bytes)
        const ethAddressBytes = bytes.slice(offset + 32, offset + 96);
        const ethAddress = this.ethAddressToString(ethAddressBytes);
        
        // uint64 orderId (8 bytes)
        const orderId = this.readUint64LE(bytes, offset + 96);
        
        // uint64 amount (8 bytes)
        const amount = this.readUint64LE(bytes, offset + 104);
        
        // uint8 orderType (1 byte)
        const orderType = bytes[offset + 112];
        
        // uint8 status (1 byte)
        const status = bytes[offset + 113];
        
        // bit fromQubicToEthereum (1 byte)
        const fromQubicToEthereum = bytes[offset + 114] !== 0;
        
        return {
            qubicSender,
            ethAddress,
            orderId,
            amount,
            orderType,
            status,
            fromQubicToEthereum
        };
    }
    
    /**
     * Parsear BridgeOrder CORREGIDO - Analiza diferentes estructuras posibles
     */
    parseBridgeOrderCorrected(bytes, offset, orderIndex) {
        // Verificar si hay suficientes bytes
        if (offset + 96 > bytes.length) {
            return {
                qubicSender: 'NULL_ID',
                ethAddress: '0x0000000000000000000000000000000000000000',
                orderId: 0,
                amount: 0,
                orderType: 0,
                status: 255,
                fromQubicToEthereum: false,
                parseError: 'Insufficient bytes'
            };
        }
        
        // DEBUG: Mostrar bytes raw para las primeras órdenes
        if (orderIndex < 3) {
            console.log(`🔍 Order ${orderIndex} raw bytes (offset ${offset}):`);
            console.log("  First 32 bytes:", Array.from(bytes.slice(offset, offset + 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            console.log("  Next 32 bytes:", Array.from(bytes.slice(offset + 32, offset + 64)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            console.log("  Last 32 bytes:", Array.from(bytes.slice(offset + 64, offset + 96)).map(b => b.toString(16).padStart(2, '0')).join(' '));
        }
        
        // Probar diferentes estructuras de parsing
        
        // ESTRUCTURA 1: Original (qubicSender + ethAddress + orderId + amount + flags)
        const result1 = this.tryParseStructure1(bytes, offset);
        
        // ESTRUCTURA 2: Posible estructura alternativa
        const result2 = this.tryParseStructure2(bytes, offset);
        
        // ESTRUCTURA 3: Buscar patrones conocidos
        const result3 = this.tryParseStructure3(bytes, offset);
        
        // Elegir el resultado más probable
        const results = [result1, result2, result3].filter(r => r.confidence > 0);
        
        if (results.length === 0) {
            return {
                qubicSender: 'NULL_ID',
                ethAddress: '0x0000000000000000000000000000000000000000',
                orderId: 0,
                amount: 0,
                orderType: 0,
                status: 255,
                fromQubicToEthereum: false,
                parseError: 'No valid structure found'
            };
        }
        
        // Retornar el resultado con mayor confianza
        const bestResult = results.sort((a, b) => b.confidence - a.confidence)[0];
        
        if (orderIndex < 3) {
            console.log(`  → Best parse (confidence ${bestResult.confidence}):`, {
                orderId: bestResult.orderId,
                amount: bestResult.amount,
                status: bestResult.status
            });
        }
        
        return bestResult;
    }
    
    /**
     * Estructura 1: Original
     */
    tryParseStructure1(bytes, offset) {
        try {
            const qubicSenderBytes = bytes.slice(offset, offset + 32);
            const qubicSender = this.bytesToQubicId(qubicSenderBytes);
            
            const ethAddressBytes = bytes.slice(offset + 32, offset + 64);
            const ethAddress = this.ethAddressToString(ethAddressBytes.slice(0, 20));
            
            const orderId = this.readUint64LE(bytes, offset + 64);
            const amount = this.readUint64LE(bytes, offset + 72);
            const orderType = bytes[offset + 80];
            const status = bytes[offset + 81];
            const fromQubicToEthereum = bytes[offset + 82] !== 0;
            
            // Calcular confianza basada en valores razonables
            let confidence = 0;
            if (orderId > 0 && orderId < 1000000) confidence += 30;
            if (amount >= 0 && amount < 1e18) confidence += 20;
            if (status >= 0 && status <= 3) confidence += 25;
            if (qubicSender !== 'NULL_ID' && !qubicSender.startsWith('AAAAAAA')) confidence += 25;
            
            return {
                qubicSender,
                ethAddress,
                orderId,
                amount,
                orderType,
                status,
                fromQubicToEthereum,
                confidence,
                structure: 'Structure1'
            };
        } catch (error) {
            return { confidence: 0, error: error.message };
        }
    }
    
    /**
     * Estructura 2: Alternativa
     */
    tryParseStructure2(bytes, offset) {
        try {
            // Probar con offsets diferentes
            const orderId = this.readUint64LE(bytes, offset);
            const amount = this.readUint64LE(bytes, offset + 8);
            const status = bytes[offset + 16];
            const orderType = bytes[offset + 17];
            
            const qubicSenderBytes = bytes.slice(offset + 32, offset + 64);
            const qubicSender = this.bytesToQubicId(qubicSenderBytes);
            
            const ethAddressBytes = bytes.slice(offset + 64, offset + 84);
            const ethAddress = this.ethAddressToString(ethAddressBytes);
            
            const fromQubicToEthereum = bytes[offset + 84] !== 0;
            
            let confidence = 0;
            if (orderId > 0 && orderId < 1000000) confidence += 35;
            if (amount >= 0 && amount < 1e18) confidence += 25;
            if (status >= 0 && status <= 3) confidence += 20;
            if (qubicSender !== 'NULL_ID') confidence += 20;
            
            return {
                qubicSender,
                ethAddress,
                orderId,
                amount,
                orderType,
                status,
                fromQubicToEthereum,
                confidence,
                structure: 'Structure2'
            };
        } catch (error) {
            return { confidence: 0, error: error.message };
        }
    }
    
    /**
     * Estructura 3: Buscar patrones
     */
    tryParseStructure3(bytes, offset) {
        try {
            // Buscar valores que parezcan IDs de orden válidos en diferentes posiciones
            let bestOrderId = 0;
            let bestAmount = 0;
            let bestOffset = offset;
            let confidence = 0;
            
            // Probar diferentes posiciones para encontrar datos válidos
            for (let i = 0; i < 64; i += 8) {
                if (offset + i + 8 <= bytes.length) {
                    const testOrderId = this.readUint64LE(bytes, offset + i);
                    const testAmount = this.readUint64LE(bytes, offset + i + 8);
                    
                    if (testOrderId > 0 && testOrderId < 1000 && testAmount >= 0 && testAmount < 1e15) {
                        bestOrderId = testOrderId;
                        bestAmount = testAmount;
                        bestOffset = offset + i;
                        confidence = 40;
                        break;
                    }
                }
            }
            
            if (confidence === 0) {
                return { confidence: 0 };
            }
            
            // Usar los mejores valores encontrados
            const status = bytes[bestOffset + 16] || 0;
            const orderType = bytes[bestOffset + 17] || 0;
            
            return {
                qubicSender: 'PATTERN_DETECTED',
                ethAddress: '0x0000000000000000000000000000000000000000',
                orderId: bestOrderId,
                amount: bestAmount,
                orderType,
                status,
                fromQubicToEthereum: false,
                confidence,
                structure: 'Structure3_Pattern'
            };
        } catch (error) {
            return { confidence: 0, error: error.message };
        }
    }
    
    /**
     * Parseo básico (fallback)
     */
    parseBasicContractInfo(responseBytes) {
        let offset = 0;
        
        const adminBytes = responseBytes.slice(offset, offset + 32);
        const admin = this.bytesToQubicId(adminBytes);
        offset += 32;
        
        // Skip managers (512 bytes)
        offset += 512;
        
        const nextOrderId = this.readUint64LE(responseBytes, offset); offset += 8;
        const lockedTokens = this.readUint64LE(responseBytes, offset); offset += 8;
        const totalReceivedTokens = this.readUint64LE(responseBytes, offset); offset += 8;
        const earnedFees = this.readUint64LE(responseBytes, offset); offset += 8;
        const tradeFeeBillionths = this.readUint32LE(responseBytes, offset); offset += 4;
        const sourceChain = this.readUint32LE(responseBytes, offset);
        
        return {
            success: true,
            admin,
            managers: Array(16).fill('NULL_ID'),
            nextOrderId,
            lockedTokens,
            totalReceivedTokens,
            earnedFees,
            tradeFeeBillionths,
            sourceChain,
            firstOrders: [],
            totalOrdersFound: 0,
            emptySlots: 0
        };
    }
    
    /**
     * Utilidades
     */
    getStatusName(status) {
        const names = {
            0: '(Created)',
            1: '(Completed)', 
            2: '(Refunded)',
            255: '(Empty)'
        };
        return names[status] || '(Unknown)';
    }
    
    ethAddressToString(bytes) {
        let address = "0x";
        for (let i = 0; i < Math.min(20, bytes.length); i++) {
            address += bytes[i].toString(16).padStart(2, '0');
        }
        return address;
    }
    
    base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    
    readUint64LE(bytes, offset) {
        let value = 0n;
        for (let i = 0; i < 8; i++) {
            value += BigInt(bytes[offset + i]) << (BigInt(i) * 8n);
        }
        return Number(value);
    }
    
    readUint32LE(bytes, offset) {
        return bytes[offset] | 
               (bytes[offset + 1] << 8) | 
               (bytes[offset + 2] << 16) | 
               (bytes[offset + 3] << 24);
    }
    
    bytesToQubicId(bytes) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let result = "";
        
        for (let i = 0; i < Math.min(32, bytes.length); i++) {
            if (bytes[i] === 0) {
                result += "A";
            } else {
                result += chars[bytes[i] % 26];
            }
        }
        
        if (bytes.every(b => b === 0)) {
            return "NULL_ID";
        }
        
        return result.padEnd(60, 'A');
    }
}

/**
 * Test para obtener información del contrato CON DEBUG
 */
async function testGetContractInfoDebug() {
    console.log("🔍 TESTING VottunBridge getContractInfo WITH DEBUG");
    console.log("Contract Index: 13");
    console.log("=" .repeat(60));
    
    try {
        const bridge = new VottunBridgeContractInfoDebug();
        const result = await bridge.getContractInfo();
        
        if (result.success) {
            console.log("🎉 SUCCESS! Contract info with debug retrieved!");
        } else {
            console.log("❌ Failed to get contract info");
        }
        
        return result;
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        throw error;
    }
}

// Ejecutar test
if (require.main === module) {
    testGetContractInfoDebug();
}

module.exports = {
    VottunBridgeContractInfoDebug,
    testGetContractInfoDebug
};