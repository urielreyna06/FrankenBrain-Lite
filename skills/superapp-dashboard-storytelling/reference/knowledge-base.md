# Knowledge Base — Data Storytelling y Diseño Ejecutivo SuperApp Team

Ingeniería inversa de 8 dashboards y 3 informes de referencia (Comisión Saving, MAU Rolling LOB,
Dormant Users, Fanzone/Mas Polla, New Sign Ups, Share Comparison, Campaign Plan Prepago, Offer
Welcome + Exclusivos) más el paquete ejecutivo `SuperApp_Operations_Dashboard` y el
`INFORME_mantenimiento.md` de incidentes. Todo lo que sigue está anclado en evidencia real de esos
archivos — donde infiero una intención de diseño no explícita, lo marco como **[inferido]**.

---

## 1. Diseño ejecutivo general

**Layout observado (constante en los 8 dashboards):**
`header (marca + controles) → tira de KPIs (3-4 cards) → grid 2 columnas (gráfico principal 1.55fr +
desglose/legend 1fr) → insight strip (1 frase con negritas) → foot (fuente/atribución)`.

- **Orden de lectura = orden de decisión, no orden de generación de datos.** El KPI más grande /
  más a la izquierda siempre es la métrica "de la que se parte" (base activa, universo total), y la
  tira va de universo → filtro → resultado accionable. Ej. Comisión Saving: `Base prepago activa →
  Recargan por Banco General → Recargado USD → Mercado potencial`. El último KPI de la fila es
  siempre el "so-what" (qué se puede capturar/recuperar), nunca un dato neutro.
- **Densidad:** 3-4 KPIs por fila, nunca más de 6 simultáneos visibles sin scroll — límite de carga
  cognitiva ejecutiva (7±2 aplicado con margen). Detalle granular (tablas, CSV) se separa a archivos
  adjuntos, no compite en el HTML con el resumen.
- **Un gráfico principal, un panel secundario.** Nunca dos gráficos de igual jerarquía visual en la
  misma vista — siempre hay un "hero chart" (grid 1.55fr) y un soporte (legend/breakdown, 1fr).
- **10 segundos:** lo que debe leerse sin interactuar es la tira de KPIs + el insight strip. Todo lo
  demás (toggles, tooltips, funnels) es para el analista que se queda >30s.
- **Balance visual:** paleta de acento (mamey) se usa con moderación — 1-2 elementos por vista (barra
  principal + valor `.money`), nunca satura todo el dashboard. El resto es escala de grises (`--txt`,
  `--txt2`, `--txt3`) para no competir con el dato que importa.

## 2. Data storytelling

**Estructura narrativa (beginning → middle → end), consistente en los 3 documentos de mayor
narrativa — Offer Welcome, Campaign Plan, Incidentes:**

- **Beginning (contexto + definiciones):** antes de mostrar una sola cifra, el documento fija
  *qué es* cada término y *qué ventana temporal* aplica, con advertencias explícitas de qué NO
  significa (`⚠️`). Ej.: "contactado = estaba en la base, no confirma entrega"; "mes parcial, no
  comparable con meses cerrados". Esto es una regla de honestidad analítica, no relleno.
- **Middle (cadena de embudo con multiplicador):** el cuerpo siempre presenta una secuencia
  `Universo → Filtro 1 → Filtro 2 → Resultado`, con cada paso llevando *valor absoluto + %  del
  paso anterior*, y remata con un **multiplicador o comparación** que es el verdadero insight
  (`7×`, `31.0 intentos/usuario`, `96.2% no abandonó`). El insight nunca es la cifra sola — es la
  cifra comparada contra un baseline o contra otro segmento.
- **End (guardrail de interpretación):** cuando hay un patrón que podría malinterpretarse
  (anomalía, caída, pico), el documento cierra con una sección explícita "cómo leerlo" / "nota" que
  se adelanta a la lectura errónea antes de que el lector la haga. Ej.: el valle de compras del
  02-06 jul se explica como *interrupción de disponibilidad verificada*, no caída de demanda — y se
  dice explícitamente "no interpretar el valle como caída de demanda ni como fallo del dashboard".

**Preguntas de negocio que responden estos dashboards (patrón recurrente):**
"¿Cuánto dinero/usuario se está perdiendo/podría capturarse?" (Comisión Saving, Campaign Plan) ·
"¿Qué tan grave fue el incidente y a quién le pasó?" (Incidentes) · "¿Está funcionando la campaña y
mejor que el canal orgánico?" (Offer Welcome) · "¿Quién se fue y se puede recuperar?" (Dormant Users).
**Patrón general [inferido]:** casi todos responden una de dos preguntas raíz: *"¿cuánto valor se
está dejando sobre la mesa?"* o *"¿la intervención (campaña/oferta/fix) está funcionando?"*.

