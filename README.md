# VottunBridge JavaScript Implementation

## 📁 Archivos Principales

- **`vottun-bridge.js`** - Implementación principal del VottunBridge usando la librería oficial de Qubic
- **`test.js`** - Archivo de prueba principal
- **`get-tick.js`** - Utilidad para obtener el tick actual
- **`query-order.js`** - Utilidad para consultar órdenes
- **`k12-implementation.js`** - Implementación de KangarooTwelve (legacy)
- **`qubic-exact-keys.js`** - Implementación exacta de claves Qubic (legacy)

## 📁 Archivos de Configuración

- **`package.json`** - Dependencias del proyecto
- **`package-lock.json`** - Lock de dependencias

## 📁 Documentación

- **`README-COMPLETE.md`** - Documentación completa del desarrollo
- **`ESTADO-FINAL.md`** - Estado final del proyecto
- **`SIGNATURE_SETUP.md`** - Documentación sobre firmas
- **`datos_node.md`** - Información de nodos
- **`VottunBridge.h`** - Header del smart contract

## 📁 Archive

La carpeta `archive/` contiene todos los archivos de desarrollo y pruebas obsoletos que se crearon durante el proceso de implementación.

## 🚀 Uso

### Instalación
```bash
npm install
```

### Ejecutar test
```bash
node test.js
```

### Usar la librería
```javascript
const { VottunBridgeOfficialCorrected } = require('./vottun-bridge');

const bridge = new VottunBridgeOfficialCorrected();
const result = await bridge.createOrder(seed, ethAddress, amount, direction, tick);
await bridge.broadcastTransaction(result.encodedTransaction);
```

## 📊 Estado

- ✅ **Payload**: 73 bytes exactos según smart contract
- ✅ **Estructura**: Transacción Qubic completa
- ✅ **Firmas**: Usando librería oficial qubic-ts-library
- ✅ **Criptografía**: FourQ real (241KB de código oficial)
- 🧪 **Estado**: Listo para pruebas finales

## 🔧 Dependencias

- `qubic-ts-library`: Librería oficial de Qubic para TypeScript/JavaScript
- `@noble/curves`: Curves criptográficas (legacy)
- `@noble/hashes`: Funciones hash (legacy)