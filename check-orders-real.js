// Script CORREGIDO para consultar órdenes del VottunBridge - PARSING REAL
const { QubicHelper } = require('qubic-ts-library/dist/qubicHelper');

/**
 * Cliente CORREGIDO para consultar órdenes del VottunBridge
 */
class VottunBridgeOrderChecker {
    constructor(rpcUrl = "http://185.84.224.100:8000/v1") {
        this.rpcUrl = rpcUrl;
        this.contractIndex = 13;
    }
    
    /**
     * Verificar órdenes específicas con getOrder - PARSING CORREGIDO
     */
    async checkOrders() {
        console.log("🔍 CHECKING VOTTUNBRIDGE ORDERS - CORRECTED PARSING");
        console.log("Contract Index:", this.contractIndex);
        console.log("=" .repeat(60));
        
        try {
            // Primero obtener info del contrato
            const contractInfo = await this.getContractInfo();
            
            if (!contractInfo.success) {
                console.log("❌ Failed to get contract info");
                return;
            }
            
            console.log("📊 Contract Status:");
            console.log("- Next Order ID:", contractInfo.nextOrderId);
            console.log("- Earned Fees:", contractInfo.earnedFees, "Qu");
            console.log("- Expected orders: 1 to", contractInfo.nextOrderId - 1);
            console.log();
            
            // Verificar órdenes del 1 al nextOrderId-1
            console.log("🔍 CHECKING INDIVIDUAL ORDERS:");
            let foundOrders = 0;
            let totalOrders = contractInfo.nextOrderId - 1;
            
            for (let orderId = 1; orderId <= Math.min(totalOrders, 10); orderId++) {
                const order = await this.getOrderCorrected(orderId);
                
                if (order.exists) {
                    foundOrders++;
                    console.log(`✅ Order ${orderId}:`);
                    console.log(`   - Amount: ${order.amount} Qu`);
                    console.log(`   - ETH Address: ${order.ethAddress}`);
                    console.log(`   - Qubic Sender: ${order.qubicSender}`);
                    console.log(`   - Status: ${this.getStatusName(order.status)}`);
                    console.log(`   - Source Chain: ${order.sourceChain}`);
                } else {
                    console.log(`❌ Order ${orderId}: ${order.error || 'Not found'}`);
                }
            }
            
            console.log();
            console.log("📊 FINAL RESULTS:");
            console.log(`- Expected orders: ${totalOrders}`);
            console.log(`- Found orders: ${foundOrders}`);
            console.log(`- Missing orders: ${totalOrders - foundOrders}`);
            
            if (foundOrders === totalOrders) {
                console.log("🎉 SUCCESS! All expected orders found!");
                console.log("✅ VottunBridge JavaScript IS WORKING CORRECTLY!");
            } else if (foundOrders > 0) {
                console.log("⚠️  PARTIAL SUCCESS: Some orders found, some missing");
                console.log("🔍 This might indicate a parsing issue or order state problem");
            } else {
                console.log("❌ FAILURE: No orders found despite nextOrderId indicating orders exist");
                console.log("❌ VottunBridge JavaScript may not be working correctly");
            }
            
            return {
                expectedOrders: totalOrders,
                foundOrders: foundOrders,
                success: foundOrders === totalOrders
            };
            
        } catch (error) {
            console.error("❌ Error checking orders:", error.message);
            throw error;
        }
    }
    