## 3. Catálogo de KPIs y clasificación

| KPI (ejemplo real) | Fórmula probable | Fuente | Clasificación |
|---|---|---|---|
| Base prepago activa | `COUNT DISTINCT MSISDN` con `lob='PREPAGO'`, snapshot de cierre | `third_party_additional_api_services_lob` | **Strategic** (tamaño de mercado direccionable) |
| Recargan por Banco General | `COUNT DISTINCT MSISDN` con canal `PG_BGeneralTopUp` | transacciones | **Executive** (oportunidad de migración de canal) |
| Mercado potencial (USD) | monto BG de líneas `NO_TXN + SOLO_COMPRA` | derivado | **Executive** (cuantifica la oportunidad en $) |
| MAU rolling-30d por LOB | `DISTINCT user_id` ventana `[cierre-29, cierre]` | `sapp_bg_fb_user_identity_daily` | **Strategic/Monitoring** — es el KPI oficial de crecimiento, validado contra `growth_dashboard_daily.mau_rolling` |
| % activación oferta bienvenida | `activaron / prepago nuevos` | funnel de campaña | **Executive** (ROI de campaña) |
| Multiplicador contactado/orgánico | `tasa contactado / tasa orgánico` | comparación de cohortes | **Diagnostic** (explica el *por qué* del resultado) |
| Usuarios únicos vs intentos (incidente) | `user_pseudo_id` distinct vs `screen_view` count | eventos Firebase | **Operational/Diagnostic** — separa impacto real de ruido de instrumentación |
| Retorno el mismo día | `regresaron / total afectados` | eventos posteriores | **Operational** (severidad real del incidente) |
| Clasificación dormant (RECUPERABLE/BAJA_VOLUNTARIA/ELIMINADO) | reglas exhaustivas y mutuamente excluyentes sobre SAP+CIAM | CDC | **Strategic** (tamaño de la base recuperable) |

**Regla de clasificación [derivada del patrón]:**
- **Strategic KPI** = cuantifica un universo o mercado direccionable (tamaño de la oportunidad).
- **Executive KPI** = mide si una acción de negocio (campaña, canal, oferta) está capturando esa
  oportunidad, casi siempre como tasa de conversión de un paso a otro.
- **Operational KPI** = mide impacto/severidad real de un evento (incidente, campaña) sobre usuarios,
  siempre depurando ruido técnico del dato crudo (intentos vs usuarios únicos).
- **Diagnostic KPI** = explica el *por qué* del Executive/Operational KPI (multiplicadores,
  comparación de cohortes, ratio intentos/usuario).
- **Monitoring KPI** = serie temporal de un KPI ya validado contra una fuente oficial, para detectar
  drift (MAU rolling, success rate mensual).

**Toda métrica publicada lleva: definición literal + fuente/tabla + ventana temporal + quién la
validó (contra qué fuente oficial), nunca solo el número.** Esto es la regla más fuerte y más
repetida en los AI_CONTEXT — es lo que separa "dashboard" de "reporte confiable".

## 4. Redacción y comunicación

- **Títulos = tensión + comparación**, no descripción neutra: "Ahorro de Comisión — Banco General
  vs SuperApp" (no "Reporte de recargas"); "Operate the app on customer impact, not event volume
  alone" (posiciona explícitamente el KPI correcto contra el KPI equivocado en el propio título).
- **KPIs se nombran con el verbo de la acción del usuario**, no con el nombre de la tabla:
  "Recargan por Banco General" (no "PG_BGeneralTopUp count"), "Activó la oferta" (no
  "welcome_offer_flag=1").
- **Alertas/hallazgos usan negrita + cifra + contexto en una frase**, formato
  `**cifra** (contexto) — implicación`. Ej.: "**96.2% NO abandonó** — el mantenimiento fue
  disruptivo pero no expulsó usuarios."
- **Insights automáticos (JS) son plantillas de frase, no párrafos:** `En {mes}, de {bg} líneas que
  recargan por Banco General, {dormant} abandonaron la app y {notxn} la tienen pero no la usan. Ese
  es el mercado por recuperar.` — sujeto + verbo + cifra + consecuencia, siempre bilingüe.
- **Advertencias usan `⚠️` inline, nunca un disclaimer separado al final** — el guardrail va pegado
  al dato que podría malinterpretarse, en el momento en que se lee.
- **Lenguaje ejecutivo vs técnico:** el dashboard HTML usa lenguaje ejecutivo (KPIs, insight,
  tendencia); el AI_CONTEXT.md que lo acompaña usa lenguaje técnico completo (columnas, queries,
  IDs de ejecución) — **nunca se mezclan en la misma superficie**. Un ejecutivo no ve nombres de
  tabla; un agente/analista que retoma el trabajo sí los necesita, en un archivo aparte.

