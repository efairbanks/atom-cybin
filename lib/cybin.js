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
    this.process = spawn('cybin', [], {cwd: '/Users/ericfai/cybin/examples/songs'});

    this.process.stdout.on('data', (data) => {
      this.cybinView.message(data.toString());
    });

    this.process.stderr.on('data', (data) => {
      this.cybinView.message(data.toString());
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

  getCurrentParagraphBufferRange() {
    editor = atom.workspace.getActiveTextEditor();
    cursor = editor.getLastCursor();
    startRow = endRow = cursor.getBufferRow();
    while(editor.lineTextForBufferRow(startRow)) startRow--;
    while(editor.lineTextForBufferRow(endRow)) endRow++;
    return {  start: { row: startRow + 1, column: 0 },
              end: { row: endRow, column: 0 }};
  },

  evalString(string) {
    var s = string;
    s = s.replace(/(\r\n|\n|\r)/gm, "\r");
    this.process.stdin.write(s);
    this.process.stdin.write("\n");
  },

  blinkRange(range) {
    var editor = atom.workspace.getActiveTextEditor();
    var marker = editor.markBufferRange(range, {invalidate: 'touch'});
    var decoration = editor.decorateMarker(marker, {type: 'line', class: 'highlight'});
    setTimeout(() => marker.destroy(), 120);
  },

  eval() {
    var editor = atom.workspace.getActiveTextEditor();
    if(editor) {
      var selection = editor.getLastSelection();
      var selectionText = selection.getText();
      var range=selection.getBufferRange();
      if(!selectionText) {
        var cursor = editor.getCursors()[0];
        range = cursor.getCurrentLineBufferRange();
        selectionText = range && editor.getTextInBufferRange(range);
      }
      this.blinkRange(range);
      this.evalString(selectionText);
    }
  },

  evalBlock() {
    var editor = atom.workspace.getActiveTextEditor();
    if(editor) {
      if(editor.getLastSelection().getText()) {
        this.eval();
      } else {
        var selectionRange = this.getCurrentParagraphBufferRange();
        this.blinkRange(selectionRange);
        var selection = editor.getTextInBufferRange(selectionRange);
        this.evalString(selection);
      }
    }
  },

  hush() {
    atom.notifications.addInfo("hush", {});
  }
};
