# meatamp

Open web app that plays video game music files, include NSF, SPC, and GBS files.

## Developer Setup

The steps below assume you have [Emscripten](http://emscripten.org) and
[Node.js](http://nodejs.org/) installed.

1. Install the [Grunt](http://gruntjs.com/) CLI: `npm install -g grunt-cli`
2. Install the grunt plugins locally: `npm install`
3. Compile the C library with emscripten using `grunt compile`.
4. Run the development server with `grunt runserver`. It should be available at
   http://localhost:8000.
5. (Optional) Configure `package.json` to point to your own Github repo and run
   `grunt deploy` to deploy the src directory to Github Pages.

### Notes
 - Any updates to files in the `src` folder will require you to re-compile the
 - C library using the `grunt compile` command.

There are sample music files in the `sample_music` folder for testing playback.

## License

- Meatamp is licensed under the  MIT license. See `LICENSE_MIT` for more info.
- Game_Music_Emu library is licensed under the LGPL v2.1. See
  `src/game_music_emu/license.txt` for details.
