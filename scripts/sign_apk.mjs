import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { signApk } from 'apk_sign_ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const unsignedPath = process.argv[2] || path.join(__dirname, '../public/unsigned.apk');
  const signedPath = process.argv[3] || path.join(__dirname, '../public/zoya-ai-voice-assistant.apk');

  if (!fs.existsSync(unsignedPath)) {
    console.error(`Input APK not found at: ${unsignedPath}`);
    process.exit(1);
  }

  // Generate self-signed 2048-bit RSA key and X.509 cert in PKCS#8 format for APK signing
  const tempDir = path.join(__dirname, '../node_modules/.cache_apk_keys');
  fs.mkdirSync(tempDir, { recursive: true });
  const keyPath = path.join(tempDir, 'key.pem');
  const certPath = path.join(tempDir, 'cert.pem');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('Generating RSA signing keypair & certificate for Zoya AI...');
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 3650 -subj "/CN=Zoya AI Voice Assistant/O=DEVID/C=IN"`,
      { stdio: 'ignore' }
    );
  }

  const keyPem = fs.readFileSync(keyPath, 'utf8');
  const certPem = fs.readFileSync(certPath, 'utf8');
  const apkBuffer = fs.readFileSync(unsignedPath);

  console.log(`Signing APK (${(apkBuffer.length / (1024 * 1024)).toFixed(2)} MB) with APK Signature Scheme v2 + JAR v1...`);
  const result = await signApk(apkBuffer, keyPem, certPem);

  fs.writeFileSync(signedPath, Buffer.from(result.signedApk));
  const finalSize = fs.statSync(signedPath).size;
  console.log(`✓ APK successfully signed! Output: ${signedPath} (${(finalSize / (1024 * 1024)).toFixed(2)} MB, signature size: ${result.signatureSize} bytes)`);
}

main().catch(err => {
  console.error('Signing failed:', err);
  process.exit(1);
});
