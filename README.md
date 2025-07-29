# theMEMES.net

theMEMES.net is a lightweight meme sharing website built with React, Vite and Supabase.  
Users can sign in with Google, upload images to Supabase Storage and browse the gallery of uploaded memes.

## Setup
1. Install [Node.js](https://nodejs.org/) (version 16 or later).
2. Install the project dependencies:
   ```bash
   npm install
   ```

## Development
Start the development server with hot reloading:

```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Build
Create an optimized production build in the `dist/` directory:

```bash
npm run build
```

You can preview the built site locally with:

```bash
npm run preview
```

## Configuration
The Supabase URL and anonymous key are defined in `src/supabaseClient.js`.  
Update those values if you want to connect to your own Supabase project.


