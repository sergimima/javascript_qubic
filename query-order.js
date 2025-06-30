// Importar fetch
const fetch = require('node-fetch').default;

class VottunBridgeQuery {
    constructor(rpcUrl = "http://185.84.224.100:8000/api") {
        this.rpcUrl = rpcUrl;
        console.log(`🔌 Conectado al nodo RPC: ${rpcUrl}`);
    }

    // Método para consultar una orden por sus detalles
    async getOrderByDetails(ethAddress, amount, status = 0) {
        console.log("🔍 Querying order by details...");
        console.log("- ETH Address:", ethAddress);
        console.log("- Amount:", amount);
        console.log("- Status:", status);
        
        // Crear el payload para la consulta
        const cleanAddress = ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress;
        const addressBytes = new Uint8Array(64);
        
        // Rellenar la dirección ETH (42 caracteres = 21 bytes)
        for (let i = 0; i < cleanAddress.length && i < 40; i += 2) {
            const hexByte = cleanAddress.substr(i, 2);
            addressBytes[i / 2] = parseInt(hexByte, 16);
        }
        
        // Crear el payload según la estructura del contrato
        // Usamos strings para los BigInt para evitar problemas de serialización
        const payload = {
            ethAddress: Array.from(addressBytes),
            amount: amount.toString(), // Convertir a string
            status: status
        };
        
        try {
            // Construir una consulta simple a la raíz para probar la conexión
            const requestData = {
                method: 'GET',
                path: '/'
            };
            
            console.log("🔍 Probando conexión con el nodo...");
            
            console.log("📤 Sending query to node...");
            console.log("Payload:", JSON.stringify(requestData, null, 2));
            
            // Construir la URL completa con el path si es necesario
            const url = requestData.path 
                ? `${this.rpcUrl}${requestData.path}` 
                : this.rpcUrl;
                
            console.log(`🌐 URL de la petición: ${url}`);
            
            // Enviar la consulta al nodo
            const response = await fetch(url, {
                method: requestData.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                // Solo incluir el body si es una petición POST/PUT
                ...(requestData.method === 'POST' || requestData.method === 'PUT' ? {
                    body: JSON.stringify(requestData.body || {}, (key, value) => 
                        typeof value === 'bigint' ? value.toString() : value
                    )
                } : {})
            });
            
            console.log(`📡 Estado de la respuesta: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No se pudo leer el mensaje de error');
                console.error('📜 Contenido del error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            let result;
            try {
                result = await response.json();
                console.log("✅ Respuesta del nodo recibida");
                
                // Intentar extraer el resultado de diferentes formatos de respuesta
                const responseData = result.result || result;
                
                if (responseData) {
                    return {
                        success: true,
                        status: responseData.status ?? 0,
                        orderId: responseData.orderId ? responseData.orderId.toString() : null,
                        message: responseData.message || 'Consulta exitosa',
                        raw: result
                    };
                }
                
                return {
                    success: false,
                    error: 'La respuesta no contiene datos válidos',
                    raw: result
                };
                
            } catch (parseError) {
                console.error("❌ Error al procesar la respuesta:", parseError);
                // Si falla el parseo, devolver la respuesta como texto
                const textResponse = await response.text();
                return {
                    success: false,
                    error: 'Error al procesar la respuesta JSON',
                    raw: textResponse
                };
            }
            
        } catch (error) {
            console.error("❌ Error en la consulta:");
            console.error("- Mensaje:", error.message);
            
            if (error.response) {
                console.error("- Estado HTTP:", error.response.status);
                console.error("- Datos:", error.response.data);
                return {
                    success: false,
                    error: `Error HTTP ${error.response.status}: ${error.message}`,
                    statusCode: error.response.status,
                    data: error.response.data,
                    raw: error
                };
            }
            
            return {
                success: false,
                error: error.message || 'Error desconocido al consultar la orden',
                raw: error
            };
        }
    }
}

// Función para formatear la dirección ETH
function formatEthAddress(address) {
    if (!address) return 'N/A';
    const addr = address.startsWith('0x') ? address : `0x${address}`;
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
}

// Función para formatear el monto
function formatAmount(amount) {
    if (amount === undefined || amount === null) return 'N/A';
    return `${Number(amount).toLocaleString()} Qu`;
}

// Función para formatear el estado de la orden
function formatStatus(status) {
    const statuses = {
        0: '🟢 Encontrada',
        1: '🔴 No encontrada',
        2: '⚠️ Error en parámetros',
        255: '❓ Desconocido'
    };
    return statuses[status] || `⚠️ Código ${status}`;
}

// Función de prueba
async function testQuery() {
    console.log("🔍 Consulta de Órdenes VottunBridge");
    console.log("==================================");
    
    // Parámetros de ejemplo (usar los mismos que en la transacción)
    const testCases = [
        {
            ethAddress: "0x090378a9c80c5E1Ced85e56B2128c1e514E75357",
            amount: 5120,
            description: "Transacción reciente"
        },
        {
            ethAddress: "0x0000000000000000000000000000000000000000",
            amount: 0,
            description: "Caso de prueba con dirección cero"
        }
    ];
    
    const query = new VottunBridgeQuery();
    
    for (const testCase of testCases) {
        console.log("\n" + "═".repeat(80));
        console.log(`🔍 Caso de prueba: ${testCase.description}`);
        console.log("-".repeat(40));
        
        try {
            console.log("📋 Parámetros de búsqueda:");
            console.log(`- Dirección ETH: ${formatEthAddress(testCase.ethAddress)}`);
            console.log(`- Monto: ${formatAmount(testCase.amount)}`);
            
            console.log("\n🔄 Consultando nodo...");
            const result = await query.getOrderByDetails(testCase.ethAddress, testCase.amount);
            
            console.log("\n📊 Resultado:");
            if (result.success) {
                console.log(`✅ ${result.message || 'Consulta exitosa'}`);
                console.log(`- Estado: ${formatStatus(result.status)}`);
                
                if (result.orderId) {
                    console.log(`- ID de Orden: ${result.orderId}`);
                }
                
                if (result.raw) {
                    console.log("\n📦 Datos completos de la respuesta:");
                    console.log(JSON.stringify(result.raw, null, 2));
                }
            } else {
                console.error(`❌ Error: ${result.error}`);
                if (result.raw) {
                    console.log("\n📜 Detalles del error:");
                    console.log(JSON.stringify(result.raw, null, 2));
                }
            }
        } catch (error) {
            console.error("\n❌ Error en la prueba:", error);
            if (error.stack) {
                console.error("Stack trace:", error.stack);
            }
        }
    }
}

// Ejecutar la prueba si se llama directamente
if (require.main === module) {
    testQuery();
}

module.exports = VottunBridgeQuery;
