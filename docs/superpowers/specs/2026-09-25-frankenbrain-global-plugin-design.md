# FrankenBrain-Lite como plugin global único — diseño

Fecha: 2026-09-25 · Estado: aprobado por secciones en brainstorming · Ruta: arquitectónica
Contexto: `docs/audits/2026-09-25-fbl-self-learning-audit.md` (auditoría y revisiones 2–3).

## 1. Objetivo

FrankenBrain-Lite (FBL) debe estar activo en **toda** sesión de Claude Code, OpenCode y Codex, **desde cualquier directorio**, instalado como plugin nativo de cada harness. Abrir el repo FBL como workspace deja de ser un requisito.

### Criterios de éxito

1. Una sesión nueva en cualquiera de los tres harnesses, abierta desde un directorio ajeno a FBL, recibe el texto de arranque FBL y ve las 32 skills del plugin FBL más las 14 de superpowers (las 5 de flujo llegan solo por superpowers; `using-dev` pasa al texto de arranque).
2. Agentes por harness: Claude 12, OpenCode 27, Codex 27.
3. Ninguna skill, agente o comando de FBL existe dos veces en un harness (cero copias sueltas duplicadas).
4. Editar el repo y correr `make update` basta para que los tres harnesses vean el cambio en su siguiente sesión.
5. Los tres harnesses escriben observaciones en el almacén compartido y hay un analizador activo con el modelo acordado por harness.
6. `make verify-install` pasa y `make check` pasa.
7. `make uninstall` deja cada harness como estaba antes de la migración.

## 2. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D1 | **FBL es la fuente única.** Las copias sueltas que FBL ya trae se mueven a `_disabled/<fecha>/` en cada harness | Termina el drift (Codex 8/38; 6 SKILL.md divergentes) |
| D2 | **Superpowers se queda como plugin aparte** en los tres harnesses | Metodología oficial, más completa y actualizada |
| D3 | **Agentes por harness:** Claude 12 (poda del 25-ago); OpenCode y Codex 26 + `self-healer` | Decisión del usuario del 25-sep |
| D4 | **Sin exclusiones por harness:** las 32 skills del plugin van a los tres harnesses por igual; `cost-aware-llm-pipeline` vuelve a Claude | Decisión del usuario; las "exclusiones" de OpenCode eran dedupes |
| D5 | **Opción C:** skills neutrales + adaptador por harness | La más sostenible (ver §4) |
| D6 | **Flujo FrankenBrain de 8 pasos:** Superpowers 1–6 + ECC recordar/mejorar | Combina lo mejor de ambos |
| D7 | **Las 5 skills de flujo condensadas salen de FBL** (`skills/`); su fuente para Kiro sigue siendo el repo FrankenBrain-Kiro | Duplican superpowers en los tres harnesses; Kiro no tiene superpowers y ya las tiene en su propio repo |
| D8 | **Observer encendido en los tres harnesses:** Claude `haiku`, Codex `gpt-5.6-luna`, OpenCode modelo activo de la sesión | Decisión del usuario: el más barato de cada entorno |
| D9 | **`harvest.sh` se retira** como mecanismo de sincronización hacia el repo | Con fuente única, importar desde los harnesses reintroduce copias viejas |

Fuera de alcance: Gemini (no instalado), la superficie `.kiro/` de FBL (regla del proyecto Kiro), el roster de agentes de Claude más allá de D3, publicar o pushear el repo.

## 3. Evidencia de las pruebas de factibilidad

