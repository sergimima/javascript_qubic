// Pegar esto en la consola del navegador o en un archivo Node.js
const encodedTx = 'jx87W9Hc5h20Z9+m0Y33K4KusuDwIo/iOGcIEY5BtyZyecOgACtM0x9hCzHQ9vZskqu1G1kElgZqKXi6bjRe9+wTAAAAAAAA9E5mAQEASQAJA3ipyAxeHO2F5WshKMHlFOdTVwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7BMAAAAAAAABIHa3yYnbQGSGWCno7avWGQbC+e6QZw664HjmQqNvqWG4WE0NK2sAKoYXLEoSdbbA1fcIMaZpg9axNLYOR4wXAA==';
const txBytes = Buffer.from(encodedTx, 'base64');

console.log('Longitud total:', txBytes.length, 'bytes');

// Desglose aproximado (puede variar según la implementación exacta)
console.log('Primeros 32 bytes (Source Public Key):', txBytes.subarray(0, 32).toString('hex'));
console.log('Siguientes 32 bytes (Destination):', txBytes.subarray(32, 64).toString('hex'));
console.log('Siguientes 8 bytes (Amount):', txBytes.subarray(64, 72).toString('hex'));
console.log('Siguientes 4 bytes (Tick):', txBytes.subarray(72, 76).readUInt32LE(0));
console.log('Siguientes 2 bytes (Input Type):', txBytes.subarray(76, 78).readUInt16LE(0));
console.log('Siguientes 2 bytes (Input Size):', txBytes.subarray(78, 80).readUInt16LE(0));
console.log('Últimos 64 bytes (Firma):', txBytes.subarray(-64).toString('hex'));