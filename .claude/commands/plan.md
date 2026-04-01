# /plan — Planificar antes de ejecutar

Antes de escribir código, crea un plan detallado.

## Instrucciones

1. Lee el contexto actual: qué archivos están involucrados, qué existe ya
2. Identifica los riesgos y dependencias
3. Escribe un plan paso a paso con:
   - Archivos a crear/modificar
   - Orden de implementación
   - Tests necesarios
   - Criterios de "hecho"
4. Presenta el plan al usuario para aprobación ANTES de ejecutar
5. Solo ejecuta después de recibir "ok" o "sí"

## Formato del plan

```
## Plan: [título]

### Contexto
[qué existe, qué falta]

### Pasos
1. [ ] Paso 1 — archivo(s), cambio
2. [ ] Paso 2 — ...

### Riesgos
- ...

### Criterio de "hecho"
- [ ] Build pasa
- [ ] Tests pasan
- [ ] Verificado en navegador (si UI)
```