| Prueba | Resultado |
|---|---|
| OpenCode: un plugin registra agentes y comandos vía hook `config` | Confirmado: `zz-spike-agent` en `opencode agent list`; `zz-spike-cmd` en `opencode debug config` |
| Codex: catálogo local | `.agents/plugins/marketplace.json` con `source: local, path: ./`; `codex plugin marketplace add` + `codex plugin add` funcionan en `CODEX_HOME` temporal |
| Codex: actualización | Copia en caché `plugins/cache/<mkt>/<plugin>/<versión>`; repetir `codex plugin add` la refresca aun con la misma versión |
| Codex: agentes en plugin | No soportados (el manifiesto admite `skills`, `hooks`, `mcpServers`) |
| Codex: eventos de hook | El binario 0.154.0 contiene `PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `UserPromptSubmit` (soporte real a confirmar en sesión viva) |
| Claude: instalación | Local marketplace + `plugin install` en `CLAUDE_CONFIG_DIR` temporal; valida |
| Claude: inventario | Skills 62 (38 + 24 comandos); agentes sin filtro 26; costo fijo ~3,500 tok (sin agentes) / ~4,400 (26) |
| Claude: filtrar agentes | `"agents": "./dir/"` → validación falla; lista de archivos → valida pero carga 0. Única opción confiable: `"agents": []` |
| Claude: actualización | Copia en caché; `claude plugin marketplace update` + `claude plugin update` + reiniciar |
| Aprendizaje | Observaciones de los últimos 7 días: claude 762, opencode 159, **codex 0** |

## 4. Variantes por harness: opción C

12 de las 38 skills actuales mencionan rutas de un harness (`using-dev`, `search-first`, `skill-scout`, `rules-distill`, `delivery-gate`, `safety-guard`, `blueprint`, `config-gc`, `knowledge-ops`, `cloud-cli-operations`, `continuous-learning-v2`, `superapp-dashboard-storytelling`).

- Las skills se reescriben sin rutas fijas: remiten a "los datos del harness".
- Los datos del harness (directorios de skills, agentes, comandos, memoria; nombre del harness; modelo del analizador) viven en **un solo lugar por harness**: el adaptador, que los inyecta al arrancar.
- `using-dev` deja de ser una skill (tenía tres versiones): se retira de `skills/` y su contenido pasa al texto de arranque generado por el adaptador.

Frente a "texto neutral con todas las rutas" (A) y "una copia por harness" (B), C es la única en que un harness nuevo no obliga a editar skills, cada harness recibe solo sus datos y las rutas se cargan una vez por sesión.

## 5. Arquitectura

```
FrankenBrain-Lite (repo = única fuente, versionada)
├── skills/                 32 skills neutrales (38 actuales − 5 de flujo por D7 − `using-dev`, que pasa al arranque)
├── agents/                 27 agentes .md (26 + self-healer)
├── commands/               comandos (+ learn-eval de ECC)
├── rules/common/           frankenbrain-workflow.md (8 pasos) + persistent-memory.md
├── harness/                datos por harness (tabla de rutas, lista de agentes, modelo del analizador)
├── hooks/                  session-start (Claude/Codex) + captura de observaciones (Codex)
├── .claude-plugin/         manifiesto Claude ("agents": [])
├── .codex-plugin/          manifiesto Codex
├── .agents/plugins/        catálogo de marketplace Codex
├── .opencode/plugins/      adaptador OpenCode (skills + agentes + comandos + arranque)
└── scripts/                install / update / uninstall / verify-install / gen-agents
```

| Harness | Skills y comandos | Agentes | Arranque | Actualización |
|---|---|---|---|---|
| Claude | Plugin (caché) | Script copia los 12 de `harness/claude-agents.txt` a `~/.claude/agents` | `hooks/session-start` | `make update` → `plugin update` + sesión nueva |
| OpenCode | Plugin `file://` lee el repo en vivo | Plugin registra los 27 vía hook `config` | Adaptador JS | Ninguna (lectura en vivo) + sesión nueva |
| Codex | Plugin (caché) | Script genera 27 `.toml` en `~/.codex/agents` | `hooks/session-start` | `make update` → `plugin add` + sesión nueva |

Los agentes generados por script llevan una marca de origen (comentario/cabecera) para que `verify-install` distinga los gestionados por FBL de los propios del usuario.

## 6. Flujo FrankenBrain (texto de arranque)

| # | Paso | Aporta | Mecanismo |
|---|---|---|---|
| 1 | Pensar y diseñar | Superpowers | `brainstorming` |
| 2 | Planear | Superpowers | `writing-plans` |
| 3 | Probar primero | Superpowers | `test-driven-development` |
| 4 | Implementar | Superpowers | `subagent-driven-development` / `executing-plans`; `systematic-debugging` ante fallos |
| 5 | Revisar | Superpowers + ECC | `requesting-code-review` + agentes `code-reviewer`, `security-reviewer`, `java-reviewer` |
| 6 | Verificar | Superpowers | `verification-before-completion` |
| 7 | Recordar | ECC | handoff del vault + `save-session`; lecciones con `growth-log` / `unified-memory` |
| 8 | Mejorar | ECC | `/learn-eval` → instincts (`continuous-learning-v2`); periódicamente `/evolve`, `/prune`, `/promote`, `rules-distill`, `agent-self-evaluation` |

