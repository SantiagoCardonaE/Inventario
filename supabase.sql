-- Proyecto: Project-manager | Supabase: nzbpcyriwrsjceematrg
-- Organización: santiagocardona.15.98@gmail.com | Web: https://xtensorproject.vercel.app/
-- Cronograma base actualizado al 2026-09-28: 23 hitos. Fechas futuras estimadas.
-- En bases existentes conserva las ediciones; los 23 hitos ya se guardaron en el proyecto indicado.
-- Gantt compartido, sin cuentas ni contraseñas.
-- Ejecutar COMPLETO en Supabase > SQL Editor, incluso si ya ejecutó la versión anterior.
-- Conserva los hitos existentes y permite que todos los visitantes los vean y editen.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gantt_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 position integer NOT NULL DEFAULT 1,
 name text NOT NULL,
 description text NOT NULL DEFAULT '',
 start_date date NOT NULL,
 end_date date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT gantt_task_dates CHECK(end_date >= start_date)
);
-- Compatibilidad con los datos del proyecto anterior.
ALTER TABLE public.gantt_tasks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.gantt_tasks DROP CONSTRAINT IF EXISTS gantt_tasks_user_id_fkey;
ALTER TABLE public.gantt_tasks ADD CONSTRAINT gantt_tasks_user_id_fkey
 FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.gantt_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own gantt tasks" ON public.gantt_tasks;
