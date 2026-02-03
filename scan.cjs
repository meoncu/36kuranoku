const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
    console.log('Usage: node scan.js <file>');
    process.exit(1);
}

const buffer = fs.readFileSync(filePath);

function findPattern(buf, pattern) {
    for (let i = 0; i < buf.length - pattern.length; i++) {
        let match = true;
        for (let j = 0; j < pattern.length; j++) {
            if (buf[i + j] !== pattern[j]) {
                match = false;
                break;
            }
        }
        if (match) return i;
    }
    return -1;
}

const png = [0x89, 0x50, 0x4E, 0x47];
const jpg = [0xFF, 0xD8, 0xFF];
const webp = [0x52, 0x49, 0x46, 0x46]; // RIFF

console.log('File size:', buffer.length);
console.log('PNG at:', findPattern(buffer, png));
console.log('JPG at:', findPattern(buffer, jpg));
console.log('WebP at:', findPattern(buffer, webp));

// Try to see if it's XORed with a simple key
// Check if common markers appear if we XOR with the first byte
const firstByte = buffer[0];
const first4 = buffer.slice(0, 4);
const xorFirst = first4.map(b => b ^ firstByte);
console.log('XOR with first byte (0x' + firstByte.toString(16) + '):', xorFirst);
