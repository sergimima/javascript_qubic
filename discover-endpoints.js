// Descubrir endpoints correctos para querySmartContract
async function discoverEndpoints() {
    console.log("🔍 DISCOVERING QUBIC RPC ENDPOINTS");
    console.log("=" .repeat(50));
    
    const baseUrls = [
        "http://185.84.224.100:8000",
        "http://185.84.224.100:8000/v1",
        "http://185.84.224.10:8000",
        "http://185.84.224.10:8000/v1"
    ];
    
    const endpoints = [
        "/querySmartContract",
        "/v1/querySmartContract", 
        "/query-smart-contract",
        "/v1/query-smart-contract",
        "/smartcontract/query",
        "/v1/smartcontract/query",
        "/contract/query",
        "/v1/contract/query",
        "/rpc",
        "/v1/rpc"
    ];
    
    for (const baseUrl of baseUrls) {
        console.log(`\n🌐 Testing base URL: ${baseUrl}`);
        
        // Primero probar el base URL solo
        try {
            const response = await fetch(baseUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            console.log(`  ✅ Base URL accessible: ${response.status}`);
            
            if (response.status === 200) {
                const data = await response.text();
                console.log(`  📄 Response: ${data.substring(0, 200)}...`);
            }
        } catch (error) {
            console.log(`  ❌ Base URL failed: ${error.message}`);
        }
        
        // Probar endpoints específicos
        for (const endpoint of endpoints) {
            try {
                const fullUrl = baseUrl + endpoint;
                console.log(`  🔍 Testing: ${fullUrl}`);
                
                // Probar GET primero
                const getResponse = await fetch(fullUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                
                console.log(`    GET: ${getResponse.status}`);
                
                if (getResponse.status !== 404) {
                    // Probar POST con payload mínimo
                    const testPayload = {
                        contractId: "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML",
                        inputType: 7,
                        inputSize: 73,
                        requestData: "dGVzdA==" // "test" en base64
                    };
                    
                    const postResponse = await fetch(fullUrl, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(testPayload)
                    });
                    
                    console.log(`    POST: ${postResponse.status}`);
                    
                    if (postResponse.status !== 404) {
                        const responseText = await postResponse.text();
                        console.log(`    Response: ${responseText.substring(0, 100)}...`);
                    }
                }
                
            } catch (error) {
                console.log(`    ❌ ${error.message}`);
            }
        }
    }
    
    console.log("\n🔍 Testing contract ID validity...");
    
    // También verificar si el contract ID está bien
    const contractId = "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML";
    console.log("- Contract ID:", contractId);
    console.log("- Length:", contractId.length, "characters");
    console.log("- Should be 60 characters for Qubic identity");
    
    if (contractId.length !== 60) {
        console.log("⚠️  Contract ID length is incorrect!");
    }
}

// También verificar en los archivos del backend Go cuál es el endpoint correcto
async function checkGoBackendEndpoints() {
    console.log("\n🔍 CHECKING GO BACKEND PATTERNS");
    console.log("=" .repeat(40));
    
    // Buscar patrones de endpoints en el log anterior
    console.log("From previous successful broadcast:");
    console.log("- Broadcast endpoint: /v1/broadcast-transaction ✅");
    console.log("- Tick endpoint: /v1/tick-info ✅");
    console.log("- Query endpoint: ??? (need to find)");
    
    console.log("\nTrying common patterns...");
    
    const queryPatterns = [
        { url: "http://185.84.224.100:8000/v1/querySmartContract", payload: { contractId: "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML" } },
        { url: "http://185.84.224.100:8000/v1/query-smart-contract", payload: { contractId: "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML" } },
        { url: "http://185.84.224.100:8000/v1/contract/query", payload: { contract: "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML" } },
        { url: "http://185.84.224.100:8000/v1/smartcontract", payload: { id: "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML" } }
    ];
    
    for (const pattern of queryPatterns) {
        try {
            console.log(`\n🔍 Testing: ${pattern.url}`);
            
            const response = await fetch(pattern.url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pattern.payload)
            });
            
            console.log(`Status: ${response.status}`);
            
            const responseText = await response.text();
            console.log(`Response: ${responseText.substring(0, 200)}`);
            
            if (response.status === 200) {
                console.log("🎉 FOUND WORKING ENDPOINT!");
                return pattern.url;
            }
            
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
    }
}

async function main() {
    await discoverEndpoints();
    await checkGoBackendEndpoints();
}

if (require.main === module) {
    main();
}

module.exports = { discoverEndpoints, checkGoBackendEndpoints };