"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Long = void 0;
class Long {
    constructor(initialValue = 0) {
        this.value = BigInt(0);
        if (typeof initialValue === "number") {
            this.setNumber(initialValue);
        }
        else if (initialValue !== undefined) {
            this.setNumber(initialValue);
        }
    }
    setNumber(n) {
        if (typeof n === "number")
            this.value = BigInt(n);
        else
            this.value = n;
    }
    getNumber() {
        return this.value;
    }
    getPackageSize() {
        return 8; // fixed size 
    }
    getPackageData() {
        let buffer = new ArrayBuffer(8);
        let dataview = new DataView(buffer);
        dataview.setBigInt64(0, this.value, true);
        return new Uint8Array(buffer);
    }
}
exports.Long = Long;
