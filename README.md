# Conteo físico Xtensor

1. Ejecute `supabase-inventario-xtensor.sql` en Supabase SQL Editor.
2. Cree seis usuarios en Supabase Authentication: un administrador y cinco operarios.
3. Cambie el rol del administrador con el bloque indicado al final del SQL. Los demás perfiles quedan como `operator`.
4. En `config.js`, pegue la URL del proyecto y la clave anónima pública de Supabase.
5. Suba esta carpeta a Vercel como proyecto estático.

La app guarda cada cambio de conteo de inmediato en Supabase. Los operarios solo pueden consultar y modificar sus ítems asignados, sin cantidades ni valores del sistema. Administración puede asignar ítems y descargar CSV de conteo físico o de ajustes con los encabezados de las plantillas Siigo incluidas en el material fuente.