    /**
     * Consultar orden específica con getOrder - ESTRUCTURA CORREGIDA
     */
    async getOrderCorrected(orderId) {
        try {
            // Crear input para getOrder (orderId como uint64 little endian)
            const inputBuffer = new Uint8Array(8);
            let value = BigInt(orderId);
            for (let i = 0; i < 8; i++) {
                inputBuffer[i] = Number(value & 0xFFn);
                value = value >> 8n;
            }
            
            const inputBase64 = Buffer.from(inputBuffer).toString('base64');
            
            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 1, // getOrder function ID
                inputSize: 8,
                requestData: inputBase64
            };
            
            const response = await fetch(`${this.rpcUrl}/querySmartContract`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryRequest)
            });
            
            if (response.status !== 200) {
                return { exists: false, error: 'Query failed' };
            }
            
            const data = await response.json();
            const responseBytes = this.base64ToUint8Array(data.responseData);
            
            console.log(`🔍 Order ${orderId} raw response length:`, responseBytes.length);
            console.log(`🔍 First 32 bytes:`, Array.from(responseBytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            // ESTRUCTURA CORRECTA según smart contract:
            // struct getOrder_output {
            //     uint8 status;                    // 1 byte - offset 0
            //     OrderResponse order;             // 164 bytes - offset 1
            //     Array<uint8, 32> message;        // 32 bytes - offset 165
            // };
            //
            // struct OrderResponse {
            //     id originAccount;                    // 32 bytes - offset 1
            //     Array<uint8, 64> destinationAccount; // 64 bytes - offset 33
            //     uint64 orderId;                      // 8 bytes - offset 97
            //     uint64 amount;                       // 8 bytes - offset 105
            //     Array<uint8, 64> memo;               // 64 bytes - offset 113
            //     uint32 sourceChain;                  // 4 bytes - offset 177
            // };
            
            if (responseBytes.length < 181) { // 1 + 180 minimum
                return { exists: false, error: `Response too short: ${responseBytes.length} bytes` };
            }
            
            let offset = 0;
            
            // status (1 byte)
            const status = responseBytes[offset];
            offset += 1;
            
            if (status !== 0) {
                return { exists: false, error: `Order not found (status: ${status})` };
            }
            
            // OrderResponse structure starts here
            // originAccount (32 bytes)
            const originAccountBytes = responseBytes.slice(offset, offset + 32);
            const qubicSender = this.bytesToQubicId(originAccountBytes);
            offset += 32;
            
            // destinationAccount (64 bytes, but only first 20 meaningful for ETH)
            const destinationBytes = responseBytes.slice(offset, offset + 64);
            const ethAddress = this.ethAddressToString(destinationBytes);
            offset += 64;
            
            // orderId (8 bytes)
            const responseOrderId = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // amount (8 bytes)
            const amount = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // memo (64 bytes) - skip for now
            offset += 64;
            
            // sourceChain (4 bytes)
            const sourceChain = this.readUint32LE(responseBytes, offset);
            
            console.log(`✅ Order ${orderId} parsed:`, {
                responseOrderId,
                amount,
                ethAddress: ethAddress.substring(0, 42),
                qubicSender: qubicSender.substring(0, 20) + '...',
                sourceChain
            });
            
            return {
                exists: true,
                orderId: responseOrderId,
                qubicSender,
                ethAddress,
                amount,
                sourceChain,
                status: 0 // Si llegamos aquí, la orden existe
            };
            
        } catch (error) {
            console.log(`❌ Error getting order ${orderId}:`, error.message);
            return { exists: false, error: error.message };
        }
    }
    
    /**
     * Obtener info básica del contrato
     */
    async getContractInfo() {
        try {
            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 8, // getContractInfo function ID
                inputSize: 0,
                requestData: ""
            };
            
            const response = await fetch(`${this.rpcUrl}/querySmartContract`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryRequest)
            });
            
            if (response.status !== 200) {
                return { success: false, error: 'Failed to get contract info' };
            }
            
            const data = await response.json();
            const responseBytes = this.base64ToUint8Array(data.responseData);
            
            if (responseBytes.length < 584) {
                return { success: false, error: 'Response too short' };
            }
            
            // nextOrderId en offset 544
            const nextOrderId = this.readUint64LE(responseBytes, 544);
            
            // earnedFees en offset 568
            const earnedFees = this.readUint64LE(responseBytes, 568);
            
            return {
                success: true,
                nextOrderId,
                earnedFees
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Utilidades
     */
    getStatusName(status) {
        const names = {
            0: '(Created)',
            1: '(Completed)', 
            2: '(Refunded)'
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
 * Test para verificar órdenes reales
 */
async function testOrderChecker() {
    try {
        const checker = new VottunBridgeOrderChecker();
        const result = await checker.checkOrders();
        return result;
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        throw error;
    }
}

// Ejecutar test
if (require.main === module) {
    testOrderChecker();
}

module.exports = {
    VottunBridgeOrderChecker,
    testOrderChecker
};