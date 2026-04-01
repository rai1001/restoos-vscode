# /feature — Implementar una feature nueva

Implementa una feature siguiendo el patrón del proyecto.

## Instrucciones

1. **Planificar**: crea plan antes de escribir código (como /plan)
2. **Mock first**: implementa primero con mock data que funcione sin Supabase
3. **Estructura**: sigue el patrón feature-based:
   ```
   src/features/[nombre]/
   ├── components/     — componentes React
   ├── hooks/          — useQuery/useMutation con skipAuth bypass
   ├── schemas/        — Zod schemas
   ├── services/       — llamadas a Supabase
   └── types.ts        — tipos del dominio
   ```
4. **Página**: crear en `src/app/(dashboard)/[ruta]/page.tsx`
5. **Sidebar**: añadir enlace en `src/components/sidebar.tsx`
6. **Dark mode**: usar colores del design system (#0A0A0A, #1A1A1A, #F97316)
7. **skipAuth**: añadir bypass en hooks para modo demo
8. **Verificar**: build + lint + test
9. **Commit**: con mensaje descriptivo

## Checklist
- [ ] Mock data funciona sin Supabase
- [ ] Dark mode uniforme
- [ ] skipAuth bypass en hooks
- [ ] Sidebar actualizado
- [ ] Build pasa
- [ ] Commit hecho
