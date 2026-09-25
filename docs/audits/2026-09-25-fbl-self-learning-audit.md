# Auditoría FBL — autoaprendizaje, automejora y hallazgo Kiro (2026-09-25)

Harness: Claude Code 2.1.282 · Modo: solo lectura (política de mínima intervención) · Único cambio: este archivo + nota en el handoff del vault.
Revisión 2 (mismo día): incorpora el log de la última iteración de Codex y reorganiza el reporte alrededor de las decisiones de instalación por CLI.

## 0. Decisión por CLI (lo primero que hay que resolver)

El log de Codex y esta auditoría coinciden en el diagnóstico: **FBL no está instalado globalmente en ningún CLI**. Solo actúa por contexto cuando se abre el propio workspace (`AGENTS.md`, `CLAUDE.md`, `.opencode/`). Verificado: `claude plugin list` muestra solo `superpowers` y plugins sincronizados; `opencode.jsonc` solo carga `superpowers`; `codex plugin list` no lo incluye.

Las recomendaciones de Codex se contrastaron con lo que ya existe en cada CLI:

| CLI | Propuesta de Codex | Qué ya tiene hoy | Qué agregaría el plugin FBL | Veredicto |
|---|---|---|---|---|
| Claude | `marketplace add` + `install frankenbrain-lite` | superpowers 6.3.0 (las 5 skills de flujo) + using-dev + 31/38 skills FBL copiadas + hooks de vault/handoff | 31 skills duplicadas y 5 que chocan con las de superpowers, 19 comandos duplicados, **14 agentes que la poda del 25-ago retiró** (cpp, go, rust, php, kotlin, python, database…), la skill retirada `cost-aware-llm-pipeline` y un 4.º bootstrap de SessionStart con el contexto inicial ya truncado (H3) | **No instalar tal cual.** Viable solo si antes FBL se alinea con la poda (H11) |
| OpenCode | agregar `file://…/.opencode/plugins/frankenbrain.js` | superpowers (plugin) + 30/38 skills copiadas + 27 agentes | Lee `skills/` del repo en vivo (termina el drift de copias, H5) + bootstrap de ~1.4 k caracteres | **Viable y reversible** (una línea). Probar en sesión nueva: posibles choques de nombres con las copias en `~/.config/opencode/skills` y con superpowers |
| Codex | ninguna todavía: falta catálogo de marketplace; no inventar comando | ECC memory por `config.toml`; superpowers `openai-curated`; 8/38 skills FBL | Las 38 skills en cualquier repo | **De acuerdo con Codex.** Es la vía correcta para H1, mejor que un bloque de copia en `harvest.sh`. Requiere crear el catálogo |
| Gemini | — | CLI no instalado | — | Sin acción |

**Variables `FRANKENBRAIN_VAULT_ROOT` / `ECC_MEMORY_*` en Claude:** solo las lee el bootstrap del plugin FBL y el MCP `ecc-memory-vault`. Claude no tiene ninguno de los dos, así que exportarlas hoy no cambia nada. Claude ya llega al vault por archivos y por los hooks `handoff-timer`/`handoff-guard`.



## A. Estado actual

**Salud general: operativa, con 1 brecha alta de propagación y 2 desalineaciones doc↔realidad.**

| Verificación | Resultado | Evidencia |
|---|---|---|
| Gates FBL | PASS | `make check` exit 0: security, validate, 5 suites (security-gate, workflow-integration, opencode-plugin, session-bootstrap, plugin-loaders). `git status` idéntico antes/después |
| Vault compartido | PASS | `ecc memory doctor --scope user`: 42 memorias, 0 inválidas/duplicadas/rotas |
| Parche nested-scope | PASS | `nested_scope_test.js` 4/4 |
| Captura de observaciones | Activa | `observations.jsonl` recibe eventos de esta sesión (16:39Z) |
| Análisis automático (observer) | Apagado | `config.json` `observer.enabled:false` (desde seed 03-sep); último `observer.log` 17-sep 10:03 |

### Mecanismos identificados (Claude Code)

| Mecanismo | Dónde vive | Activo | Usado | Mantenimiento |
|---|---|---|---|---|
| Captura de uso de herramientas | `~/.claude/settings.json` PreToolUse/PostToolUse → `continuous-learning-v2/hooks/observe.sh` | Sí | Sí | No |
| Instincts → contexto | `ecc-universal/scripts/hooks/session-start.js` (umbral 0.6, máx 30) | Sí | Sí | Sí (ver H3) |
| Generación de instincts por observer | `continuous-learning-v2/agents/observer-loop.sh` | No (config) | No desde 17-sep | Decisión (H2) |
| Evolución de instincts (`/evolve`) | `commands/evolve.md`, `homunculus/evolved/` | Manual | No: `evolved/` tiene 3 carpetas vacías | Informativo |
| Bootstrap de metodología | plugin `superpowers@superpowers-marketplace` 6.3.0 (SessionStart) | Sí | Sí | No |
| Triage/routing | `~/.claude/skills/using-dev` (SessionStart, manifiesto `.claude-plugin`) | Sí | Sí | Doc (H2, H4) |
| Continuidad entre sesiones | `handoff-timer.py` (PostToolUse), `handoff-guard.py` (Stop), `handoffs-index` | Sí | Sí (disparó en esta sesión) | No |
| Puerta de calidad al cerrar | `quality-gate.py` + hooks Stop de ECC | Sí | Sí | No |
| Memoria del harness | auto-memory `~/.claude/projects/*/memory` | Sí | Sí | No |
| Memoria compartida (MCP) | `ecc-memory-vault` | Solo Codex/Kiro | No en Claude | Informativo (H10) |
| Tope de contexto inicial | `ECC_SESSION_START_MAX_CHARS` (8000 por defecto) | Sí | Sí | Sí (H3) |
| Grafo del repo | `graphify-out/` (commit 1f3058c = HEAD) | Sí | Sí | Tras commit (H7) |

