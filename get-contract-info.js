// Script para consultar getContractInfo del smart contract VottunBridge
const { QubicHelper } = require('qubic-ts-library/dist/qubicHelper');

/**
 * Cliente para consultar getContractInfo del VottunBridge
 */
class VottunBridgeContractInfo {
    constructor(rpcUrl = "http://185.84.224.100:8000/v1") {
        this.rpcUrl = rpcUrl;
        this.contractIndex = 13;
    }
    
    /**
     * Consultar getContractInfo (función 8, sin input)
     */
    async getContractInfo() {
        console.log("🔍 Querying VottunBridge Contract Info...");
        console.log("- Contract Index:", this.contractIndex);
        console.log("- Function: getContractInfo (ID 8)");
        console.log();
        
        try {
            // getContractInfo no necesita input data
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
            
            // Parsear la respuesta
            const result = this.parseContractInfoResponse(data);
            
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
     * Parsear respuesta de getContractInfo
     */
    parseContractInfoResponse(data) {
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
            console.log("📊 First 32 bytes:", Array.from(responseBytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            // Según el smart contract, getContractInfo_output tiene:
            // id admin (32 bytes)
            // Array<id, 16> managers (16 * 32 = 512 bytes)  
            // uint64 nextOrderId (8 bytes)
            // uint64 lockedTokens (8 bytes)
            // uint64 totalReceivedTokens (8 bytes)
            // uint64 earnedFees (8 bytes)
            // uint32 tradeFeeBillionths (4 bytes)
            // uint32 sourceChain (4 bytes)
            // Total esperado: 32 + 512 + 8 + 8 + 8 + 8 + 4 + 4 = 584 bytes
            
            if (responseBytes.length < 584) {
                return {
                    success: false,
                    error: `Response too short: ${responseBytes.length} bytes, expected 584`
                };
            }
            
            let offset = 0;
            
            // Admin ID (32 bytes) - convertir a string Qubic
            const adminBytes = responseBytes.slice(offset, offset + 32);
            const admin = this.bytesToQubicId(adminBytes);
            offset += 32;
            
            // Managers array (16 * 32 = 512 bytes)
            const managers = [];
            for (let i = 0; i < 16; i++) {
                const managerBytes = responseBytes.slice(offset, offset + 32);
                const manager = this.bytesToQubicId(managerBytes);
                managers.push(manager);
                offset += 32;
            }
            
            // nextOrderId (8 bytes little endian)
            const nextOrderId = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // lockedTokens (8 bytes little endian)
            const lockedTokens = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // totalReceivedTokens (8 bytes little endian)
            const totalReceivedTokens = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // earnedFees (8 bytes little endian)
            const earnedFees = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // tradeFeeBillionths (4 bytes little endian)
            const tradeFeeBillionths = this.readUint32LE(responseBytes, offset);
            offset += 4;
            
            // sourceChain (4 bytes little endian)
            const sourceChain = this.readUint32LE(responseBytes, offset);
            
            return {
                success: true,
                admin,
                managers,
                nextOrderId,
                lockedTokens,
                totalReceivedTokens,
                earnedFees,
                tradeFeeBillionths,
                sourceChain
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Utilidades
     */
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
        // Convertir 32 bytes a identidad Qubic
        // Esto es una simplificación - el algoritmo real es más complejo
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let result = "";
        
        for (let i = 0; i < Math.min(32, bytes.length); i++) {
            if (bytes[i] === 0) {
                result += "A"; // Null byte -> 'A'
            } else {
                result += chars[bytes[i] % 26];
            }
        }
        
        // Si todos son ceros, es NULL_ID
        if (bytes.every(b => b === 0)) {
            return "NULL_ID";
        }
        
        return result.padEnd(60, 'A'); // Qubic IDs son de 60 chars
    }
}

/**
 * Test para obtener información del contrato
 */
async function testGetContractInfo() {
    console.log("🔍 TESTING VottunBridge getContractInfo");
    console.log("Contract Index: 13");
    console.log("=" .repeat(60));
    
    try {
        const bridge = new VottunBridgeContractInfo();
        const result = await bridge.getContractInfo();
        
        if (result.success) {
            console.log("🎉 SUCCESS! Contract info retrieved!");
            
            // Análisis importante
            if (result.nextOrderId > 1) {
                console.log("🔥 IMPORTANT: Contract HAS processed orders!");
                console.log("   This means the contract IS working and IS receiving transactions!");
                console.log("   The JavaScript might be sending to the CORRECT address!");
                console.log("   The problem might be in the query logic or timing.");
            } else {
                console.log("❌ Contract has NOT processed any orders yet");
                console.log("   nextOrderId = 1 means no orders have been created");
            }
            
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
    testGetContractInfo();
}

module.exports = {
    VottunBridgeContractInfo,
    testGetContractInfo
};