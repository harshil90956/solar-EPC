# Frontend Modules

Each business area lives in its own folder inside `src/modules/*`.

## How to add a new page without registering it in App.js

Inside your module, edit:

`src/modules/<module-name>/routes/index.js`

and add entries to the exported `routes` array:

- `key`: string (used as hash route like `#dashboard`)
- `title`: string
- `component`: React component

The app auto-discovers all `routes/index.js` files at build-time.
