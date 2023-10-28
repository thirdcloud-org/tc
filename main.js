import { decode } from '@ipld/dag-cbor';
import fs from 'fs';
import _sodium from 'libsodium-wrappers';
import path from 'path';

const decrypt = (encryption_key, header, chunkData) => {
    let state_in = _sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, encryption_key);
    let r1 = _sodium.crypto_secretstream_xchacha20poly1305_pull(state_in, chunkData);
    return r1.message
}

const fetchChunk = async (cid) => {
    const url = `https://${cid}.ipfs.nftstorage.link/`;
    console.info(`Fetching ${url}`);
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    return data
}

const maybeSecret = fs.readFileSync(0);
const secret = decode(maybeSecret);

const OUTPUT_DIR = path.join('output', secret.cid);
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const rootData = await fetchChunk(secret.cid);
const root = decode(new Uint8Array(rootData));
console.info(root);
console.info('Downloading files...');

for (const file of root.files) {
    const writer = fs.createWriteStream(path.join(OUTPUT_DIR, file.name));
    for (const chunk of file.chunks) {
        const encryptedChunkData = await fetchChunk(chunk.cid);
        const decryptedChunkData = decrypt(secret.encryption_key, chunk.header, new Uint8Array(encryptedChunkData));
        writer.write(decryptedChunkData);
    }
    writer.end();
}
console.info(`All done, check ${OUTPUT_DIR}`);
  