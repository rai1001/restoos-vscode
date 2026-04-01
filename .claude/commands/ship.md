# /ship — Commit + push + verificación

Prepara y envía los cambios al repositorio remoto.

## Instrucciones

1. Ejecuta `npm run build` — si falla, NO continuar
2. Ejecuta `npm run lint` — si hay errores, NO continuar
3. Ejecuta `npx vitest run` — si falla, NO continuar
4. Si todo pasa:
   - `git add` los archivos relevantes (NO .env*, NO node_modules)
   - `git commit` con mensaje descriptivo en español
   - `git push origin main`
5. Confirma al usuario con el hash del commit y URL

## Formato commit
```
tipo: descripción corta

- detalle 1
- detalle 2

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Tipos: feat, fix, docs, refactor, test, chore