La ceremonia escala con la tarea: preguntas y análisis de solo lectura no pasan por 1–3; 7–8 se aplican tras trabajo real o corregido.

Contenido del texto de arranque, en orden y con tope de 6,000 caracteres: (1) flujo de 8 pasos, (2) datos del harness, (3) estado de la memoria, (4) instincts sin duplicados hasta completar el tope. Corrige H3 (30 instincts con duplicados truncaban el resumen de sesión).

## 7. Aprendizaje continuo

| Pieza | Claude | OpenCode | Codex |
|---|---|---|---|
| Captura | `observe.sh` (existe) | `ecc-learning.ts` (existe) | **Nuevo** hook `PostToolUse` del plugin con `harness=codex` |
| Analizador | Segundo plano, `claude --model haiku --print` | En sesión, modelo activo (idle-evolve de `ecc-learning.ts`) | Segundo plano, `codex exec -m gpt-5.6-luna` |
| Instincts al arrancar | Hook ECC (existe) | `ecc-learning.ts` (existe) | **Nuevo**, vía adaptador FBL |

- Almacén compartido: `~/.local/share/ecc-homunculus`.
- **Un solo analizador a la vez** (lock en el almacén); sin él, los harnesses duplicarían instincts.
- Modelo por harness en `continuous-learning-v2/config.json` (`observer.models`): `claude: haiku`, `codex: gpt-5.6-luna`, `opencode: session`. `observer.enabled: true`.
- Se conservan los controles existentes: mínimo 20 observaciones, intervalo 5 min, salida sin sesiones activas, `ECC_SKIP_OBSERVE=1` en el analizador.

## 8. Manejo de errores

Nada bloquea una sesión.

| Falla | Comportamiento |
|---|---|
| Vault no disponible | Una línea de aviso y continúa |
| CLI del analizador ausente | Log y se omite el ciclo |
| Modelo inaccesible | Registro de fallos; 2 seguidos → se detiene y avisa |
| Archivo del plugin ausente | Aviso en el arranque; continúa sin esa parte |
| Conflicto de nombre con copia suelta | `verify-install` lo reporta como fallo |

## 9. Migración (orden)

1. Implementar en el repo con TDD: opción C, `harness/`, adaptadores, catálogo Codex, scripts, `learn-eval`, cambios del observer. `make check` verde.
2. **OpenCode primero** (hoy lee skills de `~/.claude/skills`): instalar y `verify-install --harness opencode`.
3. **Claude:** instalar, verificar; después mover a `_disabled/<fecha>/` las copias sueltas de skills, comandos y `using-dev` en Claude, OpenCode y `~/.agents/skills`; volver a verificar ambos.
4. **Codex:** instalar, generar agentes, verificar; confirmar en sesión viva que no aparece la advertencia de `self-healer` y que se escriben observaciones.
5. Revisar la regla `skill-revived` de `self-healer` contra el nuevo modelo (el plugin no deja copias en directorios de skills).
6. Encender el observer y medir el costo real por sesión y por día; registrar en el vault.

Reversión: `make uninstall` quita los plugins, restaura `_disabled/<fecha>/` y elimina solo los agentes con marca FBL.

## 10. Pruebas

- `test-session-bootstrap`: texto correcto por harness, tope de tamaño, deduplicación de instincts.
- `test-plugin-loaders`: Claude valida con `agents: []`; OpenCode registra 27 agentes y los comandos en directorio temporal; Codex instala desde el catálogo en `CODEX_HOME` temporal.
- Nuevo `test-observer-backend`: en simulación elige CLI y modelo por harness y respeta el lock.
- Nuevo `test-skill-neutrality`: ninguna skill del plugin contiene rutas `~/.claude`, `~/.config/opencode` o `~/.codex`.
- `make verify-install`: conteos reales por harness tras instalar.
- Verificación manual única: sesión nueva en cada harness desde un directorio ajeno.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| Codex no soporta `PostToolUse` en la práctica | Verificación en sesión viva en el paso 4; si falla, captura vía `Stop` con resumen de sesión |
| Nombres con prefijo en Claude (`frankenbrain-lite:x`) rompen referencias a nombres sin prefijo | `test-skill-neutrality` + revisión de referencias cruzadas entre skills |
| Costo del observer | Medición en el paso 6; el modelo es configurable por harness |
| Skills de `.kiro/` divergen del repo | Fuera de alcance; se documenta |
