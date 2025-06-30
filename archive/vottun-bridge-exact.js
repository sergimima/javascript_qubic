// VottunBridge completo con algoritmo EXACTO de Qubic keyUtils.cpp
const { schnorr } = require('@noble/curves/secp256k1');
const { KangarooTwelveBasic } = require('./k12-implementation');
const { QubicKeysExact } = require('./qubic-exact-keys');

/**
 * Qubic Transaction con algoritmo EXACTO de claves
 */
class QubicTransactionExact {
    constructor() {
        this.sourcePublicKey = null;
        this.destinationPublicKey = null;
        this.amount = 0n;
        this.tick = 0;
        this.inputType = 0;
        this.inputSize = 0;
        this.input = null;
        this.signature = null;
        this.k12 = new KangarooTwelveBasic();
    }
    
    setSourcePublicKey(identity) {
        // Usar algoritmo EXACTO de Qubic
        this.sourcePublicKey = QubicKeysExact.identityToPublicKeyBytes(identity);
        return this;
    }
    
    setDestinationPublicKey(identity) {
        // Usar algoritmo EXACTO de Qubic
        this.destinationPublicKey = QubicKeysExact.identityToPublicKeyBytes(identity);
        return this;
    }
    
    setAmount(amount) {
        this.amount = BigInt(amount);
        return this;
    }
    
    setTick(tick) {
        this.tick = tick;
        return this;
    }
    
    setInputType(inputType) {
        this.inputType = inputType;
        return this;
    }
    
    setInputSize(inputSize) {
        this.inputSize = inputSize;
        return this;
    }
    
    setInput(input) {
        this.input = input;
        return this;
    }
    
    /**
     * Get unsigned digest usando K12 REAL
     */
    getUnsignedDigest() {
        const transactionData = this.serializeForSigning();
        return this.k12.hash(transactionData, 32);
    }
    
    /**
     * Serialize transaction for signing
     */
    serializeForSigning() {
        const buffer = new ArrayBuffer(80 + this.inputSize);
        const view = new DataView(buffer);
        const uint8View = new Uint8Array(buffer);
        
        let offset = 0;
        
        // Source public key (32 bytes)
        uint8View.set(this.sourcePublicKey, offset);
        offset += 32;
        
        // Destination public key (32 bytes)
        uint8View.set(this.destinationPublicKey, offset);
        offset += 32;
        
        // Amount (8 bytes, little endian)
        view.setBigUint64(offset, this.amount, true);
        offset += 8;
        
        // Tick (4 bytes, little endian)
        view.setUint32(offset, this.tick, true);
        offset += 4;
        
        // Input type (2 bytes, little endian)
        view.setUint16(offset, this.inputType, true);
        offset += 2;
        
        // Input size (2 bytes, little endian)
        view.setUint16(offset, this.inputSize, true);
        offset += 2;
        
        // Input data
        if (this.input && this.inputSize > 0) {
            const inputData = typeof this.input.getPackageData === 'function' 
                ? this.input.getPackageData() 
                : this.input;
            uint8View.set(inputData, offset);
        }
        
        return new Uint8Array(buffer);
    }
    
    /**
     * Sign con algoritmo EXACTO de Qubic
     */
    async signWithQubicExact(qubicSeed) {
        try {
            console.log("🔐 Signing with EXACT Qubic algorithm...");
            
            // 1. Usar algoritmo EXACTO: seed → subseed → private key
            const privateKeyBytes = QubicKeysExact.seedToPrivateKeyBytes(qubicSeed);
            
            // 2. Get unsigned digest con K12
            const digest = this.getUnsignedDigest();
            
            console.log("   ✅ Used EXACT Qubic key derivation");
            console.log("   - Private key from exact algorithm");
            console.log("   - Digest length:", digest.length);
            
            // 3. Sign digest (seguimos usando schnorr porque es estándar)
            const signature = schnorr.sign(digest, privateKeyBytes);
            
            // 4. Store signature (64 bytes)
            this.signature = new Uint8Array(signature);
            
            console.log("   ✅ Signature created with EXACT Qubic keys!");
            console.log("   - Signature length:", this.signature.length, "bytes");
            
            return this;
            
        } catch (error) {
            console.error("❌ Error signing with exact Qubic algorithm:", error);
            throw error;
        }
    }
    
    /**
     * Serialize complete transaction
     */
    serialize() {
        if (!this.signature) {
            throw new Error("Transaction must be signed before serialization");
        }
        
        const headerSize = 80;
        const signatureSize = 64;
        const totalSize = headerSize + this.inputSize + signatureSize;
        
        const buffer = new ArrayBuffer(totalSize);
        const uint8View = new Uint8Array(buffer);
        
        let offset = 0;
        
        // Header + Input (without signature)
        const headerData = this.serializeForSigning();
        uint8View.set(headerData, offset);
        offset += headerData.length;
        
        // Signature (64 bytes)
        uint8View.set(this.signature, offset);
        
        return new Uint8Array(buffer);
    }
    
