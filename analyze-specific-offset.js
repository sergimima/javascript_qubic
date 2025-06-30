/**
 * ANÁLISIS ESPECÍFICO - Analizar la zona donde encontramos OrderID=1 y Amount=5000
 */

class SpecificOffsetAnalyzer {
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
     * Analizar zona específica alrededor del offset 544
     */
    async analyzeSpecificZone() {
        console.log('🎯 ANÁLISIS ESPECÍFICO - ZONA DEL ORDERID=1');
        console.log('============================================================');

        try {
            // Obtener datos del contrato
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
            
            if (response.status !== 200) {
                throw new Error(`Query failed: ${response.status}`);
            }
            
            const data = await response.json();
            const responseBytes = new Uint8Array(Buffer.from(data.responseData, 'base64'));
            
            console.log(`📊 Total bytes: ${responseBytes.length}`);
            
            // Analizar zona específica (offset 544 ± 50 bytes)
            const centerOffset = 544;
            const rangeStart = Math.max(0, centerOffset - 50);
            const rangeEnd = Math.min(responseBytes.length, centerOffset + 150);
            
            console.log(`\n🔍 ANALIZANDO ZONA ${rangeStart} - ${rangeEnd}:`);
            
            // Mostrar bytes en hex para debug
            console.log('\n📋 BYTES EN HEX:');
            for (let offset = rangeStart; offset < rangeEnd; offset += 16) {
                const hexLine = [];
                const asciiLine = [];
                
                for (let i = 0; i < 16 && offset + i < rangeEnd; i++) {
                    const byte = responseBytes[offset + i];
                    hexLine.push(byte.toString(16).padStart(2, '0'));
                    asciiLine.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
                }
                
                console.log(`${(offset).toString().padStart(4, '0')}: ${hexLine.join(' ').padEnd(47)} | ${asciiLine.join('')}`);
            }
            
            // Buscar posibles estructuras de orden
            console.log('\n🎯 BUSCANDO ESTRUCTURAS DE ORDEN:');
            
            for (let testOffset = rangeStart; testOffset <= rangeEnd - 115; testOffset++) {
                const orderId = this.readUint64LE(responseBytes, testOffset + 96);
                const amount = this.readUint64LE(responseBytes, testOffset + 104);
                const status = responseBytes[testOffset + 113];
                
                if (orderId === 1n || amount === 5000n) {
                    console.log(`\n✅ POSIBLE ORDEN EN OFFSET ${testOffset}:`);
                    
                    // Parsear orden completa
                    const qubicSenderBytes = responseBytes.slice(testOffset, testOffset + 32);
                    const ethAddressBytes = responseBytes.slice(testOffset + 32, testOffset + 96);
                    const orderType = responseBytes[testOffset + 112];
                    const fromQubicToEthereum = responseBytes[testOffset + 114] !== 0;
                    
                    console.log(`- QubicSender: ${this.bytesToQubicId(qubicSenderBytes)}`);
                    console.log(`- EthAddress: "${this.ethAddressToString(ethAddressBytes)}"`);
                    console.log(`- OrderID: ${orderId} (${orderId.toString()})`);
                    console.log(`- Amount: ${amount} (${amount.toString()})`);
                    console.log(`- OrderType: ${orderType}`);
                    console.log(`- Status: ${status}`);
                    console.log(`- FromQubicToEthereum: ${fromQubicToEthereum}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
}

// Ejecutar análisis
const analyzer = new SpecificOffsetAnalyzer();
analyzer.analyzeSpecificZone().catch(console.error);
