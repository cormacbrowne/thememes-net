import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { socialSameAs } from './src/config/social.js'

const ORG_LOGO_LINE = '"image": "https://www.thememes.net/logo-512.png"'

/**
 * Plan 1.5: adds the brand's social profiles (src/config/social.js) to the Organization
 * JSON-LD in index.html as "sameAs". Nothing is added while every URL is empty.
 */
export function injectOrganizationSameAs(html, urls = socialSameAs()) {
  if (!urls.length || !html.includes(ORG_LOGO_LINE)) return html
  return html.replace(ORG_LOGO_LINE, `${ORG_LOGO_LINE},\n            "sameAs": ${JSON.stringify(urls)}`)
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    { name: 'tm-organization-same-as', transformIndexHtml: (html) => injectOrganizationSameAs(html) }
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
          if (id.includes('node_modules/react')) {
            return 'react-vendor';
          }
        }
      }
    }
  }
})
