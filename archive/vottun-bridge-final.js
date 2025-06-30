// VottunBridge completo con KangarooTwelve REAL y claves Qubic correctas
const { schnorr } = require('@noble/curves/secp256k1');
const { KangarooTwelveBasic, QubicKeyConverter } = require('./k12-implementation');

/**
 * Qubic Cryptography con K12 real
 */
class QubicCryptoFinal {
    static k12 = new KangarooTwelveBasic();
    
    static deriveSubSeed(seed) {
        if (typeof seed === 'string') {
            seed = new TextEncoder().encode(seed);
        }
        return this.k12.hash(seed, 32);
    }
    
    static derivePrivateKey(subSeed) {
        return this.k12.hash(subSeed, 32);
    }
    
    static derivePublicKey(privateKey) {
        try {
            return schnorr.getPublicKey(privateKey);
        } catch (error) {
            console.error("Error deriving public key:", error);
            throw error;
        }
    }
    
    static seedToIdentity(seed) {
        const subSeed = this.deriveSubSeed(seed);
        const privateKey = this.derivePrivateKey(subSeed);
        const publicKey = this.derivePublicKey(privateKey);
        return this.publicKeyToIdentity(publicKey);
    }
    
    static publicKeyToIdentity(publicKey) {
        const hash = this.k12.hash(publicKey, 30);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let identity = '';
        
        for (let i = 0; i < hash.length; i++) {
            identity += chars[hash[i] % 26];
        }
        
        return identity.substring(0, 60);
    }
    
    static identityToPublicKey(identity) {
        // Usar conversión mejorada de Qubic
        return QubicKeyConverter.qubicPublicKeyToBytes(identity);
    }
}

/**
 * Qubic Transaction con claves REALES de Qubic
 */
class QubicTransactionFinal {
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
        this.sourcePublicKey = QubicCryptoFinal.identityToPublicKey(identity);
        return this;
    }
    
    setDestinationPublicKey(identity) {
        this.destinationPublicKey = QubicCryptoFinal.identityToPublicKey(identity);
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
     * Sign con claves REALES de Qubic + K12
     */
    async signWithRealQubicKeys(qubicPrivateKey) {
        try {
            console.log("🔐 Signing with REAL Qubic keys + K12...");
            
            // 1. Convertir private key de Qubic a formato Schnorr
            const privateKeyBytes = QubicKeyConverter.qubicPrivateKeyToBytes(qubicPrivateKey);
            
            // 2. Get unsigned digest con K12
            const digest = this.getUnsignedDigest();
            
            console.log("   - Using K12 for digest");
            console.log("   - Digest length:", digest.length);
            console.log("   - Private key converted from Qubic format");
            
            // 3. Sign digest with Schnorr + converted key
            const signature = schnorr.sign(digest, privateKeyBytes);
            
            // 4. Store signature (64 bytes)
            this.signature = new Uint8Array(signature);
            
            console.log("   ✅ Signature created with REAL Qubic keys!");
            console.log("   - Signature length:", this.signature.length, "bytes");
            
            return this;
            
        } catch (error) {
            console.error("❌ Error signing with real Qubic keys:", error);
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
        
        // Convert to base64
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
class VottunBridgePayloadFinal {
    constructor(ethAddress, amount, direction) {
        this.ethAddress = this.padEthAddressTo64Bytes(ethAddress);
        this.amount = BigInt(amount);
        this.direction = direction;
    }
    
    padEthAddressTo64Bytes(ethAddress) {
        const cleanAddress = ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress;
        const addressBytes = new Uint8Array(64);
        
        // Convert hex to bytes (20 bytes ETH address)
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
 * VottunBridge Client FINAL con claves reales
 */
class VottunBridgeClientFinal {
    constructor(rpcUrl = "http://185.84.224.100:8000/v1") {
        this.rpcUrl = rpcUrl;
    }
    
    async createOrderWithRealKeys(qubicIdentity, qubicPrivateKey, ethAddress, amount, direction, targetTick) {
        console.log("🚀 Creating VottunBridge order with REAL Qubic keys + K12...");
        console.log("- Qubic Identity:", qubicIdentity);
        console.log("- ETH Address:", ethAddress);
        console.log("- Amount:", amount);
        console.log("- Direction:", direction ? "Qubic → Ethereum" : "Ethereum → Qubic");
        
        try {
            // 1. Create payload (73 bytes)
            const bridgePayload = new VottunBridgePayloadFinal(ethAddress, amount, direction);
            
            // 2. Calculate fee (0.5%)
            const requiredFee = Math.floor((amount * 5000000) / 1000000000);
            
            console.log("- Fee calculation:");
            console.log("  - Amount:", amount, "Qu");
            console.log("  - Fee rate: 0.5%");
            console.log("  - Required fee:", requiredFee, "Qu");
            
            // 3. Create transaction
            const transaction = new QubicTransactionFinal()
                .setSourcePublicKey(qubicIdentity)
                .setDestinationPublicKey("NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAML")
                .setAmount(requiredFee)
                .setTick(targetTick)
                .setInputType(1) // CREATE_ORDER
                .setInputSize(bridgePayload.getPackageSize())
                .setInput(bridgePayload);
            
            // 4. Sign with REAL Qubic keys
            console.log("🔐 Signing with REAL Qubic private key + KangarooTwelve...");
            await transaction.signWithRealQubicKeys(qubicPrivateKey);
            
            console.log("✅ Transaction created with REAL signature!");
            console.log("- Payload size:", bridgePayload.getPackageSize(), "bytes");
            console.log("- Uses KangarooTwelve:", "YES");
            console.log("- Uses real Qubic keys:", "YES");
            console.log("- Signature present:", transaction.signature ? "YES" : "NO");
            
            return transaction;
            
        } catch (error) {
            console.error("❌ Error creating order with real keys:", error);
            throw error;
        }
    }
    
    async broadcastTransaction(transaction) {
        try {
            console.log("📡 Broadcasting signed transaction...");
            
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
            
            console.log("🎉 Transaction broadcast successful!");
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
    QubicCryptoFinal,
    QubicTransactionFinal,
    VottunBridgeClientFinal,
    VottunBridgePayloadFinal,
    QubicKeyConverter
};