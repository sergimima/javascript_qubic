/**
 * ANÁLISIS PROFUNDO - Buscar órdenes en TODA la respuesta
 * Si hay una orden, la vamos a encontrar!
 */

class DeepOrderScanner {
    constructor() {
        this.rpcUrl = 'http://185.84.224.100:8000/v1';
        this.contractIndex = 13;
    }

    /**
     * Leer uint64 en little-endian
     */
    readUint64LE(bytes, offset) {
        if (offset + 8 > bytes.length) return 0n;
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
     * Buscar patrones de órdenes válidas en toda la respuesta
     */
    scanForOrders(responseBytes) {
        console.log(`🔍 ESCANEANDO ${responseBytes.length} BYTES BUSCANDO ÓRDENES...`);
        
        const foundOrders = [];
        
        // Escanear cada posición posible para una orden
        for (let offset = 0; offset <= responseBytes.length - 115; offset++) {
            try {
                // Intentar parsear como BridgeOrder en esta posición
                const order = this.tryParseOrderAt(responseBytes, offset);
                
                if (order && this.isValidOrder(order)) {
                    console.log(`✅ ORDEN ENCONTRADA EN OFFSET ${offset}:`, order);
                    foundOrders.push({ offset, order });
                }
            } catch (e) {
                // Ignorar errores de parsing
            }
        }
        
        return foundOrders;
    }

    /**
     * Intentar parsear una orden en un offset específico
     */
    tryParseOrderAt(bytes, offset) {
        if (offset + 115 > bytes.length) return null;
        
        // Parsear BridgeOrder (115 bytes)
        const qubicSenderBytes = bytes.slice(offset, offset + 32);
        const ethAddressBytes = bytes.slice(offset + 32, offset + 96);
        const orderId = this.readUint64LE(bytes, offset + 96);
        const amount = this.readUint64LE(bytes, offset + 104);
        const orderType = bytes[offset + 112];
        const status = bytes[offset + 113];
        const fromQubicToEthereum = bytes[offset + 114] !== 0;
        
        return {
            qubicSender: this.bytesToQubicId(qubicSenderBytes),
            ethAddress: this.ethAddressToString(ethAddressBytes),
            orderId: Number(orderId),
            amount: Number(amount),
            orderType,
            status,
            fromQubicToEthereum,
            // Debug info
            _debug: {
                orderIdBigInt: orderId.toString(),
                amountBigInt: amount.toString()
            }
        };
    }

    /**
     * Verificar si una orden parece válida
     */
    isValidOrder(order) {
        return (
            order.orderId > 0 &&           // ID válido
            order.orderId <= 100 &&        // OrderID realista (no gigante)
            order.amount > 0 &&            // Amount válido
            order.amount <= 1000000 &&     // Amount realista
            order.status !== 255 &&        // No es slot vacío
            order.status <= 10             // Status razonable
        );
    }

    /**
     * Convertir eth address bytes a string
     */
    ethAddressToString(bytes) {
        let length = 0;
        for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] === 0) break;
            length++;
        }
        
        if (length === 0) return '';
        
        return Array.from(bytes.slice(0, length))
            .map(b => String.fromCharCode(b))
            .join('');
    }

    /**
     * Buscar valores específicos que podrían ser orderIds
     */
    scanForOrderIds(responseBytes) {
        console.log(`\n🔍 BUSCANDO POSIBLES ORDER IDs...`);
        
        const possibleOrderIds = [];
        
        for (let offset = 0; offset <= responseBytes.length - 8; offset++) {
            const value = this.readUint64LE(responseBytes, offset);
            
            // Buscar valores que podrían ser orderIds (1-1000)
            if (value > 0n && value <= 1000n) {
                console.log(`📋 Posible OrderID ${value} en offset ${offset}`);
                possibleOrderIds.push({ offset, value: Number(value) });
            }
        }
        
        return possibleOrderIds;
    }

    /**
     * Buscar valores que podrían ser amounts (5000 Qu)
     */
    scanForAmounts(responseBytes) {
        console.log(`\n🔍 BUSCANDO AMOUNTS DE 5000 Qu...`);
        
        const possibleAmounts = [];
        
        for (let offset = 0; offset <= responseBytes.length - 8; offset++) {
            const value = this.readUint64LE(responseBytes, offset);
            
            // Buscar 5000 Qu específicamente
            if (value === 5000n) {
                console.log(`💰 Amount de 5000 Qu encontrado en offset ${offset}`);
                possibleAmounts.push({ offset, value: Number(value) });
                
                // Verificar si hay un orderId cerca
                for (let nearOffset = Math.max(0, offset - 20); nearOffset <= Math.min(responseBytes.length - 8, offset + 20); nearOffset += 8) {
                    const nearValue = this.readUint64LE(responseBytes, nearOffset);
                    if (nearValue > 0n && nearValue <= 100n) {
                        console.log(`   📋 Posible OrderID ${nearValue} cerca en offset ${nearOffset}`);
                    }
                }
            }
        }
        
        return possibleAmounts;
    }

    /**
     * Análisis completo
     */
    async performDeepScan() {
        console.log(`🔍 ANÁLISIS PROFUNDO DEL CONTRATO VOTTUNBRIDGE`);
        console.log(`Contract Index: ${this.contractIndex}`);
        console.log('============================================================');

        try {
            // Usar exactamente el mismo código que funciona en get-contract-info-fixed.js
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
            
            console.log('🔍 DEBUG - Respuesta completa:', JSON.stringify(data, null, 2));
            console.log('🔍 DEBUG - responseData existe:', !!data.responseData);
            console.log('🔍 DEBUG - responseData length:', data.responseData ? data.responseData.length : 'undefined');
            
            if (!data.responseData || data.responseData.length === 0) {
                console.log('❌ Sin responseData del contrato');
                return;
            }
            
            // Decodificar desde base64
            const responseBytes = new Uint8Array(Buffer.from(data.responseData, 'base64'));
            
            console.log(`📊 Total bytes recibidos: ${responseBytes.length}`);
            
            // 1. Buscar órdenes válidas en toda la respuesta
            console.log('\n🎯 PASO 1: BUSCAR ÓRDENES VÁLIDAS');
            const foundOrders = this.scanForOrders(responseBytes);
            
            // 2. Buscar posibles OrderIDs
            console.log('\n🎯 PASO 2: BUSCAR POSIBLES ORDER IDs');
            const possibleOrderIds = this.scanForOrderIds(responseBytes);
            
            // 3. Buscar amounts de 5000
            console.log('\n🎯 PASO 3: BUSCAR AMOUNTS DE 5000 Qu');
            const possibleAmounts = this.scanForAmounts(responseBytes);
            
            // 4. Resumen
            console.log('\n🎯 RESUMEN DEL ANÁLISIS PROFUNDO:');
            console.log('============================================================');
            console.log(`✅ Órdenes válidas encontradas: ${foundOrders.length}`);
            console.log(`📋 Posibles OrderIDs encontrados: ${possibleOrderIds.length}`);
            console.log(`💰 Amounts de 5000 Qu encontrados: ${possibleAmounts.length}`);
            
            if (foundOrders.length > 0) {
                console.log('\n🎉 ¡ÓRDENES ENCONTRADAS!');
                foundOrders.forEach((item, index) => {
                    console.log(`\nOrden ${index + 1} (offset ${item.offset}):`);
                    console.log(`- OrderID: ${item.order.orderId}`);
                    console.log(`- Amount: ${item.order.amount} Qu`);
                    console.log(`- Status: ${item.order.status}`);
                    console.log(`- QubicSender: ${item.order.qubicSender.substring(0, 20)}...`);
                    console.log(`- EthAddress: ${item.order.ethAddress}`);
                });
            } else {
                console.log('\n❌ No se encontraron órdenes válidas en ninguna posición');
                
                if (possibleOrderIds.length > 0 || possibleAmounts.length > 0) {
                    console.log('\n🔍 PERO se encontraron datos sospechosos:');
                    possibleOrderIds.forEach(item => {
                        console.log(`- Posible OrderID ${item.value} en offset ${item.offset}`);
                    });
                    possibleAmounts.forEach(item => {
                        console.log(`- Amount 5000 Qu en offset ${item.offset}`);
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ Error en análisis profundo:', error.message);
        }
    }
}

// Ejecutar análisis profundo
const scanner = new DeepOrderScanner();
scanner.performDeepScan().catch(console.error);
