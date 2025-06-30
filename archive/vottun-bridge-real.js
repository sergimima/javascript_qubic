const {PublicKey, Long, QubicTransaction, QubicDefinitions} = require('./qubic-types')

// VottunBridge Contract Configuration (from REAL smart contract)
const VOTTUN_BRIDGE_CONTRACT = "NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML" // Contract index 13
const CONTRACT_INDEX = 13
const CREATE_ORDER_INPUT_TYPE = 1  // PROCEDURE createOrder
const GET_ORDER_INPUT_TYPE = 1     // FUNCTION getOrder

// API Configuration
const QUBIC_RPC_URL = "http://185.84.224.100:8000/v1"  // Working endpoint

// Fee system from REAL smart contract
const TRADE_FEE_BILLIONTHS = 5000000  // 0.5% = 5,000,000 / 1,000,000,000

class VottunBridgePayload {
    constructor(ethAddress, amount, direction) {
        // From REAL smart contract:
        // Array<uint8, 64> ethAddress; (64 bytes)
        // uint64 amount; (8 bytes)  
        // bit fromQubicToEthereum; (1 byte)
        
        this.ethAddress = this.padEthAddressTo64Bytes(ethAddress)
        this.amount = new Long(amount)
        this.direction = direction
    }
    
    padEthAddressTo64Bytes(ethAddress) {
        // Remove 0x prefix if present
        const cleanAddress = ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress
        
        // Convert to 64 bytes as per REAL smart contract: Array<uint8, 64>
        const addressBytes = new Uint8Array(64)
        
        // Convert hex string to bytes (20 bytes for ETH address)
        for (let i = 0; i < cleanAddress.length && i < 40; i += 2) {
            const hexByte = cleanAddress.substr(i, 2)
            addressBytes[i / 2] = parseInt(hexByte, 16)
        }
        
        // Rest remains zeros (padding to 64 bytes as required by QPI)
        return addressBytes
    }
    
    getPackageData() {
        // REAL smart contract struct: 64 (ethAddress) + 8 (amount) + 1 (direction) = 73 bytes
        const buffer = new Uint8Array(73)
        let offset = 0
        
        // ETH Address (64 bytes) - from smart contract
        buffer.set(this.ethAddress, offset)
        offset += 64
        
        // Amount (8 bytes, little endian)
        const amountBytes = this.amount.toBytes()
        buffer.set(amountBytes, offset)
        offset += 8
        
        // Direction (1 byte)
        buffer[offset] = this.direction ? 1 : 0
        
        return buffer
    }
    
    getPackageSize() {
        return 73  // 64+8+1 = 73 bytes from REAL smart contract
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
        
        // Create payload (73 bytes) - CORRECT according to real smart contract
        const bridgePayload = new VottunBridgePayload(ethAddress, amount, direction)
        
        // Fee calculation from REAL smart contract
        const requiredFee = Math.floor((amount * TRADE_FEE_BILLIONTHS) / 1000000000)
        
        console.log("Fee calculation:")
        console.log("- Amount:", amount, "Qu")
        console.log("- Fee rate: 0.5% (5,000,000 billionths)")
        console.log("- Required fee:", requiredFee, "Qu")
        console.log("- This fee goes in invocationReward, NOT transaction.amount")
        
        // From smart contract: amount in payload, fee in invocationReward
        const transaction = new QubicTransaction()
            .setSourcePublicKey(sourcePublicKey)
            .setDestinationPublicKey(contractPublicKey)
            .setTick(targetTick)
            .setInputType(CREATE_ORDER_INPUT_TYPE)
            .setAmount(new Long(requiredFee))  // This becomes invocationReward for fee
            .setInputSize(bridgePayload.getPackageSize())
            .setPayload(bridgePayload)
        
        await transaction.build(senderSeed)
        
        console.log("Transaction built successfully")
        console.log("Payload size:", bridgePayload.getPackageSize(), "bytes (73 - CORRECT)")
        
        return transaction
    }
    
    async getOrder(orderId, queryTick) {
        // Query payload structure (73 bytes to match)
        const queryPayload = new Uint8Array(73)
        
        // Fill orderId in first 8 bytes
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
            .setInputSize(73)
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
    TRADE_FEE_BILLIONTHS,
    example
}

// Uncomment to run example
// example()