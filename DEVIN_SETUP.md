# Configuración de Devin

## Repositorio

Repositorio activo y unica fuente productiva:

`https://github.com/LucasVuletin/LUCTIV-Maintenance-APP`

No usar el repositorio legado como repositorio de trabajo. Su enlace se conserva
en `docs/SOURCE_OF_TRUTH.md`.

La version oficial es la implementacion Angular PRIME publicada en `main`. No
usar como base las ramas `codex/correlated-maintenance-workflow` ni
`codex/version-3-parallel`; se conservan solo como referencias anteriores.

## Acceso a Devin Enterprise

El acceso corporativo y la integración de GitHub son pasos separados:

1. Iniciar sesión en el tenant de Halliburton con la identidad corporativa
   autorizada, preferentemente mediante SSO o Google con el correo laboral.
2. Si aparece `access_denied` indicando que la identidad no pertenece a la
   organización, pedir a un administrador de Devin Enterprise que invite el
   correo laboral o lo agregue al grupo IdP correspondiente.
3. Aceptar la invitación y volver a autenticarse.
4. Conectar la cuenta personal de GitHub únicamente después de entrar al tenant.

No usar la cuenta personal de GitHub como identidad de acceso al tenant
empresarial. Devin advierte que el correo personal de GitHub puede no coincidir
con el correo laboral registrado en la organización.

Referencias oficiales:

- `https://docs.devin.ai/enterprise/getting-started/get-started`
- `https://docs.devin.ai/enterprise/security-access/idp-groups`

## Integración de GitHub

1. Entrar al tenant empresarial de Halliburton.
2. Ir a **Settings → Integrations → GitHub**.
3. Elegir **Add Connection**.
4. Autorizar la cuenta `LucasVuletin`.
5. Dar acceso sólo a `LUCTIV-Maintenance-APP`.
6. En **Devin's Machine**, elegir **Add repository** y seleccionar el repo.

## Repo Setup

Usar estos valores en el asistente de configuración.

### Git Pull

Clonar o actualizar siempre la rama por defecto `main`:

```bash
git checkout main
git pull --ff-only origin main
```

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
npm run build
npm run preview:final
```

La aplicacion escucha en el puerto `4300`. La vista operativa que debe abrirse y
validarse es:

`http://127.0.0.1:4300/#operation`

En Devin Cloud, abrir el puerto reenviado `4300` y agregar `#operation` a la URL
que entregue Devin. La direccion `127.0.0.1` solo existe dentro de cada equipo o
sesion; el codigo y la vista son los mismos.

### Additional Notes

```text
Use main as the only production source. Open the Angular PRIME application at
port 4300 with the #operation fragment. Read AGENTS.md, docs/PROJECT_BRIEF.md
and docs/SOURCE_OF_TRUTH.md before changing code. Do not add React or port
legacy components verbatim. Do not replace main with the Codex V3 alternative.
The archive under handoff/reference is read-only. Run every required check from
AGENTS.md after material changes. Keep UI terminology in Spanish.
```

## Escritorio y nube

- Escritorio: el clon local está abierto y marcado como confiable en Devin
  Desktop con la sesión corporativa.
- Ruta verificada de la implementacion final en el equipo local:
  `C:\Users\H317042\OneDrive - Halliburton\Desktop\LUCTIV - Maintenance APP`.
- La fuente productiva es `origin/main`; cada sesion de trabajo debe partir de
  esa rama aunque luego cree una rama temporal para sus cambios.
- Nube: agregar el repo a Devin's Machine y dejar que cada sesión cree su rama.
- Ambos entornos deben hacer pull antes de empezar y push antes de transferir el
  trabajo al otro.
- No copiar carpetas manualmente entre equipos; GitHub es el punto de
  sincronización.
