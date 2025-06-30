const fetch = require('node-fetch');

class ContractInitializationChecker {
    constructor() {
        this.rpcUrl = 'http://185.84.224.100:8000/v1';
        this.contractIndex = 13;
    }

    async checkInitialization() {
        try {
            console.log("🔍 VERIFICANDO INICIALIZACIÓN DEL CONTRATO");
            console.log("============================================================");
            
            // Consultar el contrato
            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 8,
                inputSize: 0,
                requestData: ""
            };

            console.log("📡 Consultando contrato...");
            const response = await fetch(`${this.rpcUrl}/querySmartContract`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryRequest)
            });

            const data = await response.json();
            const responseBytes = new Uint8Array(Buffer.from(data.responseData, 'base64'));
            
            console.log(`📊 Total bytes recibidos: ${responseBytes.length}`);
            
            // Parsear campos básicos
            const admin = this.parseId(responseBytes, 0);
            const nextOrderId = this.readUint64LE(responseBytes, 544);
            const lockedTokens = this.readUint64LE(responseBytes, 552);
            const totalReceivedTokens = this.readUint64LE(responseBytes, 560);
            const earnedFees = this.readUint64LE(responseBytes, 568);
            const tradeFeeBillionths = this.readUint32LE(responseBytes, 576);
            
            console.log("\n📋 CAMPOS BÁSICOS DEL CONTRATO:");
            console.log(`- Admin: ${admin.substring(0, 20)}...`);
            console.log(`- Next Order ID: ${nextOrderId}`);
            console.log(`- Locked Tokens: ${lockedTokens} Qu`);
            console.log(`- Total Received Tokens: ${totalReceivedTokens} Qu`);
            console.log(`- Earned Fees: ${earnedFees} Qu`);
            console.log(`- Trade Fee Billionths: ${tradeFeeBillionths}`);
            
            // Verificar indicadores de inicialización
            console.log("\n🎯 ANÁLISIS DE INICIALIZACIÓN:");
            
            // 1. Admin debe estar configurado (no NULL_ID)
            const isAdminSet = admin !== "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
            console.log(`✅ Admin configurado: ${isAdminSet ? 'SÍ' : 'NO'}`);
            
            // 2. nextOrderId debe ser 1 (inicializado)
            const isNextOrderIdCorrect = nextOrderId === 1n;
            console.log(`✅ NextOrderId = 1: ${isNextOrderIdCorrect ? 'SÍ' : 'NO'}`);
            
            // 3. Trade fee debe ser 5000000 (0.5%)
            const isTradeFeeBillionthsCorrect = tradeFeeBillionths === 5000000;
            console.log(`✅ Trade fee configurado: ${isTradeFeeBillionthsCorrect ? 'SÍ' : 'NO'}`);
            
            // 4. Verificar managers array (debe estar inicializado con NULL_ID)
            console.log("\n🔍 VERIFICANDO MANAGERS ARRAY:");
            let managersInitialized = true;
            for (let i = 0; i < 16; i++) {
                const managerOffset = 32 + (i * 32);
                const manager = this.parseId(responseBytes, managerOffset);
                const isNullId = manager === "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
                
                if (i < 3) { // Solo mostrar los primeros 3
                    console.log(`- Manager ${i}: ${isNullId ? 'NULL_ID (correcto)' : 'CONFIGURADO'}`);
                }
                
                if (!isNullId && i > 0) { // El primer manager podría estar configurado
                    // Esto es normal, no es error
                }
            }
            
            // 5. Verificar primeros slots del array orders
            console.log("\n🔍 VERIFICANDO PRIMEROS SLOTS DE ÓRDENES:");
            const firstOrdersOffset = 584;
            const orderSize = 115;
            
            let emptySlots = 0;
            let nonEmptySlots = 0;
            let statusZeroSlots = 0;
            let status255Slots = 0;
            
            for (let i = 0; i < 10; i++) {
                const slotOffset = firstOrdersOffset + (i * orderSize);
                const order = this.parseBridgeOrder(responseBytes, slotOffset);
                
                if (order.status === 255) {
                    status255Slots++;
                    emptySlots++;
                } else if (order.status === 0 && order.orderId === 0 && order.amount === 0) {
                    statusZeroSlots++;
                    emptySlots++;
                } else {
                    nonEmptySlots++;
                }
                
                if (i < 3) {
                    console.log(`- Slot ${i}: Status=${order.status}, OrderID=${order.orderId}, Amount=${order.amount}`);
                }
            }
            
            console.log(`\n📊 RESUMEN DE SLOTS (primeros 10):`);
            console.log(`- Status 255 (Empty): ${status255Slots}`);
            console.log(`- Status 0 con datos vacíos: ${statusZeroSlots}`);
            console.log(`- Slots con datos reales: ${nonEmptySlots}`);
            
            // Conclusión
            console.log("\n🎯 CONCLUSIÓN SOBRE LA INICIALIZACIÓN:");
            
            if (isAdminSet && isNextOrderIdCorrect && isTradeFeeBillionthsCorrect) {
                console.log("✅ El contrato SÍ fue inicializado correctamente");
                
                if (status255Slots === 10) {
                    console.log("✅ Los slots están correctamente inicializados (status=255)");
                } else if (statusZeroSlots > 0) {
                    console.log("❓ PROBLEMA: Algunos slots tienen status=0 en lugar de 255");
                    console.log("   Esto puede indicar:");
                    console.log("   1. Bug en la inicialización");
                    console.log("   2. Órdenes fueron creadas y luego eliminadas");
                    console.log("   3. Problema en el parsing");
                }
            } else {
                console.log("❌ El contrato NO fue inicializado correctamente");
                console.log("   Campos faltantes:");
                if (!isAdminSet) console.log("   - Admin no configurado");
                if (!isNextOrderIdCorrect) console.log("   - NextOrderId incorrecto");
                if (!isTradeFeeBillionthsCorrect) console.log("   - Trade fee incorrecto");
            }
            
        } catch (error) {
            console.error("❌ Error:", error.message);
        }
    }

    // Funciones auxiliares de parsing
    parseId(bytes, offset) {
        const idBytes = bytes.slice(offset, offset + 32);
        return Buffer.from(idBytes).toString('base64').replace(/[+/]/g, match => match === '+' ? '-' : '_').replace(/=+$/, '');
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

    parseBridgeOrder(bytes, offset) {
        if (offset + 115 > bytes.length) return null;
        
        const qubicSenderBytes = bytes.slice(offset, offset + 32);
        const ethAddressBytes = bytes.slice(offset + 32, offset + 96);
        const orderId = this.readUint64LE(bytes, offset + 96);
        const amount = this.readUint64LE(bytes, offset + 104);
        const orderType = bytes[offset + 112];
        const status = bytes[offset + 113];
        const fromQubicToEthereum = bytes[offset + 114] !== 0;

        return {
            qubicSender: this.parseId(qubicSenderBytes, 0),
            ethAddress: this.ethAddressToString(ethAddressBytes),
            orderId: Number(orderId),
            amount: Number(amount),
            orderType,
            status,
            fromQubicToEthereum
        };
    }

    ethAddressToString(bytes) {
        // Convertir los primeros 20 bytes a dirección Ethereum
        const addressBytes = bytes.slice(0, 20);
        return '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Ejecutar el análisis
const checker = new ContractInitializationChecker();
checker.checkInitialization();
