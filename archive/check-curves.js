// Test para ver qué curvas soporta @noble/curves
const curves = require('@noble/curves');

console.log("🔍 CHECKING @noble/curves SUPPORT");
console.log("Available curves:");

// Listar todas las propiedades disponibles
Object.keys(curves).forEach(key => {
    console.log(`- ${key}: ${typeof curves[key]}`);
});

console.log();
console.log("Trying to find FourQ or similar curve...");

// Buscar algo relacionado con FourQ
const possibleCurves = Object.keys(curves).filter(key => 
    key.toLowerCase().includes('four') || 
    key.toLowerCase().includes('q') ||
    key.toLowerCase().includes('ed') ||
    key.toLowerCase().includes('curve')
);

console.log("Possible candidates:", possibleCurves);

// También revisar si hay algo en secp256k1
try {
    const secp = curves.secp256k1;
    console.log();
    console.log("secp256k1 methods:");
    Object.keys(secp).forEach(key => {
        console.log(`- secp256k1.${key}: ${typeof secp[key]}`);
    });
} catch (e) {
    console.log("secp256k1 not available");
}

// Revisar ed25519
try {
    const ed25519 = curves.ed25519;
    console.log();
    console.log("ed25519 methods:");
    Object.keys(ed25519).forEach(key => {
        console.log(`- ed25519.${key}: ${typeof ed25519[key]}`);
    });
} catch (e) {
    console.log("ed25519 not available");
}