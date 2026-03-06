# Piper TTS Vendor Files

Source: `piper-tts-web` npm package

## Required Files

Copy from `node_modules/piper-tts-web/dist/`:
- `piper.min.js` (ESM bundle)
- `piper_phonemize.wasm`
- `piper_phonemize.data`

## Setup

```bash
npm pack piper-tts-web
tar -xf piper-tts-web-*.tgz
cp package/dist/piper.min.js .
cp package/dist/piper_phonemize.wasm .
cp package/dist/piper_phonemize.data .
rm -rf package piper-tts-web-*.tgz
```

Voice model files are downloaded at runtime to IndexedDB — NOT vendored here.
