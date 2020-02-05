'use babel';

import CybinView from './cybin-view';
import { CompositeDisposable } from 'atom';
const { spawn } = require('child_process');
var path = require('path');

export default {

  cybinView: null,
  modalPanel: null,
  subscriptions: null,
  process: null,

  enableHighlightingForEditor(editor) {
    if(path.extname(editor.getPath()) == '.cybin') {
      var grammars = atom.grammars.getGrammars().filter(grammar => grammar.name == 'Cybin');
      editor.setGrammar(grammars[0]);
    }
  },

  activate(state) {
    this.cybinView = new CybinView(state.cybinViewState);
    this.process = spawn('/home/eris/.bin/cybin', [], {cwd: '/home/eris/cybin/examples/songs'});

    this.process.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    this.process.stderr.on('data', (data) => {
      console.log(data.toString());
    });

    this.process.on('exit', (code) => {
      console.log(`Child exited with code ${code}`);
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'cybin:toggle': () => this.toggle()
    }));

    this.subscriptions.add(atom.commands.add('atom-text-editor', {
      'cybin:eval': () => this.eval(),
      'cybin:evalBlock': () => this.evalBlock()
    }));

    this.subscriptions.add(atom.workspace.observeTextEditors(editor => {
      //this.enableHighlightingForEditor(editor);
    }));
  },

  deactivate() {
    //this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.cybinView.destroy();
    this.process.kill()
  },

  serialize() {
    return {
      cybinViewState: this.cybinView.serialize()
    };
  },

  toggle() {
    console.log('Cybin was toggled!');
    /*
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );*/
  },

  eval() {
    atom.notifications.addInfo("eval", {});
    var editor = atom.workspace.getActiveTextEditor();
    if(editor) {
      selection = editor.getSelectedText();
      selection = selection.replace(/(\r\n|\n|\r)/gm, "\r");
      this.process.stdin.write(selection);
      this.process.stdin.write("\n");
    }
  },

  evalBlock() {
    atom.notifications.addInfo("evalBlock", {});
  },

  hush() {
    atom.notifications.addInfo("hush", {});
  }
};
