// VottunBridge FINAL - CON ORDERID OUTPUT CORREGIDO
const { QubicHelper } = require('qubic-ts-library/dist/qubicHelper');
const { QubicTransaction } = require('qubic-ts-library/dist/qubic-types/QubicTransaction');

/**
 * Wrapper para el payload que cumple con la interfaz esperada por la librería oficial
 */
class VottunBridgePayloadWrapper {
    constructor(ethAddress, amount, direction) {
        this.data = this.createPayloadData(ethAddress, amount, direction);
    }
    
    createPayloadData(ethAddress, amount, direction) {
        const buffer = new Uint8Array(73); // 64 + 8 + 1
        let offset = 0;
        
        // ETH Address (64 bytes) - padding con ceros
        const cleanAddress = ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress;
        const addressBytes = new Uint8Array(64);
        
        for (let i = 0; i < cleanAddress.length && i < 40; i += 2) {
            const hexByte = cleanAddress.substr(i, 2);
            addressBytes[i / 2] = parseInt(hexByte, 16);
        }
        
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
        
        // Direction (1 byte)
        buffer[offset] = direction ? 1 : 0;
        
        return buffer;
    }
    
    // Métodos requeridos por la librería oficial
    getPackageSize() {
        return this.data.length;
    }
    
    getPackageData() {
        return this.data;
    }
}

/**
 * VottunBridge Client FINAL con ORDERID SUPPORT CORREGIDO
 */
class VottunBridgeOfficialCorrected {
    constructor(rpcUrl = "http://185.84.224.100:8000/v1") {
        this.rpcUrl = rpcUrl;
        this.helper = new QubicHelper();
    }
    
    async createOrder(qubicSeed, ethAddress, amount, direction, targetTick) {
        console.log("🎯 VottunBridge FINAL - Using OFFICIAL Qubic Library (WITH ORDERID)");
        console.log("- Library: qubic-ts-library v0.1.4");
        console.log("- FourQ: REAL implementation (241KB)");
        console.log("- Signatures: OFFICIAL Qubic cryptography");
        console.log("- OrderID: Smart contract returns orderID");
        console.log();
        
        try {
            // 1. Crear identity con librería oficial
            console.log("🔑 Creating identity with official library...");
            const id = await this.helper.createIdPackage(qubicSeed);
            
            console.log("✅ Identity created:");
            console.log("- Identity:", id.publicId);
            console.log();
            
            // 2. Calcular fee
            const requiredFee = Math.floor((amount * 5000000) / 1000000000);
            
            console.log("🔧 Bridge parameters:");
            console.log("- ETH Address:", ethAddress);
            console.log("- Amount:", amount, "Qu");
            console.log("- Direction:", direction ? "Qubic → Ethereum" : "Ethereum → Qubic");
            console.log("- Target tick:", targetTick);
            console.log("- Required fee:", requiredFee, "Qu");
            console.log();
            
            // 3. Crear payload con wrapper compatible
            console.log("📦 Creating VottunBridge payload wrapper...");
            const bridgePayload = new VottunBridgePayloadWrapper(ethAddress, amount, direction);
            
            console.log("✅ VottunBridge payload wrapper:");
            console.log("- Size:", bridgePayload.getPackageSize(), "bytes (should be 73)");
            console.log("- Structure: ETH address (64) + amount (8) + direction (1)");
            console.log();
            
            // 4. Crear transaction con librería OFICIAL
            console.log("🔐 Creating transaction with OFFICIAL library...");
            
            const bridgeNodeAddress = "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML";
            console.log("🔗 Using bridge node address:", bridgeNodeAddress);
            
            const transaction = new QubicTransaction()
                .setSourcePublicKey(id.publicKey)
                .setDestinationPublicKey(bridgeNodeAddress)  
                .setAmount(requiredFee)  // Fee correcto
                .setTick(targetTick)
                .setInputType(1); // CREATE_ORDER
            
            // Configurar el payload
            const payloadData = bridgePayload.getPackageData();
            transaction.setInputSize(payloadData.length);
            transaction.setPayload(bridgePayload);
            
            console.log("✅ Transaction configured:");
            console.log("- Source:", id.publicId);
            console.log("- Destination: VottunBridge contract");
            console.log("- Amount (fee):", requiredFee, "Qu");
            console.log("- Input type: 1 (CREATE_ORDER)");
            console.log("- Payload size:", bridgePayload.getPackageSize(), "bytes");
            console.log();
            
            // 5. Firmar transacción
            console.log("🔐 Signing with OFFICIAL Qubic library...");
            const signedData = await transaction.build(qubicSeed);
            
            console.log("✅ Transaction SIGNED:");
            console.log("- Signed data length:", signedData ? signedData.length : 0, "bytes");
            
            if (!signedData || signedData.length === 0) {
                throw new Error("Failed to sign transaction: No signed data returned");
            }
            
            // 6. Codificar para broadcast
            console.log("📦 Encoding transaction to Base64...");
            const encodedTransaction = Buffer.from(signedData).toString('base64');
            
            console.log("✅ Transaction encoded:");
            console.log("- Encoded length:", encodedTransaction.length, "chars");
            console.log("- Ready for broadcast with orderID response expected");
            
            return {
                id,
                transaction: transaction,
                signedData: signedData,
                encodedTransaction,
                bridgePayload
            };
            
        } catch (error) {
            console.error("❌ Error creating order:", error.message);
            throw error;
        }
    }
    