## 5. Visualizaciones — qué gráfico y por qué

| Tipo usado | Para qué KPI | Por qué ese y no otro |
|---|---|---|
| Barras verticales tipo funnel (3-6 pasos) | Embudos de conversión/mercado (Comisión Saving, Campaign Plan) | La altura decreciente comunica pérdida de volumen sin necesitar leer números; barras apiladas dentro del último paso muestran composición sin un gráfico extra |
| KPI cards con contador animado | Cifras headline | Fuerza la lectura secuencial (una a la vez, aunque estén en grid) vía animación; tabular-nums evita jitter |
| Line/sparkline SVG a mano, sin librería | Series mensuales de % (success rate) | Cero dependencias = el archivo sigue funcionando sin internet/JS externo; tooltip nativo con `<title>` en SVG evita JS para el caso simple |
| Matriz de celdas coloreadas (healthy/watch/critical) | Comparación journey × mes en `SuperApp_Operations_Dashboard` | Reemplaza una tabla numérica densa por un heatmap de 3 estados — el ejecutivo escanea color, el analista lee el número dentro de la celda |
| Diagrama ASCII de flujo/journey | Journeys de incidente (dónde entran, dónde se bifurcan) | Más rápido de producir y de leer en Markdown que un diagrama vectorial, y no requiere herramienta externa para mantenerlo versionado en el `.md` |
| Legend/breakdown en lista (no pie chart) | Composición de segmentos | Evita pie charts con >4 categorías (ilegibles); lista ordenada + barra de color + valor + % es más legible y permite texto secundario (`seg_sub`) que un pie no admite |

**Antipatrón evitado deliberadamente:** no hay un solo pie/dona en los 8 dashboards. **[inferido]**
Regla implícita del equipo: pie charts se evitan por defecto a favor de barras/funnels ordenables y
comparables.

## 6. UX analítica

- **Escaneabilidad:** todo valor crítico usa `font-variant-numeric: tabular-nums` y jerarquía
  tipográfica de 3 niveles (label uppercase 11px → valor 24-33px extrabold → sub 12px) — el ojo
  encuentra el número sin leer el label primero.
- **Carga cognitiva:** toggles (unidad, scope, mes, idioma) se agrupan visualmente por función y
  quedan colapsados a un botón "on" resaltado — nunca más de 2-3 opciones por toggle.
- **Elementos de foco:** hover glow radial en KPI cards centrado en el cursor (`--mx/--my`) dirige
  la atención sin necesitar clic; opacidad de labels internos de segmento solo aparece si el
  segmento es ≥26px (evita texto ilegible amontonado — regla de "ocultar antes que atropellar").
- **Accesibilidad de movimiento:** todo el motion (contador animado, transiciones) respeta
  `prefers-reduced-motion` — no es opcional, está en los 8 archivos.
- **Tiempo estimado de consumo:** diseñado para 2 modos de uso — "vistazo" (10s, KPIs + insight) y
  "exploración" (2-5 min, toggles + tooltips + tabla). No hay un tercer modo intermedio confuso.

## 7. Principios de visualización de datos aplicados

- **Contraste:** el acento de marca (`mamey`) se reserva para lo accionable/positivo en valor
  monetario; rojo (`--danger`/`--seg-dormant`) siempre y solo para riesgo/pérdida/inactividad —
  nunca se invierte ese mapeo semántico entre dashboards.
- **Posición:** el KPI más importante siempre ocupa la primera posición de la fila (lectura
  izquierda→derecha en ES), nunca el centro o la derecha.
- **Comparación con baseline:** ningún KPI headline se presenta sin un punto de comparación (mes
  anterior, canal orgánico, fuente oficial validada) — el multiplicador/​% es obligatorio, el número
  absoluto solo nunca es el mensaje final.
- **Contexto temporal:** toda ventana de tiempo se declara con fecha exacta de inicio/fin y se
  marca explícitamente si el período es parcial — nunca se deja "este mes" ambiguo.
- **Targets/benchmarks:** cuando existe (`MAU rolling-30d validado contra growth_dashboard_daily`),
  el benchmark de validación se documenta como prueba de confianza del dato, no solo como fuente.

## 8. Dimensiones de negocio recurrentes

