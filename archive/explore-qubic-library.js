// Explorar la estructura de qubic-ts-library
const fs = require('fs');
const path = require('path');

function exploreDirectory(dir, maxDepth = 2, currentDepth = 0) {
    const items = [];
    
    if (currentDepth >= maxDepth) return items;
    
    try {
        const entries = fs.readdirSync(dir);
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                items.push({
                    type: 'directory',
                    name: entry,
                    path: fullPath,
                    children: exploreDirectory(fullPath, maxDepth, currentDepth + 1)
                });
            } else {
                items.push({
                    type: 'file',
                    name: entry,
                    path: fullPath,
                    size: stat.size
                });
            }
        }
    } catch (error) {
        console.log(`Error reading ${dir}:`, error.message);
    }
    
    return items;
}

function printStructure(items, indent = 0) {
    const spaces = '  '.repeat(indent);
    
    for (const item of items) {
        if (item.type === 'directory') {
            console.log(`${spaces}📁 ${item.name}/`);
            if (item.children && item.children.length > 0) {
                printStructure(item.children, indent + 1);
            }
        } else {
            console.log(`${spaces}📄 ${item.name} (${item.size} bytes)`);
        }
    }
}

console.log("🔍 EXPLORING qubic-ts-library STRUCTURE");
console.log("=" .repeat(50));

const libraryPath = path.join(__dirname, 'node_modules', 'qubic-ts-library');

console.log("📁 Library location:", libraryPath);
console.log();

if (fs.existsSync(libraryPath)) {
    console.log("✅ qubic-ts-library found!");
    console.log();
    
    const structure = exploreDirectory(libraryPath, 3);
    printStructure(structure);
    
    console.log();
    console.log("🔍 Looking for package.json...");
    
    const packageJsonPath = path.join(libraryPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        console.log("📦 Package info:");
        console.log("- Name:", packageJson.name);
        console.log("- Version:", packageJson.version);
        console.log("- Main:", packageJson.main);
        console.log("- Types:", packageJson.types);
        console.log("- Exports:", JSON.stringify(packageJson.exports, null, 2));
    }
    
} else {
    console.log("❌ qubic-ts-library not found at:", libraryPath);
}

console.log();
console.log("🔍 Checking dist folder specifically...");

const distPath = path.join(libraryPath, 'dist');
if (fs.existsSync(distPath)) {
    console.log("✅ dist folder found!");
    
    const distFiles = fs.readdirSync(distPath);
    console.log("📄 dist files:");
    
    distFiles.forEach(file => {
        const fullPath = path.join(distPath, file);
        const stat = fs.statSync(fullPath);
        console.log(`  - ${file} (${stat.size} bytes)`);
    });
} else {
    console.log("❌ dist folder not found");
}

console.log();
console.log("🔍 Checking for alternative import paths...");

// Buscar archivos que contengan "helper" o "signature"
function findFiles(dir, pattern) {
    const results = [];
    
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                results.push(...findFiles(fullPath, pattern));
            } else if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
                results.push(fullPath);
            }
        }
    } catch (error) {
        // Ignore errors
    }
    
    return results;
}

const helperFiles = findFiles(libraryPath, 'helper');
const signatureFiles = findFiles(libraryPath, 'signature');

console.log("🔍 Files containing 'helper':");
helperFiles.forEach(file => console.log(`  - ${file}`));

console.log("🔍 Files containing 'signature':");
signatureFiles.forEach(file => console.log(`  - ${file}`));

console.log();
console.log("✅ Exploration complete!");