# Entrenos

App de seguimiento de entrenamiento hecha con Angular 18 (standalone + signals).
Sin backend: todo se guarda en `localStorage` del dispositivo.

## Funciones
- Crear, renombrar, duplicar y eliminar días de entrenamiento.
- Cada día es una tabla: Ejercicio, Series, Reps, Peso, Descanso y Enlace de referencia.
- Todos los valores se editan directamente en la tabla.
- Guardado automático en cada cambio (persiste al recargar o cerrar la app).
- Añadir y eliminar ejercicios.
- Responsive: en móvil cada fila se convierte en una tarjeta.
- PWA: se puede instalar en iPhone, Android, Windows, macOS y Linux, y funciona sin conexión.

## Requisitos
Node.js 18.19+ (recomendado 20 o 22) y npm.

## Desarrollo
```bash
npm install
npm start
```
Abre http://localhost:4200. Para probar desde el móvil en la misma wifi, usa la IP de tu PC (ej. http://192.168.1.20:4200).

## Producción
```bash
npm run build
```
Sale en `dist/entrenos/browser`. Súbela a cualquier hosting estático (Netlify, Vercel, GitHub Pages, Cloudflare Pages…). Funciona en subcarpetas porque se compila con `--base-href ./`.

## Instalar en el móvil
- **iPhone (Safari):** Compartir → "Añadir a pantalla de inicio".
- **Android (Chrome):** menú ⋮ → "Instalar aplicación".
- **PC (Chrome/Edge):** icono de instalar en la barra de direcciones.

> Nota: el service worker y la instalación requieren HTTPS (o localhost).
> Los datos viven en el navegador de cada dispositivo: no se comparten entre móvil y PC.
> Si borras los datos del sitio en el navegador, se pierden los entrenos.
