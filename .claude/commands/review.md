# /review — Code review antes de commit

Revisa todos los cambios pendientes como un senior engineer.

## Instrucciones

1. Ejecuta `git diff` para ver todos los cambios
2. Revisa cada archivo cambiado buscando:
   - Bugs lógicos
   - Vulnerabilidades de seguridad (XSS, injection, secrets expuestos)
   - Errores de tipos TypeScript
   - Imports no usados o rotos
   - Patrones inconsistentes con el resto del código
   - Hardcoded values que deberían ser config
3. Ejecuta `npm run build` para verificar que compila
4. Ejecuta `npm run lint` para verificar lint
5. Presenta un resumen:

## Formato

```
## Code Review

### ✅ OK
- [archivos sin problemas]

### ⚠️ Warnings
- [archivo:línea] — descripción

### ❌ Bloqueantes
- [archivo:línea] — descripción + fix sugerido

### Veredicto: LISTO / NECESITA CAMBIOS
```
