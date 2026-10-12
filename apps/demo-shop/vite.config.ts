import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  plugins: [react()],
  define: {
    __SHOP_VARIANT__: JSON.stringify(process.env.SHOP_VARIANT === 'fixed' ? 'fixed' : 'buggy'),
  },
  server: { host: 'localhost', strictPort: true },
  build: { target: 'es2022' },
}));
