# Cybin plugin for Atom

For info on installing Cybin, please visit:
  https://github.com/efairbanks/cybin

Then, _(after you install this Atom plugin)_ you can:
  * Open a `.cybin` file
  * `shift+enter` to evaluate the current line or selection
  * `(cmd/ctrl)+enter` to evaluate multiple-lines or selection

Here's the simplest possible example code you can run in Cybin. Cybin looks for a function called `__process` and, if it exists, executes it `cybin.samplerate`-times-per-second, pumping the result out of your sound card into your speakers/headphones.

```lua
function __process()
  local out=math.random()
  return out,out
end
```

The current hotkeys will work if you are currently editing a `.cybin` file:

```
shift-ctrl-c:   cybin:boot
shift-cmd-c:    cybin:boot
shift-enter:    cybin:eval
cmd-enter:      cybin:evalBlock
ctrl-enter:     cybin:evalBlock
shift-cmd-h:    cybin:hush
shift-ctrl-h:   cybin:hush
```

## Configuration

### Cybin Path

By default the plugin will assume that `cybin` is in your `$PATH`. Please point it to the correct location if you have not added `cybin` to your path, or if you encounter issues launching `cybin` from Atom.

### Working Directory

This sets Cybin's current working directory. Module imports _(calls to `require()`)_ will be relative to this path. The plugin will get very upset and throw inscrutable errors if you set this to an invalid/non-existent directory.
