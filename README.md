# LUCTIV: Maintenance APP

Aplicación Angular para visualizar el spread de bombas, registrar eventos
operativos y coordinar mantenimiento PE/IEM durante operaciones de fractura.

## Version final PRIME

La implementacion productiva es la version Angular del flujo PRIME integrada en
este repositorio. El acceso local de referencia es
`http://127.0.0.1:4300/#operation` y se inicia con:

```powershell
npm.cmd run build
npm.cmd run preview:final
```

Esta version incluye el layout del spread, el resumen priorizado de bombas
caidas y alertas preventivas, el Plan STT y la trazabilidad historica. Las
alternativas de diseño o worktrees paralelos no son la fuente productiva.

## Base Angular

Este repositorio es el nuevo punto de partida. No continúa la implementación
React/Vite anterior: la reescritura productiva se realiza con Angular y
TypeScript. El snapshot de la última versión anterior se conserva únicamente
como referencia cerrada dentro de `handoff/reference/`.

La base funcional ya incluye:

- Angular standalone con TypeScript estricto.
- Identidad `LUCTIV: Maintenance APP`.
- Contexto PAD, pozo, etapa y SET.
- Layout inicial de circuitos LIMPIO y SUCIO.
- Bombas operativas, offline y de reserva.
- Simulación del flujo caída → alerta → recomendación → tarea.
- Plan de mantenimiento PE/IEM.
- Persistencia mediante `localStorage`.
- Exportación del estado actual como JSON.
- Diseño responsive para escritorio y tablet.

El alcance de migración completo está en
[`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md).

## Requisitos

- Node.js 20.19+, 22.12+ o 24+.
- npm 10+.

## Instalación

```bash
npm ci
```

En PowerShell con ejecución de scripts restringida:

```powershell
npm.cmd ci
```

## Desarrollo

```bash
npm start
```

En Windows:

```powershell
npm.cmd start
```

La aplicación se abre normalmente en `http://localhost:4200`.

Si la red corporativa de Windows bloquea el binario nativo opcional que usa
`ng serve`, utilizar el preview sin dependencias externas:

```powershell
npm.cmd run build
npm.cmd run preview
```

El preview queda disponible en `http://127.0.0.1:4200`.

## Verificación

```bash
npm run build
npm audit --omit=dev
```

En Windows:

```powershell
npm.cmd run build
npm.cmd audit --omit=dev
```

## Stack fijado

- Angular runtime `20.3.27`.
- Angular builder/CLI `20.1.6`.
- TypeScript `5.8`.
- RxJS `7.8`.

El runtime usa el último parche seguro disponible de Angular 20. Se mantiene el
builder 20.1.6 porque la red corporativa de Windows bloquea los binarios nativos
opcionales que requieren builders posteriores. Esta separación está permitida
por los peer dependencies de Angular y el build de producción fue validado.

## Documentación de transferencia

- `AGENTS.md`: reglas durables para Codex y Devin.
- `CHATGPT_PROJECT_INSTRUCTIONS.md`: instrucciones para el proyecto de ChatGPT.
- `DEVIN_SETUP.md`: configuración recomendada de Devin.
- `docs/SOURCE_OF_TRUTH.md`: origen exacto de la migración.
- `docs/TRANSFER_CHECKLIST.md`: secuencia entre todas las aplicaciones.
- `handoff/reference/`: snapshot inmutable y resumen ejecutivo anterior.
