// Script para consultar getOrder por orderId directo
const { QubicHelper } = require('qubic-ts-library/dist/qubicHelper');

/**
 * Cliente para consultar getOrder del smart contract VottunBridge
 */
class VottunBridgeGetOrder {
    constructor(rpcUrl = "http://185.84.224.100:8000/v1") {
        this.rpcUrl = rpcUrl;
        this.contractIndex = 13;
    }
    
    /**
     * Crear payload para getOrder (8 bytes orderId)
     */
    createGetOrderPayload(orderId) {
        const buffer = new Uint8Array(8);
        
        // orderId como uint64 little endian
        let orderValue = BigInt(orderId);
        for (let i = 0; i < 8; i++) {
            buffer[i] = Number(orderValue & 0xFFn);
            orderValue = orderValue >> 8n;
        }
        
        return buffer;
    }
    
    /**
     * Consultar getOrder del smart contract
     */
    async queryOrder(orderId) {
        console.log("🔍 Querying VottunBridge getOrder...");
        console.log("- Contract Index:", this.contractIndex);
        console.log("- Order ID:", orderId);
        console.log();
        
        try {
            // Crear payload para la consulta
            const payload = this.createGetOrderPayload(orderId);
            
            console.log("📦 Query payload:");
            console.log("- Size:", payload.length, "bytes");
            console.log("- Order ID bytes:", Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            // Convertir payload a base64
            const payloadBase64 = this.uint8ArrayToBase64(payload);
            
            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 1, // getOrder function ID
                inputSize: payload.length,
                requestData: payloadBase64
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
            console.log("✅ Smart contract response:", JSON.stringify(data, null, 2));
            
            // Parsear la respuesta
            const result = this.parseGetOrderResponse(data);
            
            console.log("🎯 Parsed result:");
            console.log("- Query status:", result.queryStatus);
            console.log("- Order found:", result.found);
            if (result.found) {
                console.log("- Order ID:", result.order.orderId);
                console.log("- Origin Account:", result.order.originAccount);
                console.log("- Destination Account:", result.order.destinationAccount);
                console.log("- Amount:", result.order.amount, "Qu");
                console.log("- Source Chain:", result.order.sourceChain);
            }
            
            return result;
            
        } catch (error) {
            console.error("❌ Error querying order:", error.message);
            throw error;
        }
    }
    
    /**
     * Parsear respuesta de getOrder
     */
    parseGetOrderResponse(data) {
        if (!data.responseData) {
            return {
                queryStatus: 'error',
                found: false,
                error: 'No response data from smart contract'
            };
        }
        
        try {
            // Decodificar base64
            const responseBytes = this.base64ToUint8Array(data.responseData);
            
            console.log("📊 Response bytes length:", responseBytes.length);
            console.log("📊 First 16 bytes:", Array.from(responseBytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            if (responseBytes.length < 1) {
                return {
                    queryStatus: 'error',
                    found: false,
                    error: 'Response data too short'
                };
            }
            
            // Primer byte es el status
            const status = responseBytes[0];
            
            if (status !== 0) {
                const statusNames = {
                    1: 'not_found',
                    2: 'error'
                };
                return {
                    queryStatus: statusNames[status] || 'unknown_error',
                    found: false,
                    rawStatus: status
                };
            }
            
            // Si status = 0, parsear OrderResponse
            // Según el smart contract:
            // struct OrderResponse {
            //     id originAccount (32 bytes)
            //     Array<uint8, 64> destinationAccount (64 bytes)  
            //     uint64 orderId (8 bytes)
            //     uint64 amount (8 bytes)
            //     Array<uint8, 64> memo (64 bytes)
            //     uint32 sourceChain (4 bytes)
            // }
            // + Array<uint8, 32> message (32 bytes)
            // Total: 1 + 32 + 64 + 8 + 8 + 64 + 4 + 32 = 213 bytes
            
            if (responseBytes.length < 213) {
                return {
                    queryStatus: 'parse_error',
                    found: false,
                    error: `Response too short: ${responseBytes.length}, expected 213`
                };
            }
            
            let offset = 1; // Skip status byte
            
            // originAccount (32 bytes)
            const originAccountBytes = responseBytes.slice(offset, offset + 32);
            const originAccount = this.bytesToQubicId(originAccountBytes);
            offset += 32;
            
            // destinationAccount (64 bytes) - ETH address
            const destinationAccountBytes = responseBytes.slice(offset, offset + 64);
            const destinationAccount = this.bytesToEthAddress(destinationAccountBytes);
            offset += 64;
            
            // orderId (8 bytes little endian)
            const orderId = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // amount (8 bytes little endian)
            const amount = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // memo (64 bytes) - skip for now
            offset += 64;
            
            // sourceChain (4 bytes little endian)
            const sourceChain = this.readUint32LE(responseBytes, offset);
            offset += 4;
            
            // message (32 bytes) - skip for now
            
            return {
                queryStatus: 'success',
                found: true,
                order: {
                    orderId,
                    originAccount,
                    destinationAccount,
                    amount,
                    sourceChain
                }
            };
            
        } catch (error) {
            return {
                queryStatus: 'parse_error',
                found: false,
                error: error.message
            };
        }
    }
    
    /**
     * Utilidades
     */
    uint8ArrayToBase64(uint8Array) {
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
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
        // Simplificado - convertir bytes a ID de Qubic
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let result = "";
        
        for (let i = 0; i < Math.min(32, bytes.length); i++) {
            if (bytes[i] === 0) {
                result += "A";
            } else {
                result += chars[bytes[i] % 26];
            }
        }
        
        return result.padEnd(60, 'A');
    }
    
    bytesToEthAddress(bytes) {
        // Convertir primeros 20 bytes a dirección ETH
        let address = "0x";
        for (let i = 0; i < Math.min(20, bytes.length); i++) {
            address += bytes[i].toString(16).padStart(2, '0');
        }
        return address;
    }
}

/**
 * Test para obtener orden por ID
 */
async function testGetOrder() {
    console.log("🔍 TESTING VottunBridge getOrder by ID");
    console.log("Contract Index: 13");
    console.log("=" .repeat(60));
    
    try {
        const bridge = new VottunBridgeGetOrder();
        
        // Probar con orderId = 1 (la orden que se creó)
        console.log("🎯 Querying order ID 1 (the order that was created)...");
        const result = await bridge.queryOrder(3);
        
        if (result.found) {
            console.log("🎉 SUCCESS! Order found!");
            console.log("📊 This CONFIRMS the JavaScript is working correctly!");
            console.log("📊 The order was created successfully in the smart contract!");
            
        } else {
            console.log("❌ Order 1 not found");
            console.log("🤔 This is strange since contractInfo shows nextOrderId = 2");
        }
        
        return result;
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        throw error;
    }
}

// Ejecutar test
if (require.main === module) {
    testGetOrder();
}

module.exports = {
    VottunBridgeGetOrder,
    testGetOrder
};