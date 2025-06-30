class OrderHunter {
    constructor() {
        // Sin dependencias externas
    }

    base64ToUint8Array(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
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
        return (bytes[offset] |
                (bytes[offset + 1] << 8) |
                (bytes[offset + 2] << 16) |
                (bytes[offset + 3] << 24)) >>> 0;
    }

    bytesToQubicId(bytes) {
        // Conversión simplificada para debug
        const nonZeroCount = bytes.filter(b => b !== 0).length;
        if (nonZeroCount === 0) return "NULL_ID";
        return `ID_${Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    }

    // Buscar patrones que indiquen una orden real
    searchForOrderPatterns(bytes) {
        console.log("🔍 BUSCANDO PATRONES DE ÓRDENES EN TODA LA RESPUESTA...");
        console.log("📊 Total bytes:", bytes.length);
        
        const patterns = [];
        
        // Buscar valores que podrían ser 5000 (amount de la orden)
        const target5000 = 5000n;
        for (let i = 0; i <= bytes.length - 8; i++) {
            const value = this.readUint64LE(bytes, i);
            if (value === target5000) {
                patterns.push({
                    type: 'AMOUNT_5000',
                    offset: i,
                    value: value,
                    context: this.getContext(bytes, i, 32)
                });
            }
        }

        // Buscar valores que podrían ser orderID = 1
        for (let i = 0; i <= bytes.length - 8; i++) {
            const value = this.readUint64LE(bytes, i);
            if (value === 1n) {
                patterns.push({
                    type: 'POSSIBLE_ORDER_ID_1',
                    offset: i,
                    value: value,
                    context: this.getContext(bytes, i, 32)
                });
            }
        }

        // Buscar secuencias no-cero que podrían ser direcciones ETH
        for (let i = 0; i <= bytes.length - 20; i++) {
            const slice = bytes.slice(i, i + 20);
            const nonZeroCount = slice.filter(b => b !== 0).length;
            if (nonZeroCount >= 10) { // Al menos 10 bytes no-cero
                patterns.push({
                    type: 'POSSIBLE_ETH_ADDRESS',
                    offset: i,
                    value: Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(''),
                    context: this.getContext(bytes, i, 32)
                });
            }
        }

        return patterns;
    }

    getContext(bytes, offset, contextSize = 32) {
        const start = Math.max(0, offset - contextSize/2);
        const end = Math.min(bytes.length, offset + contextSize/2);
        return {
            bytes: Array.from(bytes.slice(start, end)).map(b => b.toString(16).padStart(2, '0')).join(' '),
            start: start,
            end: end
        };
    }

    // Analizar cada patrón encontrado como posible orden
    analyzePattern(bytes, pattern) {
        console.log(`\n🔍 ANALIZANDO PATRÓN ${pattern.type} en offset ${pattern.offset}:`);
        
        if (pattern.type === 'AMOUNT_5000') {
            // Si encontramos 5000, buscar alrededor campos de orden
            const baseOffset = pattern.offset - 96; // Asumir que amount está al final de la estructura
            if (baseOffset >= 0) {
                console.log(`  📍 Probando estructura de orden en offset ${baseOffset}:`);
                this.tryParseOrderAt(bytes, baseOffset);
            }
        }
        
        if (pattern.type === 'POSSIBLE_ORDER_ID_1') {
            // Si encontramos ID=1, probar como inicio de orden
            console.log(`  📍 Probando orden con ID=1 en offset ${pattern.offset}:`);
            this.tryParseOrderAt(bytes, pattern.offset - 96); // ID podría estar al final
            this.tryParseOrderAt(bytes, pattern.offset); // O al principio
        }
    }

    tryParseOrderAt(bytes, offset) {
        if (offset < 0 || offset + 115 > bytes.length) {
            console.log(`    ❌ Offset ${offset} fuera de rango`);
            return null;
        }

        try {
            // Estructura esperada de BridgeOrder:
            // qubicSender (32 bytes) + ethAddress (64 bytes) + orderId (8) + amount (8) + orderType (1) + status (1) + direction (1)
            
            const qubicSenderBytes = bytes.slice(offset, offset + 32);
            const ethAddressBytes = bytes.slice(offset + 32, offset + 96);
            const orderId = this.readUint64LE(bytes, offset + 96);
            const amount = this.readUint64LE(bytes, offset + 104);
            const orderType = bytes[offset + 112];
            const status = bytes[offset + 113];
            const direction = bytes[offset + 114];

            // Calcular "score" de confianza
            let confidence = 0;
            
            // OrderID razonable (1-1000)
            if (orderId >= 1n && orderId <= 1000n) confidence += 30;
            
            // Amount razonable (1-1000000)
            if (amount >= 1n && amount <= 1000000n) confidence += 30;
            
            // Status válido (0-5)
            if (status <= 5) confidence += 20;
            
            // Direction válido (0-1)
            if (direction <= 1) confidence += 10;
            
            // Sender no todo ceros
            if (qubicSenderBytes.some(b => b !== 0)) confidence += 10;

            const result = {
                offset: offset,
                orderId: orderId,
                amount: amount,
                orderType: orderType,
                status: status,
                direction: direction,
                confidence: confidence,
                qubicSender: this.bytesToQubicId(qubicSenderBytes),
                ethAddress: Array.from(ethAddressBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join('')
            };

            console.log(`    📊 Offset ${offset}: OrderID=${orderId}, Amount=${amount}, Status=${status}, Confidence=${confidence}`);
            
            if (confidence >= 50) {
                console.log(`    ✅ ORDEN CANDIDATA ENCONTRADA!`);
                console.log(`       - Order ID: ${orderId}`);
                console.log(`       - Amount: ${amount} Qu`);
                console.log(`       - Status: ${status}`);
                console.log(`       - Sender: ${result.qubicSender}`);
                console.log(`       - ETH Address: 0x${result.ethAddress}`);
            }

            return result;
            
        } catch (error) {
            console.log(`    ❌ Error parseando en offset ${offset}: ${error.message}`);
            return null;
        }
    }

    async huntForOrder() {
        console.log("🎯 CAZANDO LA ORDEN PERDIDA...");
        console.log("============================================================");

        try {
            // Consultar el contrato usando la misma estructura que get-contract-info-fixed.js
            const queryRequest = {
                contractIndex: 13,
                inputType: 8,
                inputSize: 0,
                requestData: ''
            };
            
            const response = await fetch('http://185.84.224.100:8000/v1/querySmartContract', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryRequest)
            });

            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.responseData) {
                throw new Error('No response data from contract');
            }

            console.log("📡 Raw response keys:", Object.keys(data));
            const bytes = this.base64ToUint8Array(data.responseData);
            
            // Buscar patrones
            const patterns = this.searchForOrderPatterns(bytes);
            
            console.log(`\n📋 PATRONES ENCONTRADOS: ${patterns.length}`);
            
            // Analizar cada patrón
            const candidates = [];
            for (const pattern of patterns) {
                console.log(`\n🔍 Patrón ${pattern.type} en offset ${pattern.offset}:`);
                console.log(`   Valor: ${pattern.value}`);
                console.log(`   Context: ${pattern.context.bytes}`);
                
                this.analyzePattern(bytes, pattern);
            }

            // Buscar sistemáticamente en toda la respuesta
            console.log("\n🔍 BÚSQUEDA SISTEMÁTICA EN TODA LA RESPUESTA...");
            const allCandidates = [];
            
            for (let offset = 0; offset <= bytes.length - 115; offset += 8) {
                const candidate = this.tryParseOrderAt(bytes, offset);
                if (candidate && candidate.confidence >= 30) {
                    allCandidates.push(candidate);
                }
            }

            // Mostrar mejores candidatos
            allCandidates.sort((a, b) => b.confidence - a.confidence);
            
            console.log(`\n🏆 MEJORES CANDIDATOS (${allCandidates.length}):`);
            allCandidates.slice(0, 5).forEach((candidate, index) => {
                console.log(`\n${index + 1}. Offset ${candidate.offset} (Confidence: ${candidate.confidence})`);
                console.log(`   Order ID: ${candidate.orderId}`);
                console.log(`   Amount: ${candidate.amount} Qu`);
                console.log(`   Status: ${candidate.status}`);
                console.log(`   Sender: ${candidate.qubicSender}`);
                console.log(`   ETH: 0x${candidate.ethAddress}`);
            });

        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
}

// Ejecutar la búsqueda
const hunter = new OrderHunter();
hunter.huntForOrder();
