// Implementación EXACTA del algoritmo de claves de Qubic
// Basado en qubic-cli/keyUtils.cpp - LÍNEA POR LÍNEA
const { KangarooTwelveBasic } = require('./k12-implementation');

/**
 * Implementación exacta de Qubic keyUtils.cpp
 */
class QubicKeysExact {
    static k12 = new KangarooTwelveBasic();
    
    /**
     * getSubseedFromSeed - EXACTO como Qubic C++
     */
    static getSubseedFromSeed(seed) {
        // uint8_t seedBytes[55];
        const seedBytes = new Uint8Array(55);
        
        // for (int i = 0; i < 55; i++) { seedBytes[i] = seed[i] - 'a'; }
        for (let i = 0; i < 55 && i < seed.length; i++) {
            if (seed[i] < 'a' || seed[i] > 'z') {
                throw new Error(`Invalid seed character: ${seed[i]} at position ${i}`);
            }
            seedBytes[i] = seed.charCodeAt(i) - 'a'.charCodeAt(0);
        }
        
        // KangarooTwelve(seedBytes, sizeof(seedBytes), subseed, 32);
        return this.k12.hash(seedBytes, 32);
    }
    
    /**
     * getPrivateKeyFromSubSeed - EXACTO como Qubic C++
     */
    static getPrivateKeyFromSubSeed(subseed) {
        // KangarooTwelve(seed, 32, privateKey, 32);
        return this.k12.hash(subseed, 32);
    }
    
    /**
     * getPublicKeyFromIdentity - EXACTO como Qubic C++
     */
    static getPublicKeyFromIdentity(identity) {
        // unsigned char publicKeyBuffer[32];
        const publicKeyBuffer = new Uint8Array(32);
        
        // for (int i = 0; i < 4; i++)
        for (let i = 0; i < 4; i++) {
            // *((unsigned long long*)&publicKeyBuffer[i << 3]) = 0;
            let value = 0n;
            
            // for (int j = 14; j-- > 0; )
            for (let j = 13; j >= 0; j--) {
                const charIndex = i * 14 + j;
                if (charIndex >= identity.length) continue;
                
                const char = identity[charIndex];
                if (char < 'A' || char > 'Z') {
                    throw new Error(`Invalid identity character: ${char} at position ${charIndex}`);
                }
                
                // *((unsigned long long*)&publicKeyBuffer[i << 3]) = 
                //   *((unsigned long long*)&publicKeyBuffer[i << 3]) * 26 + (identity[i * 14 + j] - 'A');
                value = value * 26n + BigInt(char.charCodeAt(0) - 'A'.charCodeAt(0));
            }
            
            // Convertir BigInt a bytes (little endian, 8 bytes)
            for (let byteIndex = 0; byteIndex < 8; byteIndex++) {
                publicKeyBuffer[i * 8 + byteIndex] = Number((value >> BigInt(byteIndex * 8)) & 0xFFn);
            }
        }
        
        return publicKeyBuffer;
    }
    
    /**
     * Función completa: seed → private key (formato Qubic real)
     */
    static seedToPrivateKeyBytes(seed) {
        const subseed = this.getSubseedFromSeed(seed);
        const privateKey = this.getPrivateKeyFromSubSeed(subseed);
        return privateKey;
    }
    
    /**
     * Función completa: identity → public key (formato Qubic real)
     */
    static identityToPublicKeyBytes(identity) {
        return this.getPublicKeyFromIdentity(identity.toUpperCase());
    }
}

module.exports = { QubicKeysExact };