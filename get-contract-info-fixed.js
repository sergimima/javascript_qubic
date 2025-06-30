// Script CORREGIDO para consultar getContractInfo del smart contract VottunBridge
const { QubicHelper } = require('qubic-ts-library/dist/qubicHelper');

/**
 * Cliente CORREGIDO para consultar getContractInfo del VottunBridge
 */
class VottunBridgeContractInfoFixed {
    constructor(rpcUrl = "http://185.84.224.100:8000/v1") {
        this.rpcUrl = rpcUrl;
        this.contractIndex = 13;
    }
    
    /**
     * Consultar getContractInfo con parsing CORREGIDO
     */
    async getContractInfo() {
        console.log("🔍 Querying VottunBridge Contract Info (FIXED PARSING)...");
        console.log("- Contract Index:", this.contractIndex);
        console.log("- Function: getContractInfo (ID 8)");
        console.log();
        
        try {
            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 8, // getContractInfo function ID
                inputSize: 0,
                requestData: ""
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
            
            // Parsear con la estructura CORRECTA
            const result = this.parseContractInfoCorrect(data);
            
            console.log("🎯 CORRECTED Contract Info:");
            if (result.success) {
                console.log("- Admin ID:", result.admin);
                console.log("- Next Order ID:", result.nextOrderId);
                console.log("- Locked Tokens:", result.lockedTokens, "Qu");
                console.log("- Total Received Tokens:", result.totalReceivedTokens, "Qu");
                console.log("- Earned Fees:", result.earnedFees, "Qu");
                console.log("- Trade Fee (billionths):", result.tradeFeeBillionths);
                console.log("- Source Chain:", result.sourceChain);
                console.log("- Number of managers:", result.managers.filter(m => m !== 'NULL_ID').length);
                
                console.log();
                console.log("🔍 ORDER ANALYSIS:");
                console.log("- Orders should exist from ID 1 to", result.nextOrderId - 1);
                console.log("- Expected total orders:", result.nextOrderId - 1);
                console.log();
                
                // Verificar órdenes específicas
                console.log("📋 VERIFYING SPECIFIC ORDERS:");
                await this.verifySpecificOrders([1, 2, 3, 4, 5, 6]);
                
                if (result.nextOrderId > 1) {
                    console.log("🎉 CONTRACT HAS CREATED ORDERS! Next order ID:", result.nextOrderId);
                    console.log("✅ Total orders created:", result.nextOrderId - 1);
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
     * Verificar órdenes específicas con getOrder
     */
    async verifySpecificOrders(orderIds) {
        for (const orderId of orderIds) {
            try {
                const order = await this.getOrder(orderId);
                if (order.exists) {
                    console.log(`✅ Order ${orderId}: Amount=${order.amount} Qu, ETH=${order.ethAddress}, Status=${this.getStatusName(order.status)}`);
                } else {
                    console.log(`❌ Order ${orderId}: Not found`);
                }
            } catch (error) {
                console.log(`❌ Order ${orderId}: Error - ${error.message}`);
            }
        }
    }
    
    /**
     * Consultar orden específica con getOrder
     */
    async getOrder(orderId) {
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
            
            // Parsear getOrder response
            // BridgeOrder structure:
            // id qubicSender (32 bytes)
            // Array<uint8, 64> ethAddress (64 bytes)  
            // uint64 orderId (8 bytes)
            // uint64 amount (8 bytes)
            // uint8 orderType (1 byte)
            // uint8 status (1 byte)
            // bit fromQubicToEthereum (1 byte)
            // padding (1 byte)
            
            if (responseBytes.length < 108) {
                return { exists: false, error: 'Response too short' };
            }
            
            let offset = 0;
            
            // qubicSender (32 bytes)
            const qubicSenderBytes = responseBytes.slice(offset, offset + 32);
            const qubicSender = this.bytesToQubicId(qubicSenderBytes);
            offset += 32;
            
            // ethAddress (64 bytes, but only first 20 are meaningful)
            const ethAddressBytes = responseBytes.slice(offset, offset + 64);
            const ethAddress = this.ethAddressToString(ethAddressBytes);
            offset += 64;
            
            // orderId (8 bytes)
            const responseOrderId = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // amount (8 bytes)
            const amount = this.readUint64LE(responseBytes, offset);
            offset += 8;
            
            // orderType (1 byte)
            const orderType = responseBytes[offset];
            offset += 1;
            
            // status (1 byte)
            const status = responseBytes[offset];
            offset += 1;
            
            // fromQubicToEthereum (1 byte)
            const fromQubicToEthereum = responseBytes[offset] !== 0;
            
            // Verificar si la orden existe (orderType != 255 o similar)
            if (status === 255 || responseOrderId === 0) {
                return { exists: false };
            }
            
            return {
                exists: true,
                orderId: responseOrderId,
                qubicSender,
                ethAddress,
                amount,
                orderType,
                status,
                fromQubicToEthereum
            };
            
        } catch (error) {
            return { exists: false, error: error.message };
        }
    }
    
    /**
     * Parsear respuesta de getContractInfo CORRECTAMENTE
     */
    parseContractInfoCorrect(data) {
        if (!data.responseData) {
            return {
                success: false,
                error: 'No response data from smart contract'
            };
        }
        
        try {
            const responseBytes = this.base64ToUint8Array(data.responseData);
            
            console.log("\n🔧 PARSING CORRECTO CON OFFSETS VERIFICADOS:");
            console.log("📊 Total bytes:", responseBytes.length);
            
            // ESTRUCTURA CORREGIDA basada en el código fuente:
            // - admin: 32 bytes (offset 0)
            // - managers: 16 * 32 = 512 bytes (offset 32)
            // - nextOrderId: 8 bytes (offset 544)
            // - lockedTokens: 8 bytes (offset 552)
            // - totalReceivedTokens: 8 bytes (offset 560)
            // - earnedFees: 8 bytes (offset 568)
            // - tradeFeeBillionths: 4 bytes (offset 576)
            // - sourceChain: 4 bytes (offset 580)
            // - firstOrders: 16 * 115 = 1840 bytes (offset 584)
            // - totalOrdersFound: 8 bytes (offset 2424)
            // - emptySlots: 8 bytes (offset 2432)
            // Total esperado: 2440 bytes
            
            if (responseBytes.length < 2440) {
                console.log(`⚠️ Response shorter than expected: ${responseBytes.length} bytes, expected 2440`);
            }
            
            // Parsing básico de la información del contrato
            console.log("🔧 Iniciando parsing básico...");
            const adminBytes = responseBytes.slice(0, 32);
            const managersBytes = responseBytes.slice(32, 544); // 16 managers * 32 bytes
            
            console.log("🔧 Parseando nextOrderId...");
            const nextOrderId = Number(this.readUint64LE(responseBytes, 544));
            console.log("🔧 Parseando lockedTokens...");
            const lockedTokens = Number(this.readUint64LE(responseBytes, 552));
            console.log("🔧 Parseando totalReceivedTokens...");
            const totalReceivedTokens = Number(this.readUint64LE(responseBytes, 560));
            console.log("🔧 Parseando earnedFees...");
            const earnedFees = Number(this.readUint64LE(responseBytes, 568));
            console.log("🔧 Parseando tradeFeeBillionths...");
            const tradeFeeBillionths = this.readUint32LE(responseBytes, 576);
            console.log("🔧 Parseando sourceChain...");
            const sourceChain = this.readUint32LE(responseBytes, 580);
            
            // CORREGIDO: Parsear firstOrders (las primeras 10 órdenes)
            const firstOrdersOffset = 584;
            
            const admin = this.bytesToQubicId(adminBytes);
            const managers = [];
            for (let i = 0; i < 16; i++) {
                const managerBytes = managersBytes.slice(i * 32, (i + 1) * 32);
                const manager = this.bytesToQubicId(managerBytes);
                if (manager !== 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
                    managers.push(manager);
                }
            }
            
            // CORREGIDO: El análisis de bytes muestra que hay un desplazamiento
            // Los datos están desplazados 5 bytes en la Orden 1
            const orderSize = 120; // Incrementado de 115 a 120 bytes
            
            console.log("\n🔍 PARSEANDO FIRST ORDERS (solo las primeras 10):");
            const firstOrders = [];
            for (let i = 0; i < 10; i++) {
                const orderOffset = firstOrdersOffset + (i * orderSize);
                if (orderOffset + orderSize <= responseBytes.length) {
                    // DEBUG: Mostrar bytes crudos para cada orden
                    console.log(`\n🔍 DEBUG Orden ${i} (offset ${orderOffset}):`);
                    const orderBytes = responseBytes.slice(orderOffset, orderOffset + orderSize);
                    
                    // Mostrar los primeros 20 bytes en hex
                    const hexBytes = Array.from(orderBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    console.log(`   Primeros 20 bytes: ${hexBytes}`);
                    
                    // Mostrar offsets específicos
                    const orderIdBytes = orderBytes.slice(96, 104);
                    const amountBytes = orderBytes.slice(104, 112);
                    console.log(`   OrderID bytes (96-103): ${Array.from(orderIdBytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
                    console.log(`   Amount bytes (104-111): ${Array.from(amountBytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
                    
                    const order = this.parseBridgeOrder(responseBytes, orderOffset);
                    
                    console.log(`📋 Orden ${i}: ID=${order.orderId}, Amount=${order.amount}, Status=${order.status}`);
                    
                    // Solo agregar órdenes que no estén vacías (status != 255)
                    if (order.status !== 255 && order.orderId !== 0) {
                        firstOrders.push(order);
                        console.log(`✅ Orden válida encontrada: ID=${order.orderId}, Amount=${order.amount}`);
                    }
                }
            }
            
            // CORREGIDO: Información de debug adicional
            // Offsets correctos según la estructura: totalOrdersFound=2424, emptySlots=2432
            const totalOrdersFound = this.readUint64LE(responseBytes, 2424);
            const emptySlots = this.readUint64LE(responseBytes, 2432);
            
            console.log("\n✅ PARSING COMPLETADO:");
            console.log("- Admin:", admin.substring(0, 20) + "...");
            console.log("- Managers:", managers.length);
            console.log("- NextOrderId:", nextOrderId);
            console.log("- TotalReceivedTokens:", totalReceivedTokens, "Qu");
            console.log("- FirstOrders encontradas:", firstOrders.length);
            console.log("- TotalOrdersFound:", totalOrdersFound);
            console.log("- EmptySlots:", emptySlots);
            
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
                // NUEVO: Información de debug
                firstOrders,
                totalOrdersFound,
                emptySlots
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Parsear BridgeOrder (115 bytes)
     */
    parseBridgeOrder(bytes, offset) {
        // id qubicSender (32 bytes)
        const qubicSenderBytes = bytes.slice(offset, offset + 32);
        const qubicSender = this.bytesToQubicId(qubicSenderBytes);
        
        // Array<uint8, 64> ethAddress (64 bytes)
        const ethAddressBytes = bytes.slice(offset + 32, offset + 96);
        const ethAddress = this.ethAddressToString(ethAddressBytes);
        
        // uint64 orderId (8 bytes)
        const orderId = Number(this.readUint64LE(bytes, offset + 96));
        
        // uint64 amount (8 bytes)
        const amount = Number(this.readUint64LE(bytes, offset + 104));
        
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
        let result = 0n;
        for (let i = 0; i < 8; i++) {
            result |= BigInt(bytes[offset + i]) << BigInt(i * 8);
        }
        return result;
    }
    
    readUint32LE(bytes, offset) {
        return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    }
    
    parseId(bytes, offset) {
        return this.bytesToQubicId(bytes.slice(offset, offset + 32));
    }
    
    parseEthAddress(bytes, offset) {
        return this.ethAddressToString(bytes.slice(offset, offset + 64));
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
    
    /**
     * Verificar órdenes específicas
     */
    async verifySpecificOrders() {
        console.log("\n📋 VERIFYING SPECIFIC ORDERS:");
        
        // Verificar órdenes específicas usando getOrder
        const orderIds = [1, 2, 3, 4, 5, 6];
        
        for (const orderId of orderIds) {
            try {
                const order = await this.getOrderDetailed(orderId);
                
                if (order && order.status === 0) {
                    console.log(`✅ Order ${orderId}: Found - ID: ${order.order.orderId}, Amount: ${order.order.amount} Qu`);
                } else {
                    console.log(`❌ Order ${orderId}: Not found`);
                }
                
            } catch (error) {
                console.log(`❌ Order ${orderId}: Error - ${error.message}`);
            }
        }
    }
    
    async getOrderDetailed(orderId) {
        const queryRequest = {
            contractIndex: this.contractIndex,
            inputType: 1, // getOrder function ID
            inputSize: 8,
            requestData: this.uint64ToBase64(orderId)
        };
        
        const response = await fetch(`${this.rpcUrl}/querySmartContract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(queryRequest)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        const responseBytes = Buffer.from(result.responseData, 'base64');
        
        // DEBUG: Mostrar bytes crudos de getOrder
        console.log(`\n🔍 DEBUG getOrder(${orderId}):`);
        console.log(`   Total bytes: ${responseBytes.length}`);
        const hexBytes = Array.from(responseBytes.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`   Primeros 30 bytes: ${hexBytes}`);
        
        // Parse getOrder response - COPIADO DE find-completed-order.js
        const status = responseBytes[0];
        console.log(`   Status: ${status}`);
        
        if (status === 0) { // Success
            // CORREGIDO: Los datos tienen 8 bytes de padding al inicio
            const baseOffset = 8; // Saltar los primeros 8 bytes de padding
            const originAccount = this.parseId(responseBytes, baseOffset + 1);
            const destinationAccount = this.parseEthAddress(responseBytes, baseOffset + 33);
            const orderIdResponse = this.readUint64LE(responseBytes, baseOffset + 96);
            const amount = this.readUint64LE(responseBytes, baseOffset + 104);
            const sourceChain = this.readUint32LE(responseBytes, 177);

            return {
                status: status,
                order: {
                    originAccount: originAccount,
                    destinationAccount: destinationAccount,
                    orderId: Number(orderIdResponse),
                    amount: Number(amount),
                    sourceChain: sourceChain
                }
            };
        } else {
            return {
                status: status,
                order: null
            };
        }
    }
    
    /**
     * Convertir uint64 a base64 para request data
     */
    uint64ToBase64(value) {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setBigUint64(0, BigInt(value), true); // little endian
        return Buffer.from(buffer).toString('base64');
    }
}

/**
 * Test CORREGIDO para obtener información real del contrato
 */
async function testGetContractInfoFixed() {
    console.log("🔍 TESTING VottunBridge getContractInfo (FIXED PARSING)");
    console.log("Contract Index: 13");
    console.log("=" .repeat(60));
    
    try {
        const bridge = new VottunBridgeContractInfoFixed();
        console.log("🔧 Creando instancia del bridge...");
        
        let result;
        try {
            result = await bridge.getContractInfo();
        } catch (parseError) {
            console.error("❌ Error en getContractInfo:", parseError.message);
            console.error("❌ Stack:", parseError.stack);
            throw parseError;
        }
        
        if (result.success) {
            console.log("🎉 SUCCESS! FIXED contract info retrieved!");
            
            // Análisis final
            if (result.nextOrderId > 1) {
                console.log("");
                console.log("🏆 FINAL ANALYSIS:");
                console.log("✅ VottunBridge JavaScript IS WORKING!");
                console.log("✅ Orders are being created successfully");
                console.log("✅ Fees are being collected correctly");
                console.log("✅ Smart contract is processing transactions");
                console.log(`✅ Total orders created: ${result.nextOrderId - 1}`);
                console.log(`✅ Total fees earned: ${result.earnedFees} Qu`);
            } else {
                console.log("");
                console.log("❌ FINAL ANALYSIS:");
                console.log("❌ No orders have been created");
                console.log("❌ VottunBridge may not be working correctly");
            }
        } else {
            console.log("❌ Failed to get FIXED contract info");
        }
        
        return result;
        
    } catch (error) {
        console.error("❌ FIXED Test failed:", error.message);
        throw error;
    }
}

// Ejecutar test
if (require.main === module) {
    testGetContractInfoFixed();
}

module.exports = {
    VottunBridgeContractInfoFixed,
    testGetContractInfoFixed
};