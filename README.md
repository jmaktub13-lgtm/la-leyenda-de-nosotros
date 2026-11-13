# LA LEYENDA DE NOSOTROS
Videojuego web 3D (Three.js) inspirado en la aventura clásica de fantasía. Regalo de aniversario para Madiel.

## Estructura
```
index.html        Pantallas, HUD, menú de pausa, acertijo y escena final (HTML)
css/style.css     Interfaz con estética fantástica
js/main.js        Motor, niveles, minijuegos, colisiones, cinemáticas
js/audio.js       Música y efectos procedurales + reproductor de la canción
.nojekyll         Para GitHub Pages
```
Todos los modelos (Link niño/adulto, Madiel, enemigos, árboles, templo…) y texturas se generan por código: no hay archivos de modelos que se puedan perder. Los sonidos se sintetizan con Web Audio.

## Probar en local
Necesita servidor (los módulos JS no cargan con doble clic) e internet (Three.js 0.160.0 se carga desde jsDelivr).
```
cd leyenda
python3 -m http.server 8000      # o: npx serve
```
Abre http://localhost:8000 en Chrome o Edge.

## Publicar en GitHub Pages
1. Crea un repositorio y sube TODO el contenido de esta carpeta a la raíz (incluido `.nojekyll`).
2. Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
3. En 1-2 minutos estará en `https://TU-USUARIO.github.io/TU-REPO/`.

Para funcionar sin internet: descarga `three.module.js` (v0.160.0) a `lib/` y cambia la ruta en el `importmap` de `index.html`.

## Controles
W A S D / Flechas: mover · Shift: correr · Espacio: saltar · E: interactuar · Ratón: cámara · Clic izquierdo: espada · Esc: pausa
(Si el navegador no activa el bloqueo del ratón: arrastra con clic derecho para girar la cámara.)

## Cómo añadir "La boda de Camilo"
No se incluye la canción por derechos de autor. Tienes tres sitios para cargar tu archivo (mp3, m4a, wav, ogg):
1. Pantalla de inicio: botón «♪ Cargar la canción».
2. En el acertijo: «♪ Seleccionar archivo de audio».
3. Pantalla final: «♪ Elegir canción» (si ya está cargada, suena sola al empezar la escena final).
**Recomendación:** cárgala en la pantalla de inicio, antes de empezar. Si no hay archivo, suena una melodía romántica sintetizada.

## Recorrido del juego
1. **Bosque Kokiri** (Link niño): habla con Kira; 3 fragmentos: cofre en la colina (saltar), luz entre los árboles (exploración) y piedras de las hadas (acertijo de orden). Portal al este.
2. **Llanuras de Hyrule**: prueba de rupees esquivando rocas rodantes (habilidad), 4 criaturas (combate con espada), 3 gemas escondidas. Se abre el Templo.
3. **Templo del Tiempo**: acertijo de símbolos → altar → transformación a Link adulto → prueba de barras giratorias con 3 esferas → portal.
4. **Sala de la Melodía**: 3 pistas → escribe el nombre de la canción (acepta con o sin tildes/mayúsculas).
5. **La Promesa**: escena nocturna con el mensaje completo para Madiel.

## Estado de verificación (honesto)
- Verificado: sintaxis de los módulos JS (`node --check`) y estructura de archivos.
- **No verificado**: ejecución en navegador (el entorno donde se creó no tiene navegador ni acceso a internet). Haz una pasada completa en Chrome y Edge antes de entregarlo, mirando la consola (F12). Si algo falla, copia el error y se corrige.
- Alcance: el estilo visual es de «low-poly» generado por código, más sencillo que un juego comercial. No hay cascadas ni animales; hay arroyo con puente y criaturas enemigas.