DROP POLICY IF EXISTS "Users can insert own gantt tasks" ON public.gantt_tasks;
DROP POLICY IF EXISTS "Users can update own gantt tasks" ON public.gantt_tasks;
DROP POLICY IF EXISTS "Users can delete own gantt tasks" ON public.gantt_tasks;
DROP POLICY IF EXISTS "Public shared gantt" ON public.gantt_tasks;
CREATE POLICY "Public shared gantt" ON public.gantt_tasks
 FOR ALL TO anon, authenticated USING(true) WITH CHECK(true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gantt_tasks TO anon, authenticated;
CREATE INDEX IF NOT EXISTS gantt_tasks_position_idx ON public.gantt_tasks(position);
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN new.updated_at = now(); RETURN new; END;
$$;
DROP TRIGGER IF EXISTS gantt_tasks_updated_at ON public.gantt_tasks;
CREATE TRIGGER gantt_tasks_updated_at BEFORE UPDATE ON public.gantt_tasks
 FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- El navegador ya no inicializa proyectos por usuario.
DROP FUNCTION IF EXISTS public.initialize_gantt();
-- Marca privada para no duplicar hitos ni recrearlos tras eliminarlos.
CREATE TABLE IF NOT EXISTS public.gantt_public_setup (
 id integer PRIMARY KEY CHECK(id = 1)
);
ALTER TABLE public.gantt_public_setup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gantt_public_setup FROM anon, authenticated;
DO $$
BEGIN
 INSERT INTO public.gantt_public_setup(id) VALUES(1) ON CONFLICT DO NOTHING;
 IF FOUND AND NOT EXISTS(SELECT 1 FROM public.gantt_tasks) THEN
 INSERT INTO public.gantt_tasks(position,name,description,start_date,end_date) VALUES
  (1,'Diagnóstico y línea base de Siigo','Conservar período registrado. Entregable: existencias, valoración y movimientos de referencia; validar cierre documental, sin asumir diagnóstico terminado.','2026-09-24','2026-09-25'),
  (2,'Validar alcance, secciones y responsables','Plan estimado: confirmar cobertura del catálogo, ubicaciones, unidades, responsables y pendientes. Definir corte y tratamiento de entradas y salidas durante el conteo.','2026-09-28','2026-09-30'),
  (3,'Conteo físico por secciones — en curso','Al corte del 28/09 el usuario reporta avance parcial en pintura. El 28/09 representa el corte de seguimiento, no el inicio histórico comprobado. Meta estimada: completar cobertura y materiales fuera de Siigo.','2026-09-28','2026-10-15'),
  (4,'Pintura: completar conteo y pendientes','En curso según reporte del usuario; porcentaje y fecha real de inicio pendientes de verificar en la app. Meta estimada: revisar referencias pendientes, unidades, envases abiertos y materiales agregados.','2026-09-28','2026-10-02'),
  (5,'Pintura: reconteo y validación del lote','Plan estimado: reconteo de diferencias y validación por responsable. Conciliar únicamente referencias contadas; cerrar el lote cuando todas las excepciones tengan soporte.','2026-10-01','2026-10-06'),
  (6,'Conteo de tubería y materiales de torno','Plan estimado sujeto a responsables: verificar ubicación, unidad y equivalencias de longitudes, peso y piezas. Registrar material no catalogado y pendientes explícitos.','2026-09-29','2026-10-09'),
  (7,'Conteo de ensamble, varios y ubicaciones pendientes','Plan estimado: completar secciones restantes y validar ubicación de referencias sin clasificar. No tratar ausencia de registro como cantidad cero.','2026-10-01','2026-10-15'),
  (8,'Cerrar cobertura y reconteos del inventario','Plan estimado: verificar todas las secciones, duplicados, materiales fuera de Siigo y referencias sin conteo. Entregable: listado final validado y excepciones identificadas.','2026-10-13','2026-10-20'),
  (9,'Conciliar Siigo vs. físico por lotes','Plan estimado: iniciar con pintura validada y sumar secciones cerradas. Alinear fecha de corte y movimientos; comparar cantidades y valores. Cierre posterior a cobertura y reconteos.','2026-10-02','2026-10-22'),
  (10,'Investigar causas de las diferencias','Plan estimado en paralelo con conciliación: rastrear entradas, consumos, devoluciones, traslados, unidades y soportes. Entregable: causa y tratamiento por diferencia.','2026-10-05','2026-10-29'),
  (11,'Depurar catálogo y unidades de medida','Plan estimado: resolver códigos duplicados, descripciones, unidades, ubicaciones y materiales agregados. Validar equivalencias antes de preparar ajustes.','2026-10-05','2026-11-06'),
  (12,'Revisar y aprobar ajustes de inventario','Plan estimado: consolidar diferencias justificadas, soportes y archivo de importación; aprobación del responsable antes de modificar Siigo. Depende del cierre de conciliación y depuración.','2026-11-03','2026-11-10'),
  (13,'Aplicar ajustes aprobados en Siigo','Plan estimado: registrar únicamente ajustes aprobados y conservar soportes y comprobantes. Este hito no autoriza ajustes automáticos en Siigo.','2026-11-11','2026-11-13'),
  (14,'Verificar saldos después del ajuste','Plan estimado: exportar saldos nuevos, comparar con inventario validado y movimientos posteriores al corte; resolver excepciones antes de aceptar la línea base.','2026-11-16','2026-11-18'),
  (15,'Diseñar entradas, salidas y traslados','Plan estimado en paralelo al conteo: definir registro oportuno de movimientos, responsables, soportes y tratamiento de consumos, devoluciones y materiales nuevos.','2026-09-29','2026-10-16'),
  (16,'Pilotear el proceso en pintura','Plan estimado condicionado al cierre del lote de pintura: probar entradas, consumos y devoluciones con trazabilidad. Documentar errores y mejoras antes de extender el proceso.','2026-10-19','2026-10-30'),
  (17,'Estandarizar el proceso y capacitar responsables','Plan estimado: incorporar resultados del piloto; validar procedimiento, responsabilidades y capacitación para las demás secciones.','2026-11-02','2026-11-20'),
  (18,'Mejorar consulta y seguimiento del inventario','Plan estimado: partir de la app de conteo existente y validar consultas por código, sección y pendientes. Diferenciar avance de conteo de inventario operativo actualizado.','2026-10-19','2026-11-13'),
  (19,'Asegurar actualización y disponibilidad','Plan estimado: validar acceso de responsables, oportunidad de registro, respaldo y recuperación. Comprobar consistencia con saldos ajustados y movimientos reales.','2026-11-19','2026-12-04'),
  (20,'Implementar controles y conteos cíclicos','Plan estimado: definir calendario por criticidad, revisión de movimientos, soportes y responsables. Establecer cómo detectar y resolver diferencias recurrentes.','2026-11-23','2026-12-11'),
  (21,'Estabilizar la operación y corregir incidencias','Plan estimado: seguimiento de registros, reconteos selectivos y cierre de incidencias. Asegurar responsables y continuidad durante el cierre de año.','2026-12-07','2026-12-23'),
  (22,'Medir exactitud y tiempos de actualización','Plan estimado: medir exactitud por referencia y valor, diferencias repetidas y tiempos de consulta y registro. Definir metas con responsables y usar evidencia del período de operación.','2027-01-04','2027-01-15'),
  (23,'Cerrar proyecto y entregar mantenimiento','Cierre objetivo conservado al 22/01/2027. Condiciones: resultados revisados, incidencias críticas resueltas, procedimiento aceptado y responsables de controles y continuidad definidos.','2027-01-18','2027-01-22');
 END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.shift_gantt(new_start date)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE first_start date;
BEGIN
 IF new_start IS NULL THEN RAISE EXCEPTION 'Fecha requerida'; END IF;
 SELECT start_date INTO first_start FROM public.gantt_tasks
 ORDER BY position,created_at,id LIMIT 1;
 IF first_start IS NULL THEN RETURN; END IF;
 UPDATE public.gantt_tasks SET
 start_date = start_date + (new_start - first_start),
 end_date = end_date + (new_start - first_start);
END;
$$;
REVOKE ALL ON FUNCTION public.shift_gantt(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shift_gantt(date) TO anon, authenticated;
COMMIT;
