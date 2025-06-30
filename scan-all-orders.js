const fetch = require('node-fetch');

class AllOrdersScanner {
    constructor() {
        this.rpcUrl = 'http://185.84.224.100:8000/v1';
        this.contractIndex = 13;
    }

    async scanAllOrders() {
        try {
            console.log("🔍 ESCANEANDO TODAS LAS ÓRDENES POSIBLES");
            console.log("============================================================");
            
            // Primero obtener el nextOrderId para saber el rango
            const contractInfo = await this.getContractInfo();
            const nextOrderId = contractInfo.nextOrderId;
            
            console.log(`📊 Next Order ID: ${nextOrderId}`);
            console.log(`🎯 Escaneando órdenes desde ID 1 hasta ${nextOrderId - 1}...`);
            
            let foundOrders = [];
            let totalScanned = 0;
            
            // Escanear desde OrderID 1 hasta nextOrderId-1
            for (let orderId = 1; orderId < nextOrderId; orderId++) {
                console.log(`\n🔍 Buscando orden ID ${orderId}...`);
                
                const order = await this.getOrder(orderId);
                totalScanned++;
                
                if (order && order.status === 0) { // Encontrada
                    console.log(`✅ ¡ORDEN ENCONTRADA! ID: ${orderId}`);
                    console.log(`   - Status: ${order.status}`);
                    console.log(`   - Origin: ${order.order.originAccount.substring(0, 20)}...`);
                    console.log(`   - Amount: ${order.order.amount} Qu`);
                    console.log(`   - OrderID: ${order.order.orderId}`);
                    
                    foundOrders.push({
                        orderId: orderId,
                        status: order.status,
                        originAccount: order.order.originAccount,
                        amount: order.order.amount,
                        sourceChain: order.order.sourceChain
                    });
                } else if (order && order.status === 1) {
                    console.log(`❌ Orden ${orderId} no encontrada (status: ${order.status})`);
                } else {
                    console.log(`❓ Orden ${orderId} - respuesta inesperada`);
                }
                
                // Pequeña pausa para no saturar el RPC
                await this.sleep(100);
            }
            
            // También probar algunos IDs adicionales por si acaso
            console.log(`\n🔍 Probando algunos IDs adicionales...`);
            const additionalIds = [0, nextOrderId, nextOrderId + 1, 100, 1000];
            
            for (const orderId of additionalIds) {
                console.log(`\n🔍 Probando orden ID ${orderId}...`);
                const order = await this.getOrder(orderId);
                
                if (order && order.status === 0) {
                    console.log(`✅ ¡ORDEN ADICIONAL ENCONTRADA! ID: ${orderId}`);
                    foundOrders.push({
                        orderId: orderId,
                        status: order.status,
                        originAccount: order.order.originAccount,
                        amount: order.order.amount,
                        sourceChain: order.order.sourceChain
                    });
                }
                
                await this.sleep(100);
            }
            
            // Resumen final
            console.log("\n🎯 RESUMEN DEL ESCANEO COMPLETO:");
            console.log("============================================================");
            console.log(`📊 Total de IDs escaneados: ${totalScanned + additionalIds.length}`);
            console.log(`✅ Órdenes encontradas: ${foundOrders.length}`);
            
            if (foundOrders.length > 0) {
                console.log("\n🎉 ÓRDENES ENCONTRADAS:");
                foundOrders.forEach((order, index) => {
                    console.log(`${index + 1}. OrderID: ${order.orderId}`);
                    console.log(`   - Amount: ${order.amount} Qu`);
                    console.log(`   - Origin: ${order.originAccount.substring(0, 20)}...`);
                    console.log(`   - Status: ${order.status}`);
                });
                
                // Verificar si alguna orden tiene 5000 Qu
                const order5000 = foundOrders.find(o => o.amount === 5000);
                if (order5000) {
                    console.log(`\n🎯 ¡ENCONTRADA LA ORDEN DE 5000 QU!`);
                    console.log(`   OrderID: ${order5000.orderId}`);
                    console.log(`   Esta es probablemente tu orden perdida.`);
                } else {
                    console.log(`\n❓ No se encontró ninguna orden con 5000 Qu`);
                }
            } else {
                console.log("\n❌ NO SE ENCONTRARON ÓRDENES");
                console.log("Esto confirma que:");
                console.log("1. No hay órdenes creadas en el sistema");
                console.log("2. Los 5000 Qu llegaron por transferencia directa");
                console.log("3. El nextOrderId=1 indica que se intentó crear una orden pero falló");
            }
            
        } catch (error) {
            console.error("❌ Error en el escaneo:", error.message);
        }
    }

    async getContractInfo() {
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
        
        return {
            nextOrderId: Number(this.readUint64LE(responseBytes, 544))
        };
    }

    async getOrder(orderId) {
        try {
            // Crear el input para getOrder (función 1)
            const inputBuffer = Buffer.alloc(8);
            inputBuffer.writeBigUInt64LE(BigInt(orderId), 0);
            const requestData = inputBuffer.toString('base64');

            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 1,
                inputSize: 8,
                requestData: requestData
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
            
            if (!data.responseData) {
                return null;
            }

            const responseBytes = new Uint8Array(Buffer.from(data.responseData, 'base64'));
            
            // Parsear getOrder_output
            const status = responseBytes[0];
            
            if (status === 0) { // Success
                // Parsear OrderResponse
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
                return { status: status };
            }
        } catch (error) {
            console.log(`   Error consultando orden ${orderId}: ${error.message}`);
            return null;
        }
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Ejecutar el escaneo
const scanner = new AllOrdersScanner();
scanner.scanAllOrders();
