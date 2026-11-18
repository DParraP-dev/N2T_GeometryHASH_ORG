<p align="center">
  <img src=".github/banner.webp" alt="Hack Dash: el cubo cruza un portal y toda la pantalla se invierte" width="100%" />
</p>

<h1 align="center">Hack Dash</h1>

<p align="center"><em>Un cubo, dos mundos y un solo botón. Un juego de plataformas en Jack que invierte sus colores y su gravedad en cada portal.</em></p>

<p align="center">
  <img alt="Jack" src="https://img.shields.io/badge/Jack-Nand2Tetris-1F6FEB?style=flat" />
  <img alt="Hack 16 bits" src="https://img.shields.io/badge/Hack-16_bits-555555?style=flat" />
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-c8542a?style=flat" />
  <img alt="status WIP" src="https://img.shields.io/badge/status-WIP-e0a642?style=flat" />
</p>

Hack Dash es un juego de reflejos escrito por completo en Jack para la
computadora Hack de Nand2Tetris. Un cubo avanza sin detenerse y el jugador
solo decide cuándo saltar. Cada portal suma un punto, invierte todos los
colores de la pantalla, lleva la acción del suelo al techo y acelera el
mundo. Es el proyecto final de Organización de Computadores 2026.

> **Video de demostración (YouTube):** (https://youtu.be/0AmxvXpkcjk). Se agrega aquí antes de la sustentación._

## Integrantes

- Pablo Manjarres
- Daniel Parra Paternina
- Andrés Felipe Rengifo Zapata

## Cómo se juega

| Tecla | Acción |
|-------|--------|
| `ESPACIO` o `↑` | Saltar. En el techo el salto va hacia abajo. |
| `ESPACIO` en la portada o tras perder | Empezar o reintentar. |

| Portada | Fase de suelo |
|:-------:|:-------------:|
| <img src="docs/img/portada.png" alt="Portada de Hack Dash" width="400" /> | <img src="docs/img/fase-1.png" alt="Fase de suelo con pinchos" width="400" /> |
| **Fase de techo invertida** | **Fin de partida** |
| <img src="docs/img/fase-2.png" alt="Fase de techo con colores invertidos" width="400" /> | <img src="docs/img/game-over.png" alt="Cartel de fin de partida" width="400" /> |

### Mecánicas

- **Fase de suelo.** El cubo corre de izquierda a derecha sobre el suelo y
  salta grupos de 1 a 3 pinchos. La distancia entre grupos es aleatoria.
- **Portal.** Tras 5 grupos de pinchos aparece un aro que ocupa toda la
  altura. Cruzarlo suma un punto e invierte la paleta: fondo blanco con
  elementos negros pasa a fondo negro con elementos blancos.
- **Fase de techo.** Al otro lado del portal la gravedad apunta hacia
  arriba. El cubo cuelga del techo, va de cabeza, avanza de derecha a
  izquierda y los pinchos cuelgan del techo. El siguiente portal lo
  devuelve al suelo.
- **Velocidad progresiva.** Cada portal sube la velocidad del mundo, de
  5 a 20 píxeles por tick.
- **Fase de nave (etapas múltiplo de 5).** Cada cinco etapas el cubo se
  comporta como una nave: mantener `ESPACIO` lo hace ascender y soltarlo
  lo hace descender, con aceleración suave. En vez de saltar pinchos, hay
  que volar a través de paredes con un hueco. La misma física del salto,
  con impulso continuo en lugar de puntual.

### Factor diferenciador

Los juegos en Jack que suelen encontrarse en línea (el Pong del curso,
Snake, Tetris, corredores sin fin) mantienen un solo plano y una sola
paleta durante toda la partida. Hack Dash cambia sus reglas a mitad de la
partida: invierte los colores en tiempo real, muda la acción del suelo al
techo con la gravedad al revés, escala la velocidad en cada etapa y añade
una fase de nave con vuelo y paredes cada cinco etapas, todo dentro de los
límites de la plataforma Hack.

## Lo más destacado

- **Cero memoria reservada durante el juego.** `Game.jack` crea todos los
  objetos una vez y `reset()` los reutiliza en cada intento, porque el
  `Memory.alloc` del OS no fusiona bloques libres. La versión anterior
  creaba un `String` por tick y se caía con `ERR6` a los ~570 ticks. Ahora
  el heap queda fijo en 13 505 palabras durante 2000 ticks con cuatro
  partidas seguidas.
- **Movimiento sin parpadeo.** `Renderer.shiftSpan` pinta solo el borde que
  entra y borra el que sale: dos rectángulos por franja, sin importar su
  largo. Pinchos y portal son listas de franjas (`Strips.jack`).
- **Un solo valor invierte toda la paleta.** `Renderer.jack` es la única
  fuente del color y `Font.jack` trae una fuente propia de 40 caracteres
  de 3x5 guardados en enteros de 15 bits, para que el texto también se
  invierta (el `Output` del OS pinta letras negras sobre celdas blancas).
- **Las mismas ecuaciones para el suelo y el techo.** `Player.jack`
  multiplica la gravedad y el impulso por `dir = ±1`. El salto sube 72 px
  y dura unos 16 ticks.
- **Aleatorio de 16 bits sin desbordes.** `Random.jack` usa el método de
  Schrage, verificado contra el módulo exacto en los 30 268 estados. La
  semilla son los ticks que tarda el jugador en pulsar ESPACIO.
- **Probado en el VM Emulator oficial.** El juego se compila y se ejecuta
  en el simulador de nand2tetris; una partida sostiene decenas de portales
  manteniendo el heap estable.

## Requisitos técnicos de la evaluación

| Requisito | Cómo se cumple |
|-----------|----------------|
| Interactividad por teclado sin lectura bloqueante | `Input.isJump()` consulta `Keyboard.keyPressed()` en cada tick. Nunca se usa `readChar` ni `readLine`. |
| Fondo móvil o entorno dinámico | Pinchos y portal se desplazan sin parar, las muescas del suelo o del techo avanzan con el mundo, dos capas de estrellas en forma de X cruzan el fondo con paralaje y la paleta se invierte en cada portal. |
| Comportamiento físico modelado | `Player.update()` integra gravedad y velocidad en cada tick: el salto describe una parábola y la fase de nave vuela con impulso continuo. |
| Marcador visible y dinámico | `Hud` muestra puntos, velocidad y fase, y redibuja el puntaje al cruzar cada portal. |

## Cómo funciona

```text
HackDash/            # el programa Jack: esta carpeta se carga en el VM Emulator
  Main.jack          # portada -> partida -> reintentar
  Title.jack         # portada; devuelve la semilla aleatoria
  Input.jack         # teclado sin bloqueo
  Game.jack          # bucle principal, generación, colisiones, cambios de fase
  Player.jack        # el cubo y su física
  Spikes.jack        # grupos de pinchos reciclados
  Portal.jack        # aro de transición
  Strips.jack        # figuras hechas de franjas que se mueven sin parpadeo
  Wall.jack          # paredes con hueco de las fases de nave
  Scenery.jack       # muescas que avanzan con el mundo
  Starfield.jack     # estrellas con paralaje dibujadas con XOR
  Renderer.jack      # color, recorte y dibujo incremental
  Font.jack          # fuente de 3x5 que se invierte con los colores
  Hud.jack           # marcador y carteles
  Random.jack        # números pseudoaleatorios de 16 bits
docs/                # arquitectura y capturas
```

`Main` muestra la portada y crea un único `Game`. En cada tick, `Game` lee
el teclado, integra la física del cubo, mueve pinchos, portal y muescas, y
revisa el cruce del portal y los choques. Todo el dibujo pasa por
`Renderer`, que sabe si la paleta está invertida. La explicación completa,
con diagramas para la sustentación, está en
[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Tecnología

Jack · VM de Nand2Tetris con el OS integrado · Hack, pantalla de 512x256 monocromática y enteros de 16 bits

## Cómo ejecutarlo

### En el VM Emulator del curso

1. Compila la carpeta con el `JackCompiler` de la suite de Nand2Tetris (la
   carpeta `tools/` de la suite, no la de este repositorio):
   `JackCompiler.sh ruta/a/HackDash` en macOS o Linux, o
   `JackCompiler.bat ruta\a\HackDash` en Windows. Se crean los `.vm`
   dentro de `HackDash/`.
2. Abre el **VM Emulator** y carga la carpeta `HackDash` con *Load Program*.
3. Elige *No animation* y lleva la velocidad al máximo.
4. Pulsa *Run*. Si el juego no responde a las teclas, haz clic en el botón
   del teclado del emulador.

Usa el VM Emulator, no el CPU Emulator: el VM Emulator ejecuta las
funciones del OS (`Screen`, `Keyboard`) de forma nativa, y el juego dibuja
cientos de rectángulos por tick.

## Licencia

MIT. Ver [LICENSE](LICENSE).

---

<p align="center">Organización de Computadores · 2026</p>
