# Checklist de transferencia

## 1. GitHub

- [x] Iniciar sesión en GitHub.
- [x] Crear un repositorio privado llamado `LUCTIV-Maintenance-APP`.
- [x] No agregar README, `.gitignore` ni licencia desde GitHub.
- [x] Inicializar Git en esta carpeta con rama `main`.
- [x] Confirmar todos los archivos del proyecto nuevo.
- [x] Agregar el remoto:

```bash
git remote add origin https://github.com/LucasVuletin/LUCTIV-Maintenance-APP.git
```

- [x] Publicar:

```bash
git push -u origin main
```

## 2. Codex Desktop

- [x] Elegir **Add/Open project**.
- [x] Abrir la carpeta del repositorio `LUCTIV: Maintenance APP`.
- [x] Crear una tarea nueva titulada `LUCTIV: Maintenance APP`.
- [x] Usar este primer mensaje:

```text
Trabaja sólo en el nuevo proyecto Angular LUCTIV: Maintenance APP.
Lee AGENTS.md, docs/PROJECT_BRIEF.md y docs/SOURCE_OF_TRUTH.md.
Ignora el historial y las conversaciones anteriores. Verifica el build y
propón el siguiente incremento P0.
```

## 3. ChatGPT

- [x] En la barra lateral, elegir **Nuevo proyecto**.
- [x] Nombrarlo `LUCTIV: Maintenance APP`.
- [x] Configurar memoria **Solo para el proyecto**.
- [x] Agregar las instrucciones de `CHATGPT_PROJECT_INSTRUCTIONS.md`.
- [x] Subir las cinco fuentes indicadas en ese archivo.
- [x] Iniciar un chat nuevo usando el mensaje recomendado.

## 4. Devin

- [ ] Conectar GitHub en **Settings → Integrations → GitHub**.
- [ ] Autorizar únicamente el repositorio nuevo.
- [ ] Agregarlo en **Devin's Machine**.
- [ ] Copiar los comandos y notas de `DEVIN_SETUP.md`.
- [ ] Ejecutar `npm ci`, `npm run build` y las pruebas.
- [ ] Guardar la configuración de la máquina.

## 5. Flujo entre desktop y nube

Antes de empezar:

```bash
git pull --rebase
```

Al terminar:

```bash
git status
git add <archivos>
git commit -m "Descripción concreta"
git push
```

Cada herramienta debe trabajar en su propia rama para cambios grandes. GitHub es
el único canal de transferencia; no mover carpetas manualmente.

## 6. Control de corte

La transferencia queda completa cuando:

- el repo nuevo abre desde su URL;
- Codex trabaja sobre la carpeta Angular;
- el proyecto ChatGPT contiene instrucciones y fuentes;
- Devin clona, instala y compila el repo;
- la rama `main` contiene el baseline validado;
- no se depende del repositorio React para ejecutar la aplicación.
