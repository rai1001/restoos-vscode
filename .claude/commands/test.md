# /test — Ejecutar tests y reportar

Ejecuta la suite de tests y reporta resultados.

## Instrucciones

1. Ejecuta `npx vitest run`
2. Si hay fallos:
   - Lee el error de cada test fallido
   - Identifica si es un bug real o un test desactualizado
   - Propón fix para cada fallo
3. Reporta:

```
## Tests: X/Y passed

### ✅ Passed (X)
[lista de suites]

### ❌ Failed (Y)
- [test name] — causa + fix propuesto

### Cobertura
[si disponible]
```
