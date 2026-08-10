# LUCTIV: Maintenance APP

Aplicación Angular para visualizar el spread de bombas, registrar eventos
operativos y coordinar mantenimiento PE/IEM durante operaciones de fractura.

## Estado inicial

Este repositorio es el nuevo punto de partida. No continúa la implementación
React/Vite anterior: la reescritura productiva se realiza con Angular y
TypeScript. El snapshot de la última versión anterior se conserva únicamente
como referencia cerrada dentro de `handoff/reference/`.

La base funcional ya incluye:

- Angular standalone con TypeScript estricto.
- Identidad `LUCTIV: Maintenance APP`.
- Contexto PAD, pozo y etapa con layouts independientes por SET.
- Layout inicial de circuitos LIMPIO y SUCIO.
- Bombas operativas, offline y de reserva.
- Flujo correlacionado caída → reserva → decisión → reemplazo → MTTO.
- Historial inmutable con PAD, pozo, etapa, SET y marcas de tiempo.
- Persistencia versionada y validada mediante `localStorage`.
- Migración automática del estado Angular v1 al schema v2.
- Exportación e importación del estado completo como backup JSON.
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
