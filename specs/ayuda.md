---
name: ayuda
description: "Spec de la página Ayuda (/help): cómo usar la app, qué hace cada página, mejores prácticas."
---

# SPEC — Página Ayuda (/help)

> Estado: APROBADA para planificar. Independiente de las demás (puede implementarse en paralelo con cualquier spec).

## 1. Problema
El usuario (único, pero olvidadizo) llega a la app y no siempre recuerda qué hace cada página ni cómo sacarle provecho. No hay manual in-app: la única guía está en las notas de Obsidian del proyecto, que no acompañan al producto.

## 2. Solución propuesta
Página `/help` (Ayuda) con contenido estático pero bien estructurado:

1. **Bienvenida**: una línea de qué es CashinsightApp (tu centro de finanzas personales mensuales).
2. **Mapa de la app**: tabla/cards de cada página (Principal, Control, Metas, Reportes, Perfil) con su rol y enlace.
3. **Cómo funciona el ciclo mensual**: explicación clara del cierre día 01, qué pasa con los datos (se compactan a Reportes, nunca se borran), en qué se resetea (progreso) y qué persiste (límites, perfil).
4. **Guías rápidas**:
   - "Cargar mi primer ingreso"
   - "Poner un límite de gasto en Control"
   - "Crear una meta de ahorro"
   - "Leer mi reporte mensual"
5. **Consejos de uso** (2-3 bullets: registrar gastos apenas ocurren, revisar control a mitad de mes, comparar reportes).
6. **FAQ simple** (2-4 preguntas: ¿se borran mis datos?, ¿qué pasa si no cierro el mes?, ¿puedo cambiar la moneda?).

## 3. Usuarios afectados
Único usuario, consultando el manual cuando lo necesite.

## 4. Flujos de usuario
1. Entro a `/help` → leo el mapa de páginas → click en una página → navega directo (link).
2. Consulto "¿se borran mis datos?" → FAQ da la respuesta.

## 5. Requisitos funcionales
- [ ] RF1: Nueva ruta `/help` (protegida: fuera de login, dentro de sesión — ver deciso en plan; propuesta: protegida como el resto).
- [ ] RF2: Página con secciones: Hola, Mapa de páginas (enlaces), Ciclo mensual, Guías rápidas, FAQ.
- [ ] RF3: Uso de `<details>/<summary>` o acordeón accesible para el FAQ (sin JS extra si se puede).
- [ ] RF4: Links internos a las rutas reales (`/control`, `/metas`, `/report`, `/perfil`).
- [ ] RF5: Estática (sin fetch salvo nombre de usuario del header, que ya viene de layout). No requiere API nueva.
- [ ] RF6: Contenido en español, tono directo y útil (estándar de la app).
- [ ] RF7: Nav (AppHeader) agrega "Ayuda" solo como acceso secundario (¿ícono ? en el header o link en footer del layout? decidir en plan).

## 6. Requisitos no funcionales
- **Accesibilidad**: FAQ con `<details>` nativo (teclado OK); headings ordenados (h1 → h2 → h3).
- **SEO/no aplica** (app privada).
- **UI**: estilo brutalist, cards, sin charts.

## 7. Criterios de aceptación
- [ ] Dado que entro a `/help`, cuando navego, entonces veo el mapa con links a todas las páginas y el FAQ funciona con teclado (details/summary).
- [ ] Dado que entro a `/help` sin sesión, cuando hago GET, entonces redirige al login (protegida).
- [ ] Dado el contenido, cuando leo, entonces el texto respeta el tono de la app (voz activa, sin tecnicismos).

## 8. Dependencias
- Layout/header existente (para el link de nav).
- Nada de backend (estática).

## 9. Riesgos
- **"Protegida vs pública"**: si la app es de uso único, /help podría ser pública; pero para consistencia se protege como las demás (menos superficie fuera de auth).
- **Mantenimiento del contenido**: el texto debe actualizarse cuando cambie la app (convención: TODO en el archivo referenciar specs si cambia una ruta).

## 10. Out of Scope
- Tour interactivo/onboarding guiado (eso es /onboarding).
- Videos/screenshots.
- i18n (solo español).
- Búsqueda dentro de la ayuda.