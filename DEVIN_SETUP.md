# Configuración de Devin

## Repositorio

Repositorio nuevo previsto:

`https://github.com/LucasVuletin/LUCTIV-Maintenance-APP`

No usar el repositorio legado como repositorio de trabajo. Su enlace se conserva
en `docs/SOURCE_OF_TRUTH.md`.

## Integración de GitHub

1. Abrir `app.devin.ai`.
2. Ir a **Settings → Integrations → GitHub**.
3. Elegir **Add Connection**.
4. Autorizar la cuenta `LucasVuletin`.
5. Dar acceso sólo a `LUCTIV-Maintenance-APP`.
6. En **Devin's Machine**, elegir **Add repository** y seleccionar el repo.

## Repo Setup

Usar estos valores en el asistente de configuración.

### Git Pull

Mantener el comando sugerido por Devin para la rama por defecto `main`.

### Configure Secrets

Ninguno para la base local. Cualquier secreto futuro debe configurarse en el
gestor de secretos de Devin; nunca debe subirse al repositorio.

### Install Dependencies

```bash
npm ci
```

### Maintain Dependencies

```bash
npm ci
```

### Lint / compile check

```bash
npm run build
```

### Tests

```bash
npm test -- --watch=false
```

### Run Local App

```bash
npm start -- --host 0.0.0.0
```

La aplicación escucha en el puerto `4200`.

### Additional Notes

```text
Read AGENTS.md, docs/PROJECT_BRIEF.md and docs/SOURCE_OF_TRUTH.md before
changing code. This is an Angular/TypeScript rewrite. Do not add React or port
legacy components verbatim. The archive under handoff/reference is read-only
and represents the only accepted legacy snapshot. Run npm run build after
material changes. Keep UI terminology in Spanish.
```

## Escritorio y nube

- Escritorio: clonar el mismo repo y trabajar en una rama.
- Nube: agregar el repo a Devin's Machine y dejar que cada sesión cree su rama.
- Ambos entornos deben hacer pull antes de empezar y push antes de transferir el
  trabajo al otro.
- No copiar carpetas manualmente entre equipos; GitHub es el punto de
  sincronización.