## B. Hallazgos

| # | Nivel | Hallazgo | Evidencia | Impacto / probabilidad | Recomendación |
|---|---|---|---|---|---|
| H1 | **Alto** | La propagación a Codex documentada como "31/31 tras bloque SRC_CODEX" no existe | `scripts/harvest.sh` solo trae contenido al repo y espeja `.kiro/skills`; `git log -S SRC_CODEX` vacío; `~/.codex/skills` sin cambios desde 10-sep; Codex ve 8/38 skills FBL (`~/.codex/skills` ∪ `~/.agents/skills`) | Codex trabaja sin 30 skills ECC; ya ocurre (medido) | Vía preferida (coincide con Codex): catálogo de marketplace personal + instalar el plugin Codex (`.codex-plugin/` ya existe). Corregir el instinct `harness-wiring-not-enough...` |
| H2 | Medio | `using-dev` afirma "background observer already always-on"; está apagado | config + logs arriba | Se asume aprendizaje automático que no ocurre; los instincts nuevos (25-sep) vienen de otras rutas | Opción de menor riesgo: corregir el texto. Encender el observer consume tokens Haiku: decisión del usuario |
| H3 | Medio | Los 30 instincts inyectados llenan el tope de 8000 chars y truncan el resumen de sesión | Inicio de esta sesión: `[SessionStart truncated context...]` cortó `ECC:SUMMARY`; duplicados inyectados: AWS_PROFILE ×2, `--region` ×2, secciones `echo` ×3, exploración bash ×2 | Pérdida de contexto al reanudar; ocurre en cada sesión | Bajar `ECC_MAX_INJECTED_INSTINCTS` (p. ej. 15) o consolidar duplicados con `/prune`//`/evolve` |
| H4 | Bajo | Conteos desalineados | README "36 skills" vs 38 reales (faltan en catálogo: graphify, using-dev, superapp-dashboard-style/-storytelling); using-dev "pruned to nine" vs 12 agentes live | Confusión, sin efecto funcional | Corregir texto cuando se commitee el WIP actual |
| H5 | Bajo | Drift entre repo y dirs live | Claude sin `cloud-cli-operations` (la ausencia de `cost-aware-llm-pipeline` es **intencional**: la retiró la poda del 25-ago); OpenCode sin `continuous-learning-v2`, `eval-harness`, `unified-memory`; 6 SKILL.md difieren FBL↔`~/.claude` (graphify, rules-distill, search-first, skill-scout, unified-memory, using-dev) | Dirección del cambio desconocida: no sobrescribir | Revisar cada diff antes de cualquier harvest |
| H11 | **Medio** | La poda del 25-ago ("aplicado", "25 → 9 agentes en cada harness") no está vigente en OpenCode ni en FBL | `~/.config/opencode/agent`: 27 agentes, incluidos los retirados (fechas 13-ago, anteriores a la poda); `cost-aware-llm-pipeline` reapareció el 17-sep. `harvest.sh` toma OpenCode como fuente, así que FBL hereda 26 agentes y la skill retirada | Cualquier instalación del plugin FBL revierte la poda en ese CLI (~2.3 k tokens por sesión de coste fijo, según la propia decisión) | Decidir si la poda sigue vigente: si sí, alinear OpenCode y FBL antes de instalar el plugin; si no, actualizar la decisión en el vault |
| H6 | Bajo | Carpetas anidadas espurias versionadas | `skills/.kiro/steering/*` y `.kiro/skills/.kiro/steering/*` (`cp -rn skills/./` copia también ocultos) | Ruido; riesgo de espejo recursivo | Borrar ambas y excluir ocultos en el mirror (con OK) |
| H7 | Info | Grafo no incluye el WIP sin commitear | 31 rutas modificadas/no trackeadas (hooks/, test/, .codex-plugin/...) | Consultas graphify incompletas | `graphify update .` tras commitear |
| H8 | Info | `/evolve` nunca produjo artefactos | `evolved/{agents,commands,skills}` vacíos | — | Ninguna |
| H9 | Info | Memoria de proyecto con afirmaciones no verificables | `session-2026-09-22-complete.md`: "Chrome 90+/Safari 14+ confirmado", "load ~50ms" sin evidencia | Sobreconfianza al recuperar | Marcar `trust: unreviewed` o recortar |
| H10 | Info | MCP `ecc-memory-vault` no está en Claude Code | `~/.claude.json` solo `superapp-context`; Codex sí lo tiene | Claude accede al vault por archivos + hooks: funciona | Ninguna salvo que se quiera paridad |

