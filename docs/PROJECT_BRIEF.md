# Project brief — LUCTIV: Maintenance APP

## Objetivo

Crear una aplicación de campo para visualizar y gestionar el spread de bombas
durante fractura hidráulica, registrar indisponibilidades y coordinar el
mantenimiento entre etapas.

## Identidad

- Nombre visible: `LUCTIV: Maintenance APP`
- Autor: Lucas Vuletin
- Crédito: `Desarrollado por Lucas Vuletin`
- Idioma operativo: español
- Framework: Angular
- Lenguaje: TypeScript

Angular es el framework de la aplicación; TypeScript es el lenguaje nativo del
código.

## Fuente autorizada

La migración parte exclusivamente del estado más reciente de la carpeta de
trabajo React validada el 5 de agosto de 2026. No se deben reconstruir decisiones
desde conversaciones previas ni desde commits antiguos. El detalle verificable
está en `SOURCE_OF_TRUTH.md`.

## Capacidades heredadas que se deben reimplementar

1. Layout operativo de bombas por manifold, lado y posición.
2. Circuitos LIMPIO y SUCIO.
3. Estados operativa/no operativa y movimientos Entra/Sale/MTTO.
4. Registro de PAD, pozo, etapa y SET.
5. Banco de bombas fuera del SET.
6. Alta y edición de bombas y manifolds.
7. Planificación de mantenimiento PE e IEM entre etapas.
8. Historial y tiempos de planes entre etapas.
9. Alertas acumulables cuando una bomba queda OFFLINE.
10. Recomendación de reemplazo y registro de la decisión.
11. Captura PNG del layout.
12. Exportación Excel de configuración, mantenimiento, historial y alertas.
13. Persistencia local para trabajo de campo.
14. Instalación PWA y operación offline/kiosco.

## Base Angular ya implementada

- Dashboard responsive con identidad definitiva.
- Contexto PAD/pozo/etapa y selector de SET.
- Modelos de dominio tipados.
- Store basado en signals e injectable service.
- Persistencia versionada en `localStorage`.
- Manifolds LIMPIO y SUCIO con bombas y banco de reserva.
- Simulación de una caída operativa.
- Generación automática de alerta, recomendación y tarea PE/IEM.
- Cierre visual de tareas.
- Exportación JSON del snapshot actual.

## Backlog de migración

### P0 — Paridad operativa

- Migrar el catálogo real de bombas y manifolds del snapshot.
- Crear formularios completos de alta/edición.
- Permitir movimientos de bombas entre slots y reserva.
- Implementar reglas de validación de posiciones, conexión y señal.
- Reimplementar el plan PE/IEM editable y su historial.

### P1 — Entregables de campo

- Exportación Excel con todas las hojas de la última versión.
- Captura PNG del layout y encabezado de etapa.
- PWA con manifest, service worker y estrategia offline.
- Flujo de recuperación/backup del estado local.

### P2 — Calidad y despliegue

- Pruebas unitarias de store y reglas de dominio.
- Pruebas de interacción para caída, reemplazo y cierre de tarea.
- Pipeline de GitHub Actions.
- Despliegue de preview y producción.
- Matriz de validación en tablet/desktop/kiosco.

## Decisiones pendientes

- Visibilidad final del repositorio y política de colaboradores.
- Destino de despliegue productivo.
- Fuente futura de datos: sólo local, archivo importado o backend.
- Autenticación y perfiles de usuario.
- Requisitos de auditoría y retención de eventos.
- Equipos/resoluciones de campo que deben soportarse.

## Definición de terminado para una función

- Implementada en Angular/TypeScript sin dependencias React.
- Persistencia y migración de datos definidas.
- Estados vacío, normal y error cubiertos.
- Interfaz usable en escritorio y tablet.
- `npm run build` exitoso.
- Pruebas relevantes agregadas o una justificación registrada.
- Documentación actualizada.