`Tiempo` (mensual, diario, ventana rolling-30d) · `Línea de negocio/LOB` (prepago/pospago/
residencial) · `Canal de pago` (Banco General vs in-app) · `Plataforma` (Android/iOS) · `Cohorte de
campaña` (contactado/orgánico, sin-app/inactivo) · `Segmento de comportamiento` (dormant/no-txn/
solo-recarga/solo-compra/ambos) · `Producto/paquete` (exclusivo vs regular). **Patrón:** casi
siempre se cruzan exactamente 2 dimensiones a la vez en el gráfico principal (tiempo × segmento, o
canal × resultado) — nunca 3+ dimensiones en el mismo chart; una tercera dimensión se resuelve con
un toggle, no con más ejes.

## 9. Modelado analítico implícito

- **Fact tables probables:** `transaction_history_iceberg` (transacciones), `sapp_bg_fb_user_identity_daily`
  (actividad/identidad diaria), eventos Firebase/GA4 (`screen_view`, etc.).
- **Dimension tables probables:** `third_party_additional_api_services_lob` (línea↔LOB↔titular),
  SAP CDC (estado de cuenta), CIAM (estado de baja).
- **Métricas derivadas:** clasificaciones mutuamente excluyentes construidas con `CASE WHEN` en
  cascada sobre 2-3 fuentes (ver Dormant Users §2: RECUPERABLE/BAJA_VOLUNTARIA/ELIMINADO_SISTEMA) —
  **regla de oro: toda clasificación de segmento debe ser exhaustiva y mutuamente excluyente**, o el
  dashboard puede doble-contar y perder confianza inmediatamente.
- **Agregaciones:** `COUNT DISTINCT` por ventana rolling (no snapshot puntual) es el estándar para
  cualquier métrica de "usuarios activos"; snapshots puntuales se reservan para "base" (líneas
  activas a la fecha de cierre).

## 10. Buenas prácticas por categoría

- **Visual Design:** paleta de marca reservada a acento único + escala de grises; dark-first;
  Nohemi solo en números/headings, Inter en cuerpo.
- **Data Visualization:** funnel > pie; comparación siempre junto al valor absoluto; nunca un
  gráfico sin unidad ni ventana temporal visible.
- **Dashboard Architecture:** un archivo HTML autocontenido + un JSON de datos + un AI_CONTEXT.md
  de metodología, siempre los tres juntos, nunca el HTML solo.
- **UX Analytics:** toggles agrupados por función, máximo 2-3 opciones; hover para profundizar,
  nunca click obligatorio para ver el dato base.
- **Data Storytelling:** definición → embudo con multiplicador → guardrail de interpretación, en
  ese orden, siempre.
- **KPI Design:** todo KPI headline lleva sub-label con la unidad/base de comparación; todo % va
  acompañado del número absoluto entre paréntesis.
- **Executive Reporting:** título = insight, no descripción; máximo 4 KPIs headline; 1 insight
  strip por vista.
- **Data Governance:** cada archivo declara autor, fecha de corte, fuente/workgroup Athena, y si el
  panel está vigente o en descontinuación (`AVISO DE CICLO DE VIDA`) — la vigencia del dato es
  metadata de primera clase, no una nota al pie.
- **Analytics Engineering:** metodologías versionadas y trazables a IDs de query Athena
  específicos, referenciadas desde el AI_CONTEXT, nunca solo "de Athena".
- **Product Analytics:** cohortes de campaña siempre declaran qué NO prueban (atribución sin
  control aleatorizado) — honestidad sobre causalidad vs correlación.

## 11. Hallazgos de la fuente viva — QuickSight "Mas App" (evidencia adicional)

Extraído vía `aws quicksight describe-dashboard-definition` sobre el dashboard real
`9f861278-ade8-4476-bf44-f47566da508b` ("Mas App", cuenta 265857264887, 9 sheets: Daily, LOB,
Growth, DAU-MAU, Collection Breakdown, Payment Retention, Retention, Resurrected, Media Lounge).
Este es el panel operativo/analista al que las hojas HTML curadas (comisión, dormant, campaign
plan) llaman "fuente de verdad" o "panel vigente". Confirma una **arquitectura de dos capas**:

- **Capa QuickSight (viva, densa, sin marca):** `ThemeArn = CLASSIC` (tema por defecto de AWS, sin
  paleta corporativa), 9 hojas con decenas de KPIs cada una, orientada a analistas que exploran con
  filtros nativos. Es el sistema de registro — HTML no la reemplaza, la resume.
- **Capa HTML curada (snapshot, de marca, narrativa):** los 8 dashboards de referencia. Toman un
  subconjunto de KPIs de esta capa, los reducen a 3-4 headline, y les agregan storytelling (insight
  strip, guardrails, bilingüe). **Regla derivada:** al construir un dashboard HTML nuevo, la
  pregunta no es "qué puedo graficar" sino "cuál de las decenas de KPIs de QuickSight es el que
  responde la pregunta de negocio de esta entrega" — la curación es el trabajo, no la graficación.

