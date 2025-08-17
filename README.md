# Thememes.net

This project is built with [Vite](https://vitejs.dev/) and React.

## Environment Variables

Create a `.env` file in the project root with the following values:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These variables are loaded by Vite at build time and available via `import.meta.env`.

## Development

Run the development server with:

```
npm run dev
```

## Build

Build the project with:

```
npm run build
```

## Project Structure

- `src/` – React application code.
- `public/` – static assets served at the root.
