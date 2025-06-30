// Usar fetch para las consultas

class FirstOrderSlotAnalyzer {
    async analyzeFirstOrderSlot() {
        console.log("🎯 ANÁLISIS DEL PRIMER SLOT DE ÓRDENES");
        console.log("============================================================");
        
        try {
            const responseData = await this.queryContract();
            
            if (!responseData || responseData.length === 0) {
                console.log('❌ Sin responseData del contrato');
                return;
            }
            
            // Decodificar desde base64 usando Buffer
            const responseBytes = new Uint8Array(Buffer.from(responseData, 'base64'));
            
            console.log("📊 Total bytes:", responseBytes.length);
            
            // El array firstOrders empieza en offset 584
            const firstOrdersOffset = 584;
            const orderSize = 115;
            const maxOrders = 16; // El array tiene 16 slots
            
            console.log("\n🔍 ANALIZANDO TODOS LOS SLOTS DEL ARRAY FIRSTORDERS:");
            console.log(`- Offset inicial: ${firstOrdersOffset}`);
            console.log(`- Tamaño por orden: ${orderSize} bytes`);
            console.log(`- Máximo órdenes: ${maxOrders}`);
            
            let foundValidOrders = [];
            
            // Analizar cada slot del array
            for (let slotIndex = 0; slotIndex < maxOrders; slotIndex++) {
                const slotOffset = firstOrdersOffset + (slotIndex * orderSize);
                
                console.log(`\n📋 SLOT ${slotIndex} (offset ${slotOffset}-${slotOffset + orderSize - 1}):`);
                
                // Parsear la orden en este slot
                const order = this.parseBridgeOrder(responseBytes, slotOffset);
                
                console.log(`- OrderID: ${order.orderId}`);
                console.log(`- Amount: ${order.amount} Qu`);
                console.log(`- Status: ${order.status} ${this.getStatusName(order.status)}`);
                console.log(`- QubicSender: ${order.qubicSender.substring(0, 20)}...`);
                console.log(`- EthAddress: ${order.ethAddress}`);
                
                // Verificar si es una orden válida (cualquier status excepto 255)
                if (order.status === 255) {
                    console.log(`❌ Slot ${slotIndex} vacío`);
                } else if (order.orderId > 0 && order.amount > 0) {
                    const statusName = this.getStatusName(order.status);
                    console.log(`✅ ¡ORDEN ENCONTRADA EN SLOT ${slotIndex}! Status: ${statusName}`);
                    foundValidOrders.push({ slotIndex, order });
                } else if (order.orderId > 0 || order.amount > 0 || order.status !== 0) {
                    console.log(`❓ Slot ${slotIndex} con datos parciales`);
                    foundValidOrders.push({ slotIndex, order, suspicious: true });
                } else {
                    console.log(`⚪ Slot ${slotIndex} inicializado pero vacío`);
                }
            }
            
            console.log("\n🎯 RESUMEN DEL ANÁLISIS:");
            console.log(`- Slots analizados: ${maxOrders}`);
            console.log(`- Órdenes válidas encontradas: ${foundValidOrders.filter(o => !o.suspicious).length}`);
            console.log(`- Slots con datos sospechosos: ${foundValidOrders.filter(o => o.suspicious).length}`);
            
            if (foundValidOrders.length > 0) {
                console.log("\n🎉 ÓRDENES ENCONTRADAS:");
                foundValidOrders.forEach(({ slotIndex, order, suspicious }) => {
                    console.log(`${suspicious ? '❓' : '✅'} Slot ${slotIndex}: OrderID=${order.orderId}, Amount=${order.amount} Qu, Status=${order.status}`);
                });
            } else {
                console.log("\n❌ No se encontraron órdenes válidas en ningún slot");
                console.log("\n🤔 PERO sabemos que:");
                console.log(`- nextOrderId = 1 (se creó al menos una orden)`);
                console.log(`- totalReceivedTokens = 5000 Qu (el contrato recibió tokens)`);
                console.log(`- La orden debe estar en algún lugar...`);
            }
            
        } catch (error) {
            console.error("❌ Error:", error.message);
        }
    }
    
    async queryContract() {
        console.log("📡 Sending query...");
        
        const queryRequest = {
            contractIndex: 13,
            inputType: 8, // getContractInfo function ID
            inputSize: 0,
            requestData: ""
        };
        
        const response = await fetch('http://185.84.224.100:8000/v1/querySmartContract', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(queryRequest)
        });
        
        console.log("📊 Response status:", response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("🔍 DEBUG - Respuesta completa:", JSON.stringify(data, null, 2).substring(0, 300) + "...");
        console.log("🔍 DEBUG - responseData existe:", !!data.responseData);
        console.log("🔍 DEBUG - responseData length:", data.responseData ? data.responseData.length : 0);
        
        return data.responseData;
    }
    
    parseBridgeOrder(bytes, offset) {
        // id qubicSender (32 bytes)
        const qubicSenderBytes = bytes.slice(offset, offset + 32);
        const qubicSender = this.bytesToQubicId(qubicSenderBytes);
        
        // Array<uint8, 64> ethAddress (64 bytes)
        const ethAddressBytes = bytes.slice(offset + 32, offset + 96);
        const ethAddress = this.ethAddressToString(ethAddressBytes);
        
        // uint64 orderId (8 bytes)
        const orderId = this.readUint64LE(bytes, offset + 96);
        
        // uint64 amount (8 bytes)
        const amount = this.readUint64LE(bytes, offset + 104);
        
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
    
    // Ya no necesitamos este método, usamos Buffer.from directamente
    
    readUint64LE(bytes, offset) {
        let value = 0n;
        for (let i = 0; i < 8; i++) {
            value += BigInt(bytes[offset + i]) << (BigInt(i) * 8n);
        }
        return Number(value);
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
}

// Ejecutar análisis
async function runAnalysis() {
    const analyzer = new FirstOrderSlotAnalyzer();
    await analyzer.analyzeFirstOrderSlot();
}

if (require.main === module) {
    runAnalysis();
}

module.exports = { FirstOrderSlotAnalyzer };
