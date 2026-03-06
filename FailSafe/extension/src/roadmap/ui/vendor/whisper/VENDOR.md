# Whisper STT Vendor Files

Source: `@xenova/transformers` npm package (v2.17+)

## Required Files

Copy from `node_modules/@xenova/transformers/dist/`:
- `transformers.min.js` (ESM bundle)
- `ort-wasm-simd.wasm`
- `ort-wasm-simd-threaded.wasm`

## Setup

```bash
npm pack @xenova/transformers@2.17.2
tar -xf xenova-transformers-2.17.2.tgz
cp package/dist/transformers.min.js .
cp package/dist/ort-wasm-simd.wasm .
cp package/dist/ort-wasm-simd-threaded.wasm .
rm -rf package xenova-transformers-2.17.2.tgz
```

Model files (`whisper-tiny.en`) are downloaded at runtime to IndexedDB
by Transformers.js automatically — NOT vendored here.
