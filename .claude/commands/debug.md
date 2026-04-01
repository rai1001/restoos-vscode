# /debug — Debugging sistemático

Diagnostica un bug de forma estructurada.

## Instrucciones

1. **Reproducir**: identifica los pasos exactos para reproducir el bug
2. **Aislar**: determina qué componente/archivo es responsable
3. **Diagnosticar**: lee el código, busca la causa raíz (no el síntoma)
4. **Fix**: aplica el fix mínimo necesario
5. **Verificar**: confirma que el fix funciona y no rompe nada más

## Reglas
- NO adivinar. Lee el código y los errores antes de proponer fixes
- NO hacer cambios especulativos. Un fix debe tener una causa clara
- Si no encuentras la causa en 3 intentos, pide más contexto al usuario
- Siempre verificar con build + tests después del fix
