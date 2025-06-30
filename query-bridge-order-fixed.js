// Script para consultar getOrderByDetails del smart contract VottunBridge - FIXED
const { QubicHelper } = require('qubic-ts-library/dist/qubicHelper');

/**
 * Cliente para consultar el smart contract VottunBridge (solo lectura)
 */
class VottunBridgeQuery {
    constructor(rpcUrl = "http://185.84.224.100:8000/v1") {
        this.rpcUrl = rpcUrl;
        this.contractIndex = 13; // ✅ CORRECTO
    }
    
    /**
     * Crear payload para getOrderByDetails - FIXED VERSION
     */
    createGetOrderByDetailsPayload(ethAddress, amount, status) {
        const buffer = new Uint8Array(73); // 64 + 8 + 1
        let offset = 0;
        
        // ETH Address (64 bytes) - CORREGIDO: leer 42 caracteres completos
        const cleanAddress = ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress;
        const addressBytes = new Uint8Array(64);
        
        // ✅ FIX: Cambiar de 40 a 42 caracteres (40 -> cleanAddress.length)
        // Una dirección ETH tiene 42 caracteres hex (21 bytes), no 40
        const maxChars = Math.min(cleanAddress.length, 42); // ← CORREGIDO
        
        for (let i = 0; i < maxChars; i += 2) {
            const hexByte = cleanAddress.substr(i, 2);
            addressBytes[i / 2] = parseInt(hexByte, 16);
        }
        
        // Resto del array ya está inicializado con zeros (padding automático a 64 bytes)
        buffer.set(addressBytes, offset);
        offset += 64;
        
        // Amount (8 bytes, little endian)
        const amountBytes = new Uint8Array(8);
        let amountValue = BigInt(amount);
        for (let i = 0; i < 8; i++) {
            amountBytes[i] = Number(amountValue & 0xFFn);
            amountValue = amountValue >> 8n;
        }
        buffer.set(amountBytes, offset);
        offset += 8;
        
        // Status (1 byte)
        buffer[offset] = status;
        
        console.log("🔧 FIXED Payload details:");
        console.log("- ETH Address chars read:", maxChars, "(was 40, now up to 42)");
        console.log("- ETH Address bytes used:", Math.ceil(maxChars / 2), "of 64");
        console.log("- Padding zeros:", 64 - Math.ceil(maxChars / 2), "bytes");
        console.log("- Total payload size:", buffer.length, "bytes");
        
        return buffer;
    }
    