**Patrones de KPI/visualización presentes en QuickSight y AUSENTES en la capa HTML curada — usarlos
cuando el destinatario es más analista que ejecutivo, o cuando la pregunta de negocio lo exige:**

| Patrón (sheet donde aparece) | Qué es | Cuándo usarlo |
|---|---|---|
| **Gauge vs. Goal** (Daily: "MAU Rolling vs GOAL") | KPI comparado contra una meta explícita, visual tipo velocímetro | Cuando existe un target de negocio formal (OKR, meta trimestral) — no simular con solo color condicional |
| **Delta KPI (DoD/WoW/MoM %)** (Growth: KPIs "% DoD", "% WoW", "% MoM" junto al valor absoluto) | Cada métrica headline (MAU, Login, New Sign Up) va acompañada de 3 variantes de tendencia a distintas escalas de tiempo, como KPI separado, no como sparkline | Cuando el ritmo de cambio importa tanto como el nivel — monitoreo operativo diario |
| **Stickiness ratio (WAU/MAU)** (Growth) | Ratio de dos ventanas de actividad como KPI propio, no solo dos KPIs separados | Para medir frecuencia de uso, no solo alcance |
| **Grid de KPIs segmentado** (Collection Breakdown: mismo trío Trx./Amt./Unique Accounts × 4 LOB: PREPAID/POSTPAID/FMC/FIXED = 12 KPI cards) | Repetir el mismo set de métricas una vez por cada valor de una dimensión clave, en grid | Comparar composición entre segmentos cuando son pocos (≤4-5) y el lector necesita ver todos a la vez, no un dropdown |
| **Share-of-total bars (%)** (Collection Breakdown: "Payment Amount Share by Payment Method (%)") | Barras que sí muestran %, pero mantienen el eje temporal (a diferencia de un pie estático) | Composición que cambia en el tiempo — evita pie chart y sí muestra evolución |
| **Treemap de estacionalidad** (Collection Breakdown: "Transactions by Day of Week") | Bloques proporcionales al volumen por categoría discreta | Detectar patrones de día/hora de una sola vista, sin eje temporal continuo |
| **Heatmap 2D cruzado** (Collection Breakdown, Payment Retention: tipo de transacción × método de pago; cohortes de retención por semana) | Matriz de intensidad de color en 2 dimensiones categóricas/temporales | Cruce de exactamente 2 dimensiones con muchas combinaciones (>10x10) donde una tabla sería ilegible — coherente con la regla de "matriz de estado" ya vista en BotReports (§5), aquí con gradiente continuo en vez de 3 estados discretos |

**Campos calculados reales encontrados** (`cf_month_over_month_growth`,
`cf_percent_of_total_vs_all_channel`, `retention_week_pct_calc`, `ranking`, `avg_amount_weighted`):
confirman que "% del total", "MoM growth" y "retención por semana" son métricas derivadas
estandarizadas del equipo, no cálculos ad-hoc por dashboard — si vas a construir una de estas,
replica la definición ya usada en QuickSight en lugar de inventar una fórmula nueva.

## 12. Antipatrones detectados (y por qué importan)

- **Confundir intentos con usuarios** sería el error más grave posible en el caso de Incidentes —
  por eso el informe separa `INTENTOS` de `USUARIOS ÚNICOS` en la primera tabla, antes de cualquier
  otra cifra. Un dashboard que reporte solo "206,925 eventos" sobrestima el incidente 31x.
- **Comparar meses parciales contra meses cerrados** sin marcarlo (Campaign Plan, Offer Welcome
  marcan explícitamente jul*/sep* con asterisco) — de lo contrario una tendencia descendente puede
  ser solo un mes incompleto, no una caída real.
