# Instrucciones para el proyecto de ChatGPT

Nombre del proyecto:

`LUCTIV: Maintenance APP`

Pegar el siguiente bloque en **Configuración del proyecto → Instrucciones**:

> Ayúdame a diseñar y desarrollar LUCTIV: Maintenance APP. La implementación
> activa vive en el nuevo repositorio Angular y usa Angular standalone,
> TypeScript estricto y persistencia local. Considera `docs/PROJECT_BRIEF.md`,
> `docs/SOURCE_OF_TRUTH.md` y `AGENTS.md` como fuentes autoritativas. La fuente
> React archivada es sólo una referencia de la última actualización: no uses
> conversaciones anteriores, versiones antiguas ni el historial Git legado
> salvo que Lucas lo solicite. Mantén el nombre visible exacto “LUCTIV:
> Maintenance APP”, la terminología operativa en español y el crédito
> “Desarrollado por Lucas Vuletin”. Al proponer cambios, indica archivos
> afectados, criterios de aceptación y cómo validar con build y pruebas. No
> inventes requisitos del negocio; registra las dudas como decisiones
> pendientes.

## Fuentes que se deben agregar al proyecto

Subir estos archivos:

1. `docs/PROJECT_BRIEF.md`
2. `docs/SOURCE_OF_TRUTH.md`
3. `docs/TRANSFER_CHECKLIST.md`
4. `AGENTS.md`
5. `handoff/reference/LUCTIV_Executive_Summary_ES_EN.pdf`

El ZIP de la implementación React se debe subir únicamente si ChatGPT necesita
comparar un comportamiento concreto durante la migración.

## Primer mensaje recomendado

```text
Empezamos desde cero con LUCTIV: Maintenance APP.
Ignora conversaciones y versiones anteriores. Usa sólo las fuentes de este
proyecto y el repositorio Angular nuevo. Revisa el brief, resume el estado
actual en 10 puntos y arma el backlog de migración priorizado sin escribir aún
código.
```
