const {PublicKey, Long, QubicTransaction, QubicDefinitions} = require('./qubic-types')

// VottunBridge Contract Configuration (from CLI)
const VOTTUN_BRIDGE_CONTRACT = "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML" // Contract index 13
const CONTRACT_INDEX = 13
const CREATE_ORDER_INPUT_TYPE = 1  // VOTTUNBRIDGE_TYPE_CREATE_ORDER
const GET_ORDER_INPUT_TYPE = 1     // VOTTUNBRIDGE_TYPE_GET_ORDER

// API Configuration
const QUBIC_RPC_URL = "http://185.84.224.100:8000/v1"  // Using primary from Go backend

// FIXED: Transaction fee from CLI (not percentage!)
const TRANSACTION_FEE = 1000  // From CLI: constexpr uint64_t TRANSACTION_FEE = 1000;

class VottunBridgePayload {
    constructor(ethAddress, amount, direction) {
        // FIXED: From CLI - ethAddress is 32 bytes, not 64!
        // amount: uint64 (8 bytes)
        // direction: bool (1 byte)
        
        this.ethAddress = this.convertEthAddressTo32Bytes(ethAddress)
        this.amount = new Long(amount)
        this.direction = direction
    }
    
    convertEthAddressTo32Bytes(ethAddress) {
        // Remove 0x prefix if present
        const cleanAddress = ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress
        
        // Convert to 32 bytes as per CLI implementation
        const addressBytes = new Uint8Array(32)
        
        // Convert hex string to bytes (20 bytes for ETH address)
        for (let i = 0; i < cleanAddress.length && i < 40; i += 2) {
            const hexByte = cleanAddress.substr(i, 2)
            addressBytes[i / 2] = parseInt(hexByte, 16)
        }
        
        // Rest remains zeros (padding to 32 bytes)
        return addressBytes
    }
    
    getPackageData() {
        // FIXED: Total: 32 (ethAddress) + 8 (amount) + 1 (direction) = 41 bytes
        // This matches the CLI struct size!
        const buffer = new Uint8Array(41)
        let offset = 0
        
        // ETH Address (32 bytes) - FIXED from 64
        buffer.set(this.ethAddress, offset)
        offset += 32
        
        // Amount (8 bytes, little endian)
        const amountBytes = this.amount.toBytes()
        buffer.set(amountBytes, offset)
        offset += 8
        
        // Direction (1 byte)
        buffer[offset] = this.direction ? 1 : 0
        
        return buffer
    }
    
    getPackageSize() {
        return 41  // FIXED: 32+8+1 = 41 bytes, not 73
    }
    
    getTotalAmount() {
        return this.amount.getValue()
    }
}

class VottunBridgeClient {
    constructor(rpcUrl = QUBIC_RPC_URL) {
        this.rpcUrl = rpcUrl
    }
    
    async createOrder(senderIdentity, senderSeed, ethAddress, amount, direction, targetTick) {
        console.log("Creating VottunBridge order...")
        console.log("ETH Address:", ethAddress)
        console.log("Amount:", amount)
        console.log("Direction:", direction ? "Qubic -> Ethereum" : "Ethereum -> Qubic")
        
        const sourcePublicKey = new PublicKey(senderIdentity)
        const contractPublicKey = new PublicKey(VOTTUN_BRIDGE_CONTRACT)
        
        // Create payload (41 bytes) - FIXED from 73
        const bridgePayload = new VottunBridgePayload(ethAddress, amount, direction)
        
        // FIXED: Use fixed transaction fee, not percentage
        const totalAmount = amount + TRANSACTION_FEE
        
        console.log("Transaction fee:", TRANSACTION_FEE, "Qu (fixed)")
        console.log("Total amount needed:", totalAmount, "Qu")
        
        const transaction = new QubicTransaction()
            .setSourcePublicKey(sourcePublicKey)
            .setDestinationPublicKey(contractPublicKey)
            .setTick(targetTick)
            .setInputType(CREATE_ORDER_INPUT_TYPE)
            .setAmount(new Long(TRANSACTION_FEE))  // FIXED: Only fee in transaction.amount
            .setInputSize(bridgePayload.getPackageSize())
            .setPayload(bridgePayload)
        
        await transaction.build(senderSeed)
        
        console.log("Transaction built successfully")
        console.log("Payload size:", bridgePayload.getPackageSize(), "bytes (FIXED from 73 to 41)")
        
        return transaction
    }
    
    async getOrder(orderId, queryTick) {
        // Query payload for getting order information (41 bytes to match struct)
        const queryPayload = new Uint8Array(41)
        
        // Fill orderId in first 8 bytes (assuming orderId is uint64)
        for (let i = 0; i < 8; i++) {
            queryPayload[i] = (orderId >> (i * 8)) & 0xFF
        }
        
        // Rest filled with zeros
        
        const transaction = new QubicTransaction()
            .setSourcePublicKey(new PublicKey("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"))
            .setDestinationPublicKey(new PublicKey(VOTTUN_BRIDGE_CONTRACT))
            .setTick(queryTick)
            .setInputType(GET_ORDER_INPUT_TYPE)
            .setAmount(new Long(0))
            .setInputSize(41)
            .setPayload({ getPackageData: () => queryPayload })
        
        return transaction
    }
    
    async broadcastTransaction(transaction) {
        const packageData = transaction.getPackageData()
        const encodedTransaction = transaction.encodeTransactionToBase64(packageData)
        
        console.log("Broadcasting transaction...")
        console.log("Package data size:", packageData.length, "bytes")
        console.log("Encoded transaction length:", encodedTransaction.length)
        
        const broadcastUrl = `${this.rpcUrl}/broadcast-transaction`
        console.log("Broadcasting to:", broadcastUrl)
        
        const response = await fetch(broadcastUrl, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({
                encodedTransaction: encodedTransaction
            })
        })
        
        const data = await response.json()
        
        if (response.status !== 200) {
            console.error("Broadcast failed:", data)
            throw new Error(`Request returned status ${response.status}: ${JSON.stringify(data)}`)
        }
        
        console.log("Transaction broadcast successful:", data)
        return data
    }
}

// Example usage
async function example() {
    try {
        // Configuration
        const senderIdentity = "YOUR_SENDER_IDENTITY_HERE"  // Replace with actual identity
        const senderSeed = "YOUR_SENDER_SEED_HERE"          // Replace with actual seed
        const ethAddress = "0x742d35Cc6634C0532925a3b8D04Cc37B2FD9D0eE"  // Example ETH address
        const amount = 5100                                  // Amount in Qu
        const direction = true                               // true = Qubic to Ethereum
        const targetTick = 23490101                          // Target tick
        
        const bridgeClient = new VottunBridgeClient()
        
        // Create order
        const transaction = await bridgeClient.createOrder(
            senderIdentity,
            senderSeed,
            ethAddress,
            amount,
            direction,
            targetTick
        )
        
        // Broadcast transaction
        const result = await bridgeClient.broadcastTransaction(transaction)
        console.log("Order created successfully:", result)
        
    } catch (error) {
        console.error("Error:", error.message)
        console.error("Stack:", error.stack)
    }
}

module.exports = {
    VottunBridgeClient,
    VottunBridgePayload,
    VOTTUN_BRIDGE_CONTRACT,
    CONTRACT_INDEX,
    TRANSACTION_FEE,
    example
}

// Uncomment to run example
// example()