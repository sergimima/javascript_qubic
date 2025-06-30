const fetch = require('node-fetch');

class CompletedOrderFinder {
    constructor() {
        this.rpcUrl = 'http://185.84.224.100:8000/v1';
        this.contractIndex = 13;
    }

    async findCompletedOrder() {
        try {
            console.log("🔍 BUSCANDO ORDEN COMPLETADA (STATUS=1)");
            console.log("============================================================");
            
            // Buscar orden con ID 1 (la única que debería existir)
            console.log("🎯 Buscando orden ID 1...");
            
            const order = await this.getOrderDetailed(1);
            
            if (order) {
                console.log("✅ ¡ORDEN ENCONTRADA!");
                console.log(`📊 Status: ${order.status}`);
                
                if (order.status === 0) {
                    console.log("✅ Orden ACTIVA (Created)");
                    console.log(`   - Origin: ${order.order.originAccount.substring(0, 20)}...`);
                    console.log(`   - Amount: ${order.order.amount} Qu`);
                    console.log(`   - OrderID: ${order.order.orderId}`);
                    console.log(`   - Source Chain: ${order.order.sourceChain}`);
                } else if (order.status === 1) {
                    console.log("🎉 ¡ORDEN COMPLETADA!");
                    console.log("   Esta es tu orden de 5000 Qu que ya fue procesada");
                } else {
                    console.log(`❓ Status desconocido: ${order.status}`);
                }
            } else {
                console.log("❌ No se pudo obtener la orden");
            }
            
            // También verificar si hay órdenes completadas en firstOrders
            console.log("\n🔍 Verificando órdenes completadas en firstOrders...");
            const contractInfo = await this.getContractInfoDetailed();
            
            let completedFound = 0;
            let activeFound = 0;
            
            for (let i = 0; i < 16; i++) {
                const order = contractInfo.firstOrders[i];
                if (order.status === 1) { // Completed
                    completedFound++;
                    console.log(`✅ Orden completada en slot ${i}:`);
                    console.log(`   - OrderID: ${order.orderId}`);
                    console.log(`   - Amount: ${order.amount} Qu`);
                    console.log(`   - Origin: ${order.qubicSender.substring(0, 20)}...`);
                } else if (order.status === 0 && order.orderId > 0) { // Active
                    activeFound++;
                    console.log(`🔄 Orden activa en slot ${i}:`);
                    console.log(`   - OrderID: ${order.orderId}`);
                    console.log(`   - Amount: ${order.amount} Qu`);
                }
            }
            
            console.log(`\n📊 RESUMEN:`);
            console.log(`- Órdenes completadas: ${completedFound}`);
            console.log(`- Órdenes activas: ${activeFound}`);
            
            if (completedFound > 0) {
                console.log("\n🎯 ¡ENCONTRADA LA EXPLICACIÓN!");
                console.log("Tu orden de 5000 Qu fue creada y luego COMPLETADA.");
                console.log("Por eso tienes los tokens pero no ves la orden activa.");
            } else if (activeFound > 0) {
                console.log("\n🎯 ¡ENCONTRADA LA ORDEN ACTIVA!");
                console.log("Tu orden existe y está esperando ser procesada.");
            } else {
                console.log("\n❌ Algo está muy mal...");
                console.log("Tienes tokens pero no hay rastro de órdenes.");
            }
            
        } catch (error) {
            console.error("❌ Error:", error.message);
        }
    }

    async getOrderDetailed(orderId) {
        try {
            const inputBuffer = Buffer.alloc(8);
            inputBuffer.writeBigUInt64LE(BigInt(orderId), 0);
            const requestData = inputBuffer.toString('base64');

            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 1,
                inputSize: 8,
                requestData: requestData
            };

            console.log(`📡 Consultando orden ${orderId}...`);
            const response = await fetch(`${this.rpcUrl}/querySmartContract`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryRequest)
            });

            const data = await response.json();
            console.log(`📊 Response data length: ${data.responseData ? data.responseData.length : 'null'}`);
            
            if (!data.responseData) {
                console.log("❌ No response data");
                return null;
            }

            const responseBytes = new Uint8Array(Buffer.from(data.responseData, 'base64'));
            console.log(`📊 Response bytes length: ${responseBytes.length}`);
            
            // Debug: mostrar primeros bytes
            console.log(`🔍 Primeros 10 bytes: ${Array.from(responseBytes.slice(0, 10)).join(', ')}`);
            
            const status = responseBytes[0];
            console.log(`📊 Status byte: ${status}`);
            
            if (status === 0) { // Success
                const originAccount = this.parseId(responseBytes, 1);
                const destinationAccount = this.parseEthAddress(responseBytes, 33);
                const orderIdResponse = this.readUint64LE(responseBytes, 97);
                const amount = this.readUint64LE(responseBytes, 105);
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
                console.log(`❌ Status no exitoso: ${status}`);
                return { status: status };
            }
        } catch (error) {
            console.error(`❌ Error consultando orden ${orderId}:`, error.message);
            return null;
        }
    }

    async getContractInfoDetailed() {
        const queryRequest = {
            contractIndex: this.contractIndex,
            inputType: 8,
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

        const data = await response.json();
        const responseBytes = new Uint8Array(Buffer.from(data.responseData, 'base64'));
        
        // Parsear firstOrders
        const firstOrdersOffset = 584;
        const orderSize = 115;
        const firstOrders = [];
        
        for (let i = 0; i < 16; i++) {
            const slotOffset = firstOrdersOffset + (i * orderSize);
            const order = this.parseBridgeOrder(responseBytes, slotOffset);
            firstOrders.push(order);
        }
        
        return { firstOrders };
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

    // Funciones auxiliares
    parseId(bytes, offset) {
        const idBytes = bytes.slice(offset, offset + 32);
        return Buffer.from(idBytes).toString('base64').replace(/[+/]/g, match => match === '+' ? '-' : '_').replace(/=+$/, '');
    }

    parseEthAddress(bytes, offset) {
        const addressBytes = bytes.slice(offset, offset + 20);
        return '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    ethAddressToString(bytes) {
        const addressBytes = bytes.slice(0, 20);
        return '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
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
}

// Ejecutar la búsqueda
const finder = new CompletedOrderFinder();
finder.findCompletedOrder();
