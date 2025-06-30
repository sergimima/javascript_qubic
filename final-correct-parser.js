const fetch = require('node-fetch');

const RPC_URL = "http://185.84.224.100:8000/v1";
const CONTRACT_INDEX = 13;

// --- Utility Functions ---
function base64ToUint8Array(base64) {
    return new Uint8Array(Buffer.from(base64, 'base64'));
}

function readUint64LE(bytes, offset) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < offset + 8) {
        return 0; // Avoid reading past the buffer
    }
    return Number(view.getBigUint64(offset, true)); // true for little-endian
}

function ethAddressToString(bytes) {
    return "0x" + Buffer.from(bytes).toString('hex');
}

// --- Main Logic ---

async function getOrder(orderId) {
    try {
        const payloadBuffer = Buffer.alloc(8);
        payloadBuffer.writeBigUInt64LE(BigInt(orderId), 0);
        const requestData = payloadBuffer.toString('base64');

        const response = await fetch(RPC_URL + '/querySmartContract', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contractIndex: CONTRACT_INDEX,
                inputType: 1,
                inputSize: 8,
                requestData: requestData
            })
        });

        if (response.status !== 200) {
            return { exists: false, error: `Query failed (${response.status})` };
        }

        const data = await response.json();
        const responseBytes = base64ToUint8Array(data.responseData);

        // --- Final Parsing Logic based on the one good hex dump ---
        // We check for the minimum length required to read all fields.
        if (responseBytes.length < 124 || responseBytes[0] !== 0) {
            return { exists: false, error: "Invalid or short response from contract" };
        }

        // Offsets verified from the first successful hex dump
        const ethAddress = ethAddressToString(responseBytes.slice(33, 53));
        const parsedOrderId = readUint64LE(responseBytes, 108);
        const amount = readUint64LE(responseBytes, 116);

        // Sanity check: If the server sends a bad payload again, these might be zero.
        if (parsedOrderId === 0 || amount === 0) {
            return { exists: false, error: "Received malformed or zero-value data from API" };
        }

        return {
            exists: true,
            orderId: parsedOrderId,
            amount: amount,
            ethAddress: ethAddress,
            direction: "Qubic→Ethereum"
        };

    } catch (error) {
        return { exists: false, error: error.message };
    }
}

async function main() {
    console.log("==============================================");
    console.log("     VOTTUNBRIDGE - FINAL PARSER ATTEMPT    ");
    console.log("==============================================");

    // We will try to fetch the first 3 orders
    for (let id = 1; id <= 8; id++) {
        console.log(`\nFetching Order ID: ${id}...`);
        const order = await getOrder(id);

        if (order.exists) {
            console.log(`✅ Order ${id} Found:`);
            console.log(`   - Order ID: ${order.orderId}`);
            console.log(`   - Amount: ${order.amount} Qu`);
            console.log(`   - ETH Address: ${order.ethAddress}`);
        } else {
            console.log(`❌ Order ${id} Failed: ${order.error}`);
        }
    }
    console.log("\n==============================================");
    console.log("Script finished. Check logs for successes or errors.");
}

main();