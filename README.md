# GeometryHash — "Hack Dash"

> Videojuego de plataformas y reflejos desarrollado **íntegramente en lenguaje Jack** sobre la plataforma **Nand2Tetris (N2T)**.
> Proyecto de la asignatura **Organización de Computadores — 2026**.

---

## 1. Concepto del juego

**Hack Dash** es un juego de un solo botón. Un cubo avanza de forma **continua y automática** por el escenario; el jugador solo controla el **salto**, calculando con precisión el momento para esquivar los obstáculos que aparecen en su camino.

El factor diferenciador es que el juego **cambia sus propias reglas a mitad de partida**: al cruzar un portal invierte los colores de la pantalla en tiempo real, traslada la acción del suelo al techo e incrementa la velocidad de forma progresiva.

| Fase | Mecánica |
|------|----------|
| **Fase 1** | Avance de izquierda a derecha en la parte inferior. Salto sobre el suelo para esquivar obstáculos. |
| **Portal** | Al cruzarlo: +1 punto e **inversión de colores** (fondo blanco/negro ↔ negro/blanco). |
| **Fase 2** | *(en desarrollo)* Inversión espacial: la acción pasa al **techo**, el cubo va de derecha a izquierda y la **velocidad aumenta** progresivamente. |

---

## 2. Estado actual

- ✅ **Fase 1 implementada**: avance continuo, salto con física (gravedad), obstáculos reciclados, detección de colisiones, puntaje en pantalla y game over.
- 🔜 **Portal + inversión de colores** (la arquitectura ya está preparada: ver `Renderer`).
- 🔜 **Fase 2**: techo, movimiento inverso y velocidad progresiva.

---

## 3. Arquitectura del proyecto

El proyecto sigue un diseño **orientado a objetos con una clase por archivo** (requisito de desarrollo de alto nivel en Jack). La responsabilidad de cada clase está deliberadamente separada para que las mecánicas diferenciadoras (inversión de color, cambio de plano) se puedan añadir tocando el menor número de clases posible.

### 3.1 Diagrama de clases

```
                         ┌─────────────┐
                         │    Main     │   Punto de entrada (Main.main)
                         └──────┬──────┘
                                │ crea y ejecuta
                                ▼
                         ┌─────────────┐
                         │    Game     │   Orquestador: game loop, input,
                         │ (game loop) │   colisiones, puntaje, estado
                         └──┬───┬───┬──┘
              usa (dibujo)  │   │   │  posee
           ┌────────────────┘   │   └────────────────┐
           ▼                    ▼                     ▼
    ┌─────────────┐      ┌─────────────┐       ┌─────────────┐
    │  Renderer   │◄─────│   Player    │       │  Obstacle   │
    │  (color +   │ usa  │  (física    │       │ (movimiento │
    │   dibujo)   │◄─────│   de salto) │       │  + reciclaje)│
    └─────────────┘ usa  └─────────────┘       └─────────────┘
```

- `Game` **posee** a `Player` y `Obstacle` y los coordina.
- `Player` y `Obstacle` **usan** `Renderer` para dibujarse, sin saber nada del color actual.
- `Renderer` es la **única fuente de verdad del color**, lo que hace la inversión trivial.

### 3.2 Responsabilidad de cada clase

| Archivo | Clase | Responsabilidad |
|---------|-------|-----------------|
| `Main.jack` | `Main` | Punto de entrada. Crea `Game`, lo ejecuta y libera memoria. Deliberadamente mínimo. |
| `Game.jack` | `Game` | **Orquestador.** Mantiene el bucle principal, lee el teclado sin bloquear, actualiza física y obstáculos, detecta colisiones (AABB), lleva el puntaje y controla el estado (jugando / game over). |
| `Player.jack` | `Player` | El cubo del jugador. Encapsula posición y **física de salto** (cinemática con gravedad → arco parabólico). |
| `Obstacle.jack` | `Obstacle` | Un obstáculo a esquivar. Se desplaza y se **recicla** al salir de pantalla (evita fragmentar la escasa RAM). |
| `Renderer.jack` | `Renderer` | Capa de abstracción sobre `Screen`. **Centraliza el color** (tinta/fondo) y resuelve la **inversión** con un único método. |

