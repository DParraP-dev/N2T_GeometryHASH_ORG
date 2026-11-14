# Herramientas de desarrollo

Scripts en Node para compilar y probar Hack Dash sin abrir el VM Emulator.
Usan el simulador oficial de nand2tetris
([nand2tetris/web-ide](https://github.com/nand2tetris/web-ide)), el mismo que
corre en el IDE web del curso.

## Preparar el simulador (una vez)

```bash
git clone --depth 1 https://github.com/nand2tetris/web-ide.git ~/.local/share/nand2tetris/web-ide
cd ~/.local/share/nand2tetris/web-ide
npm install --workspace=projects --workspace=runner --workspace=simulator --ignore-scripts
npm install --no-save --ignore-scripts typescript@^7.0 @types/node
npm run build -w projects && npm run build -w runner && npm run build -w simulator
```

Si lo clonas en otra ruta, exporta `N2T_WEB_IDE=/ruta/al/web-ide`.

## Scripts

| Script | Qué hace |
|--------|----------|
| `node tools/build.mjs HackDash` | Compila los `.jack` a `build/HackDash/*.vm` (carpeta lista para el VM Emulator). |
| `node tools/sim.mjs HackDash --frames 600 --press 5:32 --shot 300:out/a.png` | Ejecuta el juego sin interfaz, simula teclas y guarda capturas de la pantalla Hack. |

En `sim.mjs` un *frame* es una llamada a `Sys.wait`, así que cada corrida es
determinista. El reporte indica si el programa terminó con un error del OS
(`ERRn`) y cuánta memoria libre queda en el heap, lo que permite detectar fugas.

Códigos de tecla útiles: espacio = `32`, flecha arriba = `131`.