**Funciona y no se toca:** captura de observaciones, inyección de instincts, bootstrap superpowers, using-dev, handoff-timer/guard, quality-gate, block-no-verify, doctor del vault, parche nested-scope, gates de FBL, auto-memory.

**Ya estaba resuelto:** metodología Superpowers en Claude Code; las 5 skills de flujo en FBL (idénticas a FBK por `cmp`); walker nested-scope.

**Documentado pero ausente:** bloque de propagación a Codex (H1); observer "always-on" (H2); Nivel 1 de Kiro (hook UserPromptSubmit) — sigue siendo una decisión pendiente, no implementado en ningún harness.

**Implementado pero no documentado en FBL:** carga de `using-dev` como plugin desde `~/.claude/skills/using-dev/.claude-plugin`; hooks `handoff-timer`/`handoff-guard`/`quality-gate` (viven en `~/.claude/scripts`, fuera del repo).

## C. Comparación con Kiro

- **Hallazgo original** (`FrankenBrain-Kiro/.ecc/memory/project`, cadena `cb9960 → 9ba65b → c67ed5 (PIN) → 9b460f RESUELTO → ad3609 PENDIENTE`): el harvest tomó la infraestructura de ECC pero no la metodología de Superpowers (skills de flujo + bootstrap que las vuelve obligatorias). Resultado: entorno semiautónomo.
- **Estado en Claude Code:** no heredado en la práctica. La metodología llega por el plugin oficial `superpowers` 6.3.0 (brainstorming, writing-plans, TDD, systematic-debugging, verification, etc.) inyectado en SessionStart, más `using-dev`. Verificado en esta sesión (bootstrap presente en el contexto inicial).
- **Estado en FBL:** la propagación pedida en `ad3609` está hecha: 5 skills idénticas a FBK, `rules/common/superpowers-workflow.md`, `hooks/session-start`, manifiestos; `make check` PASS. Sin commitear (rama `feat/superpowers-workflow-memory-bootstrap`, handoff Codex).
- **Regresión:** no en la metodología. Sí en el patrón hermano "wiring ≠ propagación": la corrección de Codex que el instinct da por hecha no está en el código (H1).
- **Límite vigente (lección `e7b9ec`):** el flujo obligatorio es probabilístico en todos los harnesses; el Nivel 1 sigue sin decidir.

## D. Acciones recomendadas (menor riesgo e invasividad primero)

1. Corregir textos desalineados (H2 texto, H4) al commitear el WIP de Codex — solo documentación.
2. Corregir el instinct de Codex que afirma 31/31 (H1) — solo memoria.
3. `graphify update .` después del commit (H7) — solo índice local.
4. Reducir `ECC_MAX_INJECTED_INSTINCTS` o consolidar duplicados (H3) — config reversible; conviene hacerlo **antes** de sumar cualquier bootstrap.
5. Decidir si la poda sigue vigente (H11). Si sí: retirar de FBL los 14 agentes y la skill podados (y de OpenCode). Es condición previa para instalar FBL en cualquier CLI.
6. OpenCode: agregar el plugin FBL y probarlo en una sesión nueva (reversible, una línea).
7. Codex: crear el catálogo de marketplace personal e instalar FBL (resuelve H1).
8. Claude: no instalar FBL mientras superpowers + using-dev + las copias cubran lo mismo; reevaluar después del paso 5.
9. Borrar las carpetas `.kiro` anidadas y excluir ocultos del mirror (H6).
10. Decidir si se enciende el observer (H2) — tiene costo en tokens.

## Revisión 3 — decisiones del usuario (2026-09-25, tarde)

- **H11 descartado:** OpenCode conserva su roster completo (26 + `self-healer`); Claude sigue con 12. La prueba de poda en OpenCode se revirtió por completo y se verificó (27/27 agentes cargan). La poda del 25-ago rige solo para Claude, salvo `cost-aware-llm-pipeline`, que vuelve a todos los harnesses.
- **Corrección:** `continuous-learning-v2`, `eval-harness` y `unified-memory` **no** estaban excluidas de OpenCode. Una sesión de OpenCode del 23-sep eliminó copias duplicadas; OpenCode las carga desde `~/.agents/skills` y `~/.claude/skills` (verificado con `opencode debug skill`).
- **Arreglado:** `~/.codex/agents/self-healer.toml` no tenía `name`/`description` y Codex lo ignoraba. Se agregaron (respaldo en `~/.codex/_backups/`).
- **Hallazgo nuevo:** Codex no escribe observaciones (claude 762, opencode 159, codex 0).
- **Siguiente paso:** el diseño del plugin global único para los tres harnesses está en `docs/superpowers/specs/2026-09-25-frankenbrain-global-plugin-design.md`; reemplaza las acciones D.5–D.8 de este reporte.