    /**
     * Consultar getOrderByDetails del smart contract
     */
    async queryOrderByDetails(ethAddress, amount, status) {
        console.log("🔍 Querying VottunBridge smart contract (FIXED VERSION)...");
        console.log("- Contract Index:", this.contractIndex);
        console.log("- ETH Address:", ethAddress);
        console.log("- Amount:", amount, "Qu");
        console.log("- Status:", this.getStatusName(status));
        console.log();
        
        try {
            // Crear payload para la consulta (ahora con FIX)
            const payload = this.createGetOrderByDetailsPayload(ethAddress, amount, status);
            
            console.log("📦 Query payload (FIXED):");
            console.log("- Size:", payload.length, "bytes");
            
            // Convertir payload a base64
            const payloadBase64 = this.uint8ArrayToBase64(payload);
            
            // ✅ CORRECTO: contractIndex = 13
            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 7, // getOrderByDetails
                inputSize: payload.length,
                requestData: payloadBase64
            };
            
            console.log("📡 Sending query...");
            console.log("- Contract Index:", queryRequest.contractIndex);
            console.log("- Input type:", queryRequest.inputType);
            
            // Hacer la consulta
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
            const result = this.parseGetOrderByDetailsResponse(data);
            
            console.log("🎯 Parsed result:");
            console.log("- Query status:", result.queryStatus);
            console.log("- Order found:", result.found);
            if (result.found) {
                console.log("- Order ID:", result.orderId);
            }
            
            return result;
            
        } catch (error) {
            console.error("❌ Error querying smart contract:", error.message);
            throw error;
        }
    }
    
    /**
     * Parsear respuesta de getOrderByDetails
     */
    parseGetOrderByDetailsResponse(data) {
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
            
            if (responseBytes.length < 9) { // 1 byte status + 8 bytes orderId
                return {
                    queryStatus: 'error',
                    found: false,
                    error: 'Response data too short'
                };
            }
            
            // Parsear status (1 byte)
            const status = responseBytes[0];
            
            // Parsear orderId (8 bytes little endian)
            let orderId = 0n;
            for (let i = 0; i < 8; i++) {
                orderId += BigInt(responseBytes[1 + i]) << (BigInt(i) * 8n);
            }
            
            const statusNames = {
                0: 'success',
                1: 'not_found',
                2: 'invalid_amount'
            };
            
            return {
                queryStatus: statusNames[status] || 'unknown',
                found: status === 0,
                orderId: status === 0 ? Number(orderId) : null,
                rawStatus: status
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
     * Buscar orden creada recientemente
     */
    async findRecentOrder(ethAddress, amount) {
        console.log("🔎 Searching for recent order (FIXED VERSION)...");
        
        const statuses = [
            { value: 0, name: 'created' },
            { value: 1, name: 'completed' },
            { value: 2, name: 'refunded' }
        ];
        
        for (const statusInfo of statuses) {
            console.log(`\n🔍 Checking status: ${statusInfo.name}...`);
            
            try {
                const result = await this.queryOrderByDetails(ethAddress, amount, statusInfo.value);
                
                if (result.found) {
                    console.log(`🎉 Order found with status: ${statusInfo.name}`);
                    return {
                        ...result,
                        statusName: statusInfo.name
                    };
                }
                
            } catch (error) {
                console.log(`❌ Error checking ${statusInfo.name}:`, error.message);
            }
        }
        
        console.log("❌ Order not found in any status");
        return {
            found: false,
            queryStatus: 'not_found_any_status'
        };
    }
    
    /**
     * Utilidades
     */
    getStatusName(status) {
        const names = { 0: 'created', 1: 'completed', 2: 'refunded' };
        return names[status] || 'unknown';
    }
    
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
}

/**
 * Test para consultar una orden específica - FIXED
 */
async function testQueryOrderFixed() {
    console.log("🔍 TESTING VottunBridge Smart Contract Query - FIXED VERSION");
    console.log("Contract Index: 13");
    console.log("FIX: Reading 42 ETH address characters instead of 40");
    console.log("=" .repeat(70));
    
    try {
        const bridge = new VottunBridgeQuery();
        
        // ✅ CORREGIDO: Usar los MISMOS parámetros del test exitoso
        const ethAddress = "0x090378a9c80c5E1Ced85e56B2128c1e514E75357"; // ← MISMO que el test
        const amount = 5100; // ← MISMO que el test
        
        console.log("🎯 Query parameters (SAME as successful test):");
        console.log("- ETH Address:", ethAddress);
        console.log("- ETH Address length (without 0x):", ethAddress.slice(2).length, "chars");
        console.log("- Amount:", amount, "Qu");
        console.log();
        
        // Buscar la orden en todos los estados
        const result = await bridge.findRecentOrder(ethAddress, amount);
        
        if (result.found) {
            console.log("🎉 SUCCESS! Order found in smart contract!");
            console.log("📊 Order details:");
            console.log("- Order ID:", result.orderId);
            console.log("- Status:", result.statusName);
            console.log("🏆 FIX SUCCESSFUL: getOrderByDetails now works!");
            
        } else {
            console.log("❌ Order still not found");
            console.log("🔍 Even with the fix, may need to investigate further");
        }
        
        return result;
        
    } catch (error) {
        console.error("❌ Query test failed:", error.message);
        throw error;
    }
}

// Ejecutar test
if (require.main === module) {
    testQueryOrderFixed();
}

module.exports = {
    VottunBridgeQuery,
    testQueryOrderFixed
};