import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// roslib/src/RosLib.js starts with `var ROSLIB = this.ROSLIB || {...}`. Once bundled, top-level
// `this` is undefined (and the CommonJS plugin rewrites it to an exports var that's still undefined
// at that point), so `this.ROSLIB` throws at load. Rewrite that one line to use globalThis, which
// is always defined and undefined-valued in an app bundle -> roslib initializes fresh.
function fixRoslibThis(): Plugin {
  return {
    name: 'fix-roslib-this',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('roslib/src/RosLib.js')) {
        return { code: code.replace('this.ROSLIB', 'globalThis.ROSLIB'), map: null };
      }
      return null;
    },
  };
}

// `vite dev --host` binds 0.0.0.0 so a laptop can hit the Pi's dev server over the LAN.
export default defineConfig({
  plugins: [fixRoslibThis(), react()],
  server: { host: true, port: 5173 },
});
