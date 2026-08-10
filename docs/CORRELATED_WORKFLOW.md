# Flujo operativo correlacionado

## Principio

El layout es la situación física actual. Los eventos y tareas son registros
históricos que conservan el PAD, pozo, etapa y SET existentes cuando ocurrió la
acción. Cambiar el contexto actual nunca reescribe el pasado.

Cada operación se confirma sobre un único `MaintenanceState` y se persiste como
un snapshot completo. Antes de aceptar el cambio se verifican las invariantes de
todos los SET.

## Caída y reemplazo

1. Una bomba dentro del SET pasa a `offline` y movimiento `maintenance`.
2. Se crea un evento `pending` con su ubicación y contexto completos.
3. La primera reserva operativa disponible queda vinculada mediante
   `reservedForEventId`; no puede recomendarse para otra alerta.
4. Operaciones decide:
   - `replaced`: la reserva entra en el slot original y la bomba caída sale al
     banco en estado OFFLINE/MTTO.
   - `not-possible`: la reserva se libera y la bomba permanece OFFLINE en su
     posición hasta resolver el mantenimiento.
5. La decisión agrega `respondedAt`, comentario y, si corresponde, la identidad
   de la bomba que efectivamente ingresó.
6. Se crea una tarea PE/IEM vinculada por `eventId`.
7. Al completar la tarea se registra `completedAt`, se habilita la bomba y el
   evento recibe `restoredAt`.

## Invariantes principales

- Cada SET tiene su propio layout.
- Una bomba activa pertenece a un manifold existente y su conexión coincide con
  el tipo LIMPIO/SUCIO.
- No puede haber dos bombas en el mismo manifold, lado y posición.
- Una bomba de reserva no conserva manifold ni conexión activa.
- Sólo una alerta pendiente puede reservar una bomba.
- Una decisión de reemplazo debe identificar la bomba que ingresó.
- Una decisión `not-possible` no puede registrar un reemplazo.
- Una tarea completada siempre tiene fecha de cierre.
- El estado público del store es de sólo lectura; los cambios pasan por acciones
  de dominio.

## Persistencia y recuperación

El schema actual es `2`. Al iniciar se valida el snapshot guardado y se migra el
schema Angular `1` cuando corresponde. Los backups JSON pasan por la misma
validación antes de ser importados. Si una escritura local falla, la interfaz
indica explícitamente que existen cambios sin guardar.

## Límites actuales

Este flujo no implementa todavía el editor general de bombas/manifolds, el
planificador avanzado entre etapas, Excel, PNG ni la instalación PWA. Esas
funciones deben consumir las mismas acciones y selectors para conservar estas
invariantes.
