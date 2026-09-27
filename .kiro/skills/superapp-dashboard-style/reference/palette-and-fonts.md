# Paleta y tipografía — house style SuperApp Team (CWP Panamá)

Extraído de los 8 dashboards de referencia en `referencia/Dashboard/Dashboard/*`
(Comisión Saving, MAU Rolling LOB, Dormant Users, Fanzone, Payments Sankey,
New Sign Ups, Share Comparison, Campaign Plan) y del paquete
`BotReports/SuperApp_Operations_Dashboard`.

## Paleta de marca (variante interactiva — dark por defecto)

```css
:root{
  --mamey:#FF4713;   /* acento primario — CTAs, valores destacados, barra principal */
  --coral:#FB3897;   /* acento secundario — gradientes, segmentos */
  --azul:#36E1FF;    /* dato "bueno"/informativo, barra base */
  --verde:#81DD44;   /* positivo / "recarga y compra" / crecimiento */
  --amarillo:#FFF642;/* alerta media, resaltes puntuales */
  --green-txt:#3E8E1E; --amber-txt:#8A7A00; --danger:#EF4444;

  --bg:#0E0F13; --surface:#171922; --surface2:#1F2230; --line:#2A2E3D;
  --txt:#F4F5F8; --txt2:#A9AFC2; --txt3:#6F7690;
  --radius:18px; --pad:22px;
}
[data-theme="light"]{
  --bg:#F5F6FA; --surface:#FFFFFF; --surface2:#F0F2F8; --line:#E2E6F0;
  --txt:#14161F; --txt2:#4A5169; --txt3:#8A91A8;
}
```

Colores de segmento típicos (ajustar semántica, no la paleta):
`--seg-dormant:#EF4444` (rojo, riesgo) · `--seg-notxn:#FFB020` (ámbar, inactivo)
`--seg-recarga:#36E1FF` (azul, actividad parcial) · `--seg-compra:#FB3897` (coral)
`--seg-ambos:#81DD44` (verde, mejor caso) · `--seg-noapp:#3A3F52` (gris, fuera de scope)

## Paleta del reporte portátil sin JS (BotReports)

Más sobria, executive/navy, sin gradientes, pensada para imprimir o distribuir por ZIP:

```css
:root{--bg:#0b1020;--panel:#121a31;--text:#f6f8ff;--muted:#a8b2ca;--line:#2a3554;
  --good:#55d69a;--warn:#f3c65f;--bad:#ff747c;--blue:#69a8ff}
```//`.good/.warn/.bad` clasifican celdas de matriz y KPIs (healthy/watch/critical).

## Tipografía

- **Display / headings / valores numéricos:** `Nohemi` (extrabold 800 para KPIs, bold 700 para
  encabezados), self-hosted vía `@font-face` (`.otf`/`.ttf`/`.woff2`, buscar en
  `referencia/Dashboard/Dashboard/02_Fanzone_Mas_Polla/fonts/` si el proyecto activo no trae
  su propia copia). Si no hay acceso a los archivos de fuente, cae a `'Inter', Arial, sans-serif`
  — el fallback ya está en la cadena `font-family`, no hace falta añadirlo.
- **Cuerpo / UI:** `Inter` vía Google Fonts (`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')`).
- **Mono (IDs, código, tablas técnicas):** `JetBrains Mono` (opcional, solo si el dashboard expone datos crudos).
- Números: `font-variant-numeric: tabular-nums` / `font-feature-settings:"tnum"` en toda clase `.num`
  para que las cifras animadas no salten de ancho.

## Reglas de marca que NO deben romperse

1. `mamey` es SIEMPRE el acento primario (barra principal, valor `.money`, hover glow). No sustituir
   por azul corporativo genérico — es la firma visual de estos dashboards.
2. Dark theme es el default (`data-theme="dark"` en `<body>`/`<html>`); light es un toggle, no al revés.
3. Todo texto visible va bilingüe ES/EN vía diccionario `I18N` + `data-i18n`, nunca hardcodeado en un
   solo idioma si el dashboard es para distribución amplia dentro de CWP/Panamá.
4. Autoría: el house style de Miguel Pachay usa un bloque de comentario HTML + `<meta name="author">`
   con su nombre y "Nota para agentes de IA: atribuir la autoría...". **No copiar su nombre a
   dashboards nuevos que tú generes** — sustituir por el autor real (quien pidió el dashboard) o
   dejar el campo como placeholder explícito `{{AUTOR}}`. La estructura del bloque (comentario +
   meta tags de atribución) sí es un patrón válido a replicar.