    async broadcastTransaction(encodedTransaction) {
        try {
            console.log("📡 Broadcasting transaction...");
            console.log("- Expecting orderID in response from smart contract");
            
            const response = await fetch(`${this.rpcUrl}/broadcast-transaction`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "POST",
                body: JSON.stringify({
                    encodedTransaction: encodedTransaction
                })
            });
            
            const data = await response.json();
            
            if (response.status !== 200) {
                console.error("❌ Broadcast failed:", data);
                throw new Error(`Broadcast failed (${response.status}): ${JSON.stringify(data)}`);
            }
            
            console.log("🎉 SUCCESS! Transaction accepted by Qubic network!");
            console.log("📊 Server response:", data);
            
            return data;
            
        } catch (error) {
            console.error("❌ Broadcast error:", error);
            throw error;
        }
    }
    
    /**
     * FUNCIÓN CORREGIDA: Obtener orderID automáticamente después del broadcast
     */
    async getOrderIdFromTransaction(transactionId) {
        console.log("🔍 Getting orderID for transaction:", transactionId);
        
        try {
            const contractInfoResponse = await fetch(`${this.rpcUrl}/querySmartContract`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contractIndex: 13,
                    inputType: 8, // getContractInfo
                    inputSize: 0,
                    requestData: ""
                })
            });
            
            if (contractInfoResponse.status !== 200) {
                throw new Error("Failed to get contract info");
            }
            
            const contractData = await contractInfoResponse.json();
            const responseBytes = this.base64ToUint8Array(contractData.responseData);
            
            // ESTRUCTURA CORRECTA del getContractInfo_output:
            // nextOrderId está en offset 544, NO 584
            const NEXT_ORDER_ID_OFFSET = 544;
            
            if (responseBytes.length < NEXT_ORDER_ID_OFFSET + 8) {
                throw new Error(`Response too short: ${responseBytes.length} bytes`);
            }
            
            const nextOrderId = this.readUint64LE(responseBytes, NEXT_ORDER_ID_OFFSET);
            const earnedFees = this.readUint64LE(responseBytes, 568);
            
            console.log("✅ Contract Info:");
            console.log("- Next OrderID:", nextOrderId);
            console.log("- Earned Fees:", earnedFees, "Qu");
            
            // Nuestra orden es nextOrderId - 1
            const ourOrderId = nextOrderId > 1 ? nextOrderId - 1 : 1;
            
            console.log("✅ OrderID determined:", ourOrderId);
            
            return ourOrderId;
            
        } catch (error) {
            console.error("❌ Error getting orderID:", error);
            throw error;
        }
    }
    
    // Utilidades
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
}

/**
 * Test completo - ejecutar con: node vottun-bridge.js
 */
async function testVottunBridgeWithOrderId() {
    console.log("🚀 TESTING VOTTUNBRIDGE WITH ORDERID SUPPORT");
    console.log("=" .repeat(70));
    
    try {
        // Obtener tick actual
        const tickResponse = await fetch("http://185.84.224.100:8000/v1/tick-info");
        const tickData = await tickResponse.json();
        const targetTick = tickData.tickInfo.tick + 100;

        console.log("🕐 Current tick:", tickData.tickInfo.tick);
        console.log("🎯 Target tick:", targetTick);
        console.log();

        // Parámetros
        const qubicSeed = "vtaakhxwtxxwtqidnevwbwskfcleeekrduxvplcvwhgrymbqweyzius";
        const ethAddress = "0x090378a9c80c5E1Ced85e56B2128c1e514E75657";
        const amount = 1500;
        const direction = true;

        // Crear bridge
        const bridge = new VottunBridgeOfficialCorrected();
        
        // Crear orden
        console.log("🔧 Creating order...");
        const result = await bridge.createOrder(qubicSeed, ethAddress, amount, direction, targetTick);
        
        // Broadcast
        console.log("📡 Broadcasting transaction...");
        const broadcastResult = await bridge.broadcastTransaction(result.encodedTransaction);
        
        // Obtener orderID automáticamente
        console.log("🔍 Getting orderID...");
        const orderId = await bridge.getOrderIdFromTransaction(broadcastResult.transactionId);
        
        console.log("🎉 ORDER CREATED SUCCESSFULLY!");
        console.log("- Transaction ID:", broadcastResult.transactionId);
        console.log("- Order ID:", orderId);
        console.log("- Amount:", amount, "Qu");
        console.log("- ETH Address:", ethAddress);
        console.log("- Direction:", direction ? "Qubic → Ethereum" : "Ethereum → Qubic");
        
        return { ...broadcastResult, orderId: orderId };
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        throw error;
    }
}

// Ejecutar test si se llama directamente
if (require.main === module) {
    testVottunBridgeWithOrderId();
}

module.exports = {
    VottunBridgeOfficialCorrected,
    VottunBridgePayloadWrapper,
    testVottunBridgeWithOrderId
};