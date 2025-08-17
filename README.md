# Thememes.net

## Environment Variables

Create a `.env` file in the project root with the following values:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These variables are loaded by Vite at build time and available via `import.meta.env`.

Run the development server with:

```
npm run dev
```

Build the project with:

```
npm run build
```