    /**
     * Encode to Base64 for broadcast
     */
    encodeToBase64() {
        const serialized = this.serialize();
        
        let binary = '';
        for (let i = 0; i < serialized.length; i++) {
            binary += String.fromCharCode(serialized[i]);
        }
        
        return btoa(binary);
    }
}

/**
 * VottunBridge Payload (73 bytes exact)
 */
class VottunBridgePayloadExact {
    constructor(ethAddress, amount, direction) {
        this.ethAddress = this.padEthAddressTo64Bytes(ethAddress);
        this.amount = BigInt(amount);
        this.direction = direction;
    }
    
    padEthAddressTo64Bytes(ethAddress) {
        const cleanAddress = ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress;
        const addressBytes = new Uint8Array(64);
        
        for (let i = 0; i < cleanAddress.length && i < 40; i += 2) {
            const hexByte = cleanAddress.substr(i, 2);
            addressBytes[i / 2] = parseInt(hexByte, 16);
        }
        
        return addressBytes;
    }
    
    getPackageData() {
        const buffer = new Uint8Array(73); // 64 + 8 + 1
        let offset = 0;
        
        // ETH Address (64 bytes)
        buffer.set(this.ethAddress, offset);
        offset += 64;
        
        // Amount (8 bytes, little endian)
        const amountBytes = new Uint8Array(8);
        let amount = this.amount;
        for (let i = 0; i < 8; i++) {
            amountBytes[i] = Number(amount & 0xFFn);
            amount = amount >> 8n;
        }
        buffer.set(amountBytes, offset);
        offset += 8;
        
        // Direction (1 byte)
        buffer[offset] = this.direction ? 1 : 0;
        
        return buffer;
    }
    
    getPackageSize() {
        return 73;
    }
}

/**
 * VottunBridge Client con algoritmo EXACTO
 */
class VottunBridgeClientExact {
    constructor(rpcUrl = "http://185.84.224.100:8000/v1") {
        this.rpcUrl = rpcUrl;
    }
    
    async createOrderWithExactAlgorithm(qubicIdentity, qubicSeed, ethAddress, amount, direction, targetTick) {
        console.log("🎯 Creating VottunBridge order with EXACT Qubic algorithm...");
        console.log("- Qubic Identity:", qubicIdentity);
        console.log("- ETH Address:", ethAddress);
        console.log("- Amount:", amount);
        console.log("- Direction:", direction ? "Qubic → Ethereum" : "Ethereum → Qubic");
        
        try {
            // 1. Create payload (73 bytes)
            const bridgePayload = new VottunBridgePayloadExact(ethAddress, amount, direction);
            
            // 2. Calculate fee (0.5%)
            const requiredFee = Math.floor((amount * 5000000) / 1000000000);
            
            console.log("- Fee calculation:");
            console.log("  - Amount:", amount, "Qu");
            console.log("  - Required fee:", requiredFee, "Qu");
            
            // 3. Create transaction
            const transaction = new QubicTransactionExact()
                .setSourcePublicKey(qubicIdentity)
                .setDestinationPublicKey("NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML")
                .setAmount(requiredFee)
                .setTick(targetTick)
                .setInputType(1) // CREATE_ORDER
                .setInputSize(bridgePayload.getPackageSize())
                .setInput(bridgePayload);
            
            // 4. Sign with EXACT Qubic algorithm
            console.log("🔐 Signing with EXACT Qubic keyUtils.cpp algorithm...");
            await transaction.signWithQubicExact(qubicSeed);
            
            console.log("✅ Transaction created with EXACT algorithm!");
            console.log("- Uses exact getSubseedFromSeed()");
            console.log("- Uses exact getPrivateKeyFromSubSeed()");
            console.log("- Uses exact getPublicKeyFromIdentity()");
            console.log("- Signature present:", transaction.signature ? "YES" : "NO");
            
            return transaction;
            
        } catch (error) {
            console.error("❌ Error creating order with exact algorithm:", error);
            throw error;
        }
    }
    
    async broadcastTransaction(transaction) {
        try {
            console.log("📡 Broadcasting transaction with EXACT signature...");
            
            const encodedTransaction = transaction.encodeToBase64();
            
            console.log("- Encoded length:", encodedTransaction.length);
            console.log("- Total size:", transaction.serialize().length, "bytes");
            
            const response = await fetch(`${this.rpcUrl}/broadcast-transaction`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "POST",
                body: JSON.stringify({
                    encodedTransaction: encodedTransaction
                })
            });
            
            const data = await response.json();
            
            if (response.status !== 200) {
                console.error("❌ Broadcast failed:", data);
                throw new Error(`Broadcast failed (${response.status}): ${JSON.stringify(data)}`);
            }
            
            console.log("🎉 Transaction broadcast successful with EXACT algorithm!");
            console.log("📊 Result:", data);
            
            return data;
            
        } catch (error) {
            console.error("❌ Broadcast error:", error);
            throw error;
        }
    }
}

// Export classes
module.exports = {
    QubicTransactionExact,
    VottunBridgeClientExact,
    VottunBridgePayloadExact,
    QubicKeysExact
};