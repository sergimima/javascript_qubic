/**
 * Script para consultar órdenes específicas por ID
 * Usa la función getOrder del contrato VottunBridge
 */

class VottunBridgeOrderQuery {
    constructor() {
        this.rpcUrl = 'http://185.84.224.100:8000/v1';
        this.contractIndex = 13;
    }

    /**
     * Leer uint64 en little-endian
     */
    readUint64LE(bytes, offset) {
        let result = 0n;
        for (let i = 0; i < 8; i++) {
            result |= BigInt(bytes[offset + i]) << (BigInt(i) * 8n);
        }
        return result;
    }

    /**
     * Convertir bytes a Qubic ID
     */
    bytesToQubicId(bytes) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < bytes.length; i++) {
            result += chars[bytes[i] % 26];
        }
        return result;
    }

    /**
     * Convertir eth address bytes a string
     */
    ethAddressToString(bytes) {
        // Buscar el primer byte 0 para determinar la longitud real
        let length = 0;
        for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] === 0) break;
            length++;
        }
        
        if (length === 0) return '';
        
        // Convertir a string
        return Array.from(bytes.slice(0, length))
            .map(b => String.fromCharCode(b))
            .join('');
    }

    /**
     * Consultar orden específica por ID
     */
    async queryOrder(orderId) {
        console.log(`🔍 Consultando orden ID: ${orderId}`);
        
        try {
            // Preparar input para getOrder (función ID 1)
            const inputData = new Uint8Array(8);
            const view = new DataView(inputData.buffer);
            view.setBigUint64(0, BigInt(orderId), true); // little-endian

            const queryRequest = {
                contractIndex: this.contractIndex,
                inputType: 1, // getOrder function
                inputSize: 8,
                requestData: Buffer.from(inputData).toString('base64')
            };

            console.log('📡 Enviando consulta...');
            const response = await fetch(`${this.rpcUrl}/querySmartContract`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryRequest)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`📊 Response status: ${response.status}`);

            if (!result.responseData || result.responseData.length === 0) {
                console.log(`❌ Orden ${orderId}: Sin datos de respuesta`);
                return null;
            }

            // Convertir respuesta a bytes
            const responseBytes = new Uint8Array(result.responseData);
            console.log(`📊 Total bytes: ${responseBytes.length}`);

            // Parsear respuesta getOrder
            // Estructura: uint8 status + OrderResponse (si status = 0)
            const status = responseBytes[0];
            console.log(`📋 Status: ${status}`);

            if (status !== 0) {
                console.log(`❌ Orden ${orderId}: Error status ${status}`);
                return { orderId, found: false, status };
            }

            // Parsear OrderResponse (offset 1)
            // struct OrderResponse: id originAccount (32) + Array<uint8, 64> destinationAccount (64) + 
            //                      uint64 orderId (8) + uint64 amount (8) + Array<uint8, 64> memo (64) + uint32 sourceChain (4)
            const originAccountBytes = responseBytes.slice(1, 33);
            const destinationAccountBytes = responseBytes.slice(33, 97);
            const orderIdBytes = this.readUint64LE(responseBytes, 97);
            const amountBytes = this.readUint64LE(responseBytes, 105);
            const memoBytes = responseBytes.slice(113, 177);
            const sourceChain = new DataView(responseBytes.buffer).getUint32(177, true);

            const order = {
                orderId: Number(orderIdBytes),
                originAccount: this.bytesToQubicId(originAccountBytes),
                destinationAccount: this.ethAddressToString(destinationAccountBytes),
                amount: Number(amountBytes),
                memo: this.ethAddressToString(memoBytes),
                sourceChain,
                found: true,
                status: 0
            };

            console.log(`✅ Orden ${orderId} encontrada:`, order);
            return order;

        } catch (error) {
            console.error(`❌ Error consultando orden ${orderId}:`, error.message);
            return { orderId, found: false, error: error.message };
        }
    }

    /**
     * Consultar múltiples órdenes
     */
    async queryMultipleOrders(orderIds) {
        console.log(`🔍 CONSULTANDO ÓRDENES ESPECÍFICAS`);
        console.log(`Contract Index: ${this.contractIndex}`);
        console.log('============================================================');

        const results = [];
        for (const orderId of orderIds) {
            const result = await this.queryOrder(orderId);
            results.push(result);
            console.log(''); // Línea en blanco entre consultas
        }

        return results;
    }
}

// Test: Consultar órdenes del 1 al 10
async function testOrderQuery() {
    const client = new VottunBridgeOrderQuery();
    
    // Consultar órdenes 1-10 para ver si alguna existe
    const orderIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = await client.queryMultipleOrders(orderIds);
    
    console.log('\n🎯 RESUMEN DE RESULTADOS:');
    console.log('============================================================');
    
    const foundOrders = results.filter(r => r && r.found);
    const notFoundOrders = results.filter(r => r && !r.found);
    
    console.log(`✅ Órdenes encontradas: ${foundOrders.length}`);
    console.log(`❌ Órdenes no encontradas: ${notFoundOrders.length}`);
    
    if (foundOrders.length > 0) {
        console.log('\n📋 ÓRDENES ENCONTRADAS:');
        foundOrders.forEach(order => {
            console.log(`- ID ${order.orderId}: ${order.amount} Qu -> ${order.destinationAccount}`);
        });
    }
    
    if (foundOrders.length === 0) {
        console.log('\n❌ CONCLUSIÓN: No se encontraron órdenes válidas');
        console.log('   Esto confirma que nextOrderId=1 es correcto (no hay órdenes creadas)');
    } else {
        console.log('\n✅ CONCLUSIÓN: Se encontraron órdenes válidas');
        console.log('   Hay un problema con getContractInfo o el parsing');
    }
}

// Ejecutar test
testOrderQuery().catch(console.error);