- **LOB/segmento no mutuamente excluyente:** el propio dashboard `mau_rolling_lob` advierte de su
  propia limitación ("asigna 1 usuario → 1 sola LOB... NO debe leerse como conteo de clientes por
  línea") — un antipatrón que el equipo ya sufrió y ahora documenta preventivamente en el propio
  archivo para que no se repita en lecturas futuras.
- **Usar pie charts con muchas categorías** — evitado sistemáticamente (ver §5); un pie con 6
  segmentos (como los de Comisión Saving) sería ilegible comparado con la barra apilada usada.
- **Publicar un número sin ventana temporal ni fuente** — nunca ocurre en estos archivos; sería el
  antipatrón de gobierno de datos más común en dashboards genéricos y aquí está sistemáticamente
  evitado.

## 13. Marco de replicación (checklist operativa)

Al construir un dashboard nuevo con estos dos skills en conjunto (`superapp-dashboard-style` para
el CÓMO visual, este skill para el QUÉ/POR QUÉ):

1. **Define el universo y el resultado antes de tocar CSS.** Escribe la cadena
   `Universo → Filtro(s) → Resultado accionable` en una frase; esa frase es el título.
2. **Elige 3-4 KPIs headline** siguiendo el orden universo → oportunidad capturada → oportunidad
   restante. Nunca más de 4 sin agrupar.
3. **Un gráfico hero (funnel/barras) + un panel de composición (legend, no pie).**
4. **Escribe el insight strip como plantilla de frase** con al menos un multiplicador o % de
   comparación, bilingüe.
5. **Declara ventana temporal exacta y marca períodos parciales** con asterisco o nota.
6. **Verifica que toda clasificación de segmento sea exhaustiva y mutuamente excluyente** antes de
   graficarla.
7. **Separa ruido de instrumentación del dato de negocio** si la fuente son eventos crudos
   (intentos/vistas vs usuarios únicos).
8. **Adjunta un AI_CONTEXT.md/CONTEXTO_AI.md** con: definiciones, fuente/tabla, ventana, cómputo,
   y quién puede reproducirlo — sin esto, el dashboard no es "confiable", es solo bonito.
9. **Cierra con un guardrail de interpretación** si hay algo que un lector podría malinterpretar
   (anomalía, caída, pico, cambio de metodología).
10. **Atribución:** usa el patrón de bloque de comentario + `<meta name="author">`, pero con el
    autor real del trabajo nuevo — nunca copies "Miguel Pachay" a un dashboard que tú generes; ver
    `superapp-dashboard-style/reference/palette-and-fonts.md` §"Reglas de marca".

## 14. Knowledge Base for Dashboard Generation Skill (resumen accionable)

**Reglas duras (no negociables):**
- Todo KPI headline lleva unidad + ventana temporal + fuente, visible o en tooltip.
- Toda clasificación de segmentos debe sumar 100% del universo declarado, sin huecos ni doble conteo.
- Todo período parcial se marca explícitamente en el label, no solo en un pie de página.
- Ratio de "ruido vs señal" (intentos/usuarios, vistas/personas) se calcula y muestra cuando la
  fuente son eventos crudos.

**Heurísticas (por defecto, salvo razón en contra):**
- Preferir barras/funnel sobre pie chart.
- Máximo 4 KPIs headline, máximo 2 dimensiones cruzadas por gráfico.
- Insight = frase con cifra + comparación, no párrafo.
- Un gráfico hero, un panel de soporte — nunca dos heroes.

**Checklist de publicación de un dashboard nuevo:**
- [ ] Título comunica la tensión/comparación, no solo el tema.
- [ ] KPIs headline en orden universo → oportunidad → resultado.
- [ ] Insight strip presente con multiplicador o %.
- [ ] Ventanas temporales exactas y períodos parciales marcados.
- [ ] Segmentación exhaustiva y mutuamente excluyente, verificada suma = 100%.
- [ ] Guardrail de interpretación si hay algo anómalo.
- [ ] AI_CONTEXT.md/CONTEXTO_AI.md adjunto con definiciones y trazabilidad.
- [ ] Atribución correcta (autor real, no el de los archivos de referencia).
- [ ] Bilingüe si es para distribución amplia en CWP/Panamá.
- [ ] Revisado contra `superapp-dashboard-style` para paleta/tipografía/tema dark-light.
- [ ] Validación en 3 capas completada (§15): consistencia interna, reglas oficiales del MCP, reconciliación contra QuickSight.
- [ ] Cada cifra escrita en títulos/insights/alertas trazada a `metrics.json` o a un CSV fuente (chequeo por script, no a ojo).
- [ ] Toda comparación en un texto usa la misma ventana y una base donde las fuentes cuadran con el KPI oficial.

**Información insuficiente / hipótesis marcadas [inferido]:** no tuve acceso al dashboard vivo de
QuickSight (requiere SSO de AWS), así que todo lo anterior viene exclusivamente de los artefactos
HTML/MD estáticos entregados como "panel puente" — si QuickSight introdujo convenciones adicionales
(alertas, drill-down, RLS) no están capturadas aquí y deberían auditarse por separado cuando haya
acceso.

## 15. Validación antes de publicar cifras (lecciones de First Time Buyers, sep-2026)

Un análisis que se reproduce a sí mismo 100 veces puede seguir mal definido: **reproducibilidad no es
validez**. En el caso FTB, 11 inconsistencias pasaron un QA que sólo comparaba el análisis consigo mismo
(Python vs su propio SQL + capturas de pantalla).

**Las 3 capas, en este orden:**

1. **Consistencia interna:** recálculo con código independiente desde el CSV crudo; recuento con otra
   lógica SQL (`ROW_NUMBER` vs `MIN_BY`); traza de 5 registros al azar hasta la tabla.
2. **Reglas oficiales:** leer `superapp_business_rules` (MCP `superapp-context`) ANTES de interpretar una
   métrica — si una definición propia contradice una regla, la definición está mal.
3. **Reconciliación contra QuickSight:** primero el vault — `~/vault/notes/2026-09-22-query-cheatlist-athena-quicksight-superapp.md`
   (queries validadas dígito a dígito vs el valor renderizado) y `~/vault/notes/2026-09-22-lineage-*-mas-app.md`
   (linaje de las 9 pestañas de "Mas App"). Si no hay entrada: `describe-dashboard-definition` → leer
   **todos** los FilterGroups (hay filtros ocultos sin control visible) → `describe-data-set` → replicar en
   Athena. `start-dashboard-snapshot-job` está denegado en la cuenta (`IdentityStore not found`).

**Trampas oficiales que ya costaron cifras:**

| Trampa | Regla |
|---|---|
| `INITIATED` contado como fallo | No es fallo. Fallo real = `FAILURE`/`Failed`/`Reversada` (vocabulario por pasarela). Reportar por separado "fallo real" vs "intento sin cerrar". |
| `created_at` vs `date_ymd` | UTC vs hora Panamá: ~22% de las transacciones cambian de día si se mezclan. |
| Ingesta duplicada oct–dic 2025 (hasta 24.9×) | Declararla explícitamente en cualquier resultado que toque esa ventana. |
| "Alta nueva" ≠ usuario nuevo | Los migrados aparecen como alta. En la presentación usar **"registro"** (antes "alta"; en telco "alta" se lee como activación de línea). |
| Métrica sin equivalente en QuickSight (p. ej. FTB) | Decirlo explícitamente y mostrar la sensibilidad por definición. Collection Breakdown excluye `PAY_A_BILL` y `BALANCE` y usa `transaction_amount` (sin ITBMS 7%). |

**Errores de cálculo que parecen correctos:**

- **Último día casi vacío tratado como "parcial":** medir `MAX(created_at)` y filas de la última partición;
  si trae unas horas, cortar en el último día completo (distorsionaba FTB/día 927 vs 970 real).
- **Promedio de promedios en categorías de calendario** (día del mes, día de semana): cada categoría
  aparece un número distinto de veces → ponderar por fecha (+34% → +37%).
- **Comparar tasas de ventanas distintas** (pago a 30 días vs conversión por mes calendario): buscar la
  base con la misma ventana.
- **Base histórica donde la fuente no cuadra con el KPI oficial** (registros mar–abr +14–17% vs "New Sign Up"):
  restringir la base al periodo donde cuadran.
- **Redondeos generosos en el texto** ("4×" cuando es 3.7×; "3.8×" sin base declarada): escribir el
  cálculo o la base junto a la cifra.
- **Consulta sin fecha as-of en todas sus fuentes:** acotar la ventana de estudio no basta; si las compras
  posteriores no tienen tope, la misma SQL da otro número cada día (FTB sep 20,402 → 20,887). Poner
  `date_ymd ≤ '<corte>'` en cada CTE y un assert de conciliación (Σ de la vista = total del dataset).
- **Mezclar ventanas en una misma frase:** "+61%" salió de 8 semanas junto a un embudo de 7. Una afirmación =
  una ventana, declarada.
- **Rotular semanas con su lunes:** "semanas 6-jul a 17-ago" se lee como fechas de calendario; la última termina
  el 23-ago. Escribir primer y último día real (el usuario sumó 101,809 en QS en vez de 116,234).
- **Denominador distinto del que se lee:** "de 52,949, 18.5%" cuando era 7,402/39,938. Escribir num/den.
- **Tasas redondeadas × base para reconstruir conteos:** usar los conteos exactos.
- **Mismo nombre, varios universos** ("Nuevos" = elegibles del mes / cohorte al comprar / registros): definir el
  universo en el subtítulo de cada vista.

**Registros (New Sign Up):** volumen = `growth_dashboard_daily.signup_users` (QS Growth, diario); conversión =
tabla por uid (−0.1%). No usar el sheet LOB (−21%, sólo titulares vinculados) ni la tarjeta Daily (MTD) como total.

**Estándar de ventana para cohortes:** semanas lunes–domingo en hora Panamá, sólo completas; un horizonte Dn se
publica sólo si el último día de la semana + n ≤ corte; periodos de igual número de semanas (≥4); reportar tasa
agregada + dispersión semanal y probar a nivel semana (los IC agregados sobrestiman la certeza); meses calendario
sólo para volúmenes (como x/día si el mes es parcial).

**Confianza:** separar confianza en el **conteo** de confianza en la **interpretación** (p. ej. "conteo
alto / media como bloqueador #1"). Sin grupo de control → "requiere validación", nunca "sin efecto".

## 16. Legibilidad: que nadie tenga que adivinar (lecciones FTB, sep-2026)

Las cifras correctas no bastan: si el lector tiene que preguntar qué significa un rótulo, el dashboard falló.

**Prueba del lector (antes de entregar, elemento por elemento):** alguien que no construyó el dashboard puede
responder, sin preguntar: (1) qué es una unidad (persona, compra, USD, día), (2) sobre qué base, (3) en qué
ventana, (4) de qué fuente. Si alguna respuesta requiere adivinar, corregir antes de publicar.

| Situación | Receta |
|---|---|
| Botón/columna/celda | Rótulo con unidad: «N.º de personas», «% que volvió a comprar», «Gasto medio 30 días (USD)». Ninguna letra suelta ni campo interno («N», `rev30`). |
| Selector que cambia el significado de las celdas | Línea «Cada celda: …» bajo el selector, reescrita por opción; en el modo conteo, decir cuánto suman todas las celdas y para qué sirve («con pocas personas, el color engaña»). |
| Mapa de calor con % o promedios | Ofrecer siempre el conteo por celda (N.º de personas) y marcar celdas con base pequeña. |
| Comparación grupo A vs B («3.2×») | Mostrar los dos % (gráfico de dos puntos), no sólo el cociente: un 3× sobre 0.8% de la gente pesa menos que un 2× sobre 10%. Atenuar filas con alcance <1%. |
| Título o KPI | Ícono ⓘ con: qué es, unidad, base, ventana, fuente. Generado desde un catálogo único (una ficha por elemento) que también genera la documentación funcional: al cambiar una cifra se edita la ficha y se corren ambos builds. |
| Tooltip con % | `x% ≈ n de N <grupo>` + ventana. |
| Pestaña de asociación (eventos previos) | Cajas «Cómo leer» (un ejemplo calculado), «Qué puedes afirmar y qué no» y «Calidad de los datos». |
| Material de estudio / sustentación | Primero la historia en 30 s, un capítulo por pregunta, un visual por idea («de cada 100»), la frase para decirlo, qué no decir y autoexamen. Auditoría y glosarios, como anexo. |

## 17. Registro de correcciones → reglas (ciclo de mejora continua)

Cada corrección del usuario es un test que la skill no pasó. Se anota aquí (síntoma → causa → regla) y la regla
se sube a la Quick Reference o al checklist de SKILL.md. Si un síntoma se repite, la regla no está donde el
agente la lee: moverla, no reescribirla más larga.

| Fecha | Tipo | Síntoma (lo que dijo o hizo el usuario) | Causa raíz | Regla (dónde vive) |
|---|---|---|---|---|
| 2026-09-23 | validación | «¿Estás usando el vault / MCP?» — 11 inconsistencias | QA sólo contra sí mismo | 3 capas (§15) |
| 2026-09-23 | validación | Recalculó +61% a mano y «no cuadraba» | Dos ventanas (8 vs 7 semanas) en una frase | Una afirmación = una ventana (§15) |
| 2026-09-23 | legibilidad | Sumó QS 6-jul→17-ago = 101,809 vs 116,118 | Semanas rotuladas con el lunes | Primer y último día real (§15) |
| 2026-09-23 | validación | «18.5% de 52,949» no cuadraba | Denominador distinto del leído | num/den junto al % (§15, §16) |
| 2026-09-23 | validación | FTB de septiembre cambiaba según el día | Consulta sin fecha as-of | `date_ymd ≤ corte` en cada CTE + assert (§15) |
| 2026-09-23 | legibilidad | No entendía la pestaña Comportamiento | Sólo el «×», sin los % ni cómo leerlo | Dos puntos + cajas de lectura (§16) |
| 2026-09-23 | narrativa | «Si ni yo lo entiendo, cómo alguien más» | Se explicó con la auditoría | Simple primero, auditoría en anexo (§16) |
| 2026-09-23 | legibilidad | Pidió documentar cada elemento | Definiciones sólo en la cabeza del autor | ⓘ + doc funcional desde un catálogo (§16) |
| 2026-09-23 | legibilidad | «¿Qué significa la N?» | Botón con una letra | Rótulo con unidad + línea «Cada celda» (§16) |
| 2026-09-24 | alcance | «El análisis era solo prepago» — FTB 71,784 → 48,240 | No se confirmó el universo/línea de negocio antes de la primera consulta | Confirmar universo y línea de negocio con el usuario y ponerlo en la primera línea de definiciones (Quick Reference) |