### 3.3 Decisiones de diseño clave

1. **El mundo se mueve, no el cubo.** En Fase 1 la X del cubo es fija y los obstáculos se desplazan hacia él. Esto produce la *sensación de movimiento* (requisito "Fondo Móvil / Entorno Dinámico") de forma económica.
2. **Color centralizado en `Renderer`.** Ninguna clase conoce el color concreto; piden "pinta tinta" o "pinta fondo". Invertir toda la paleta es **un solo `toggleInvert()`**.
3. **Reciclaje de objetos.** Los obstáculos no se crean/destruyen; se reposicionan. La RAM de la plataforma Hack es muy limitada.
4. **Input no bloqueante.** Se usa `Keyboard.keyPressed()` (no `readChar`/`readLine`), para que el bucle nunca se detenga — requisito explícito de "Interactividad por Teclado".

---

## 4. Modelo físico (comportamiento matemático)

El salto del cubo cumple el requisito **"Comportamiento Físico Modelado"**. Es una integración cinemática discreta por tick:

```
vy  ←  vy + gravity        (la gravedad acelera hacia abajo)
y   ←  y  + vy             (se actualiza la posición vertical)
```

Al saltar se fija `vy` a un impulso negativo (hacia arriba, pues en pantalla `y` crece hacia abajo). La gravedad lo frena y lo devuelve al suelo describiendo un **arco parabólico**. Un flag `onGround` evita el doble salto.

---

## 5. Requisitos técnicos de la rúbrica — cobertura

| Requisito (rúbrica) | Cómo se cumple |
|---------------------|----------------|
| **Interactividad por teclado** (sin lectura bloqueante) | `Game.handleInput()` usa `Keyboard.keyPressed()` cada tick. |
| **Comportamiento físico modelado** | `Player.update()` integra gravedad y velocidad (salto parabólico). |
| **Visualización de puntaje** | `Game.drawScore()` imprime el marcador y se actualiza cada tick. |
| **Fondo móvil / entorno dinámico** | Obstáculos en desplazamiento continuo + (futuro) inversión de plano. |

---

## 6. Controles

| Tecla | Acción |
|-------|--------|
| **Barra espaciadora** o **Flecha ↑** | Saltar |

---

## 7. Especificaciones de la plataforma

- **Pantalla:** 512 × 256 px, monocromática (`Screen.setColor(true)` = negro).
- **Entrada:** `Keyboard.keyPressed()` (espacio = 32, flecha arriba = 131).
- **Ritmo:** `Sys.wait(ms)` controla la velocidad del bucle.

---

## 8. Estructura de archivos

```
GeometryHash/
├── README.md
└── src/
    ├── Main.jack        Punto de entrada
    ├── Game.jack        Orquestador / game loop
    ├── Player.jack      Cubo + física de salto
    ├── Obstacle.jack    Obstáculos + reciclaje
    └── Renderer.jack    Dibujo + color/inversión
```

---

## 9. Cómo compilar y ejecutar

> El equipo usa un script `traductorVM` propio para traducir el programa a assembler; el flujo general en N2T es:

1. Compilar los `.jack` de `src/` con el **Jack Compiler** → genera los `.vm`.
2. Cargar la carpeta en el **VM Emulator** de la N2T Software Suite (o traducir a `.asm` con el traductor VM y correr en el **CPU Emulator**).
3. Ejecutar. El juego arranca en la pantalla de juego de la Fase 1.

---

## 10. Equipo

Proyecto grupal — Organización de Computadores, 2026.

_(Añadir aquí los integrantes del grupo.)_
