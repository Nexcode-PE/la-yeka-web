# Datos de presentación

Para poblar la presentación con pedidos, pagos y reclamos de ejemplo:

```powershell
pnpm --filter @la-yeka/database run demo:seed
```

Los registros se identifican como `DEMO · PRESENTACIÓN` y no modifican el catálogo ni los usuarios reales.

Al terminar la reunión, se eliminan con:

```powershell
pnpm --filter @la-yeka/database run demo:cleanup
```

La limpieza borra únicamente los seis pedidos, los tres reclamos y el usuario de prueba creados por el script.
