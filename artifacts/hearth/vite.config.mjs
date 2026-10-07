import {defineConfig} from 'vite';
export default defineConfig({
  cacheDir:'artifacts/hearth/.vite',
  optimizeDeps:{entries:['artifacts/hearth/preview.html'],include:['three']},
  server:{host:'127.0.0.1',port:4333,strictPort:true},
});
