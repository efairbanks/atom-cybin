'use babel';

import CybinView from './cybin-view';
import { CompositeDisposable } from 'atom';
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const open = require('open');
const moment = require('moment');

export default {

  config: {
    cybinPath: {
      type: 'string',
      default: 'cybin',
      description: 'Location of Cybin executable.'
    },
    defaultBootFile: {
      type: 'string',
      default: '',
      description: 'Location of optional boot.cybin file that will be run when Cybin is first started.'
    },
    workingDirectory: {
      type: 'string',
      default: '',
      description: 'The directory that Cybin is spawned in. Cybin I/O and module paths (eg. require(\'cylibs.utils\') will be relative to this directory.'
    },
    automaticallyConnectToJACK: {
      type: 'boolean',
      default: true,
      description: 'If enabled, Cybin will automatically connect to the system outputs of the currently running JACK server.'
    },
    renderPath: {
      type: 'string',
      default: '',
      description: 'Location to render offline renders to.'
    },
    renderDuration: {
      type: 'number',
      default: 10,
      description: 'Render duration.'
    }
  },

  cybinView: null,
  modalPanel: null,
  subscriptions: null,
  process: null,
  firstActivation: true,
  activated: false,
  rendering: false,

  enableHighlightingForEditor(editor) {
    if(path.extname(editor.getPath()) == '.cybin') {
      var grammars = atom.grammars.getGrammars().filter(grammar => grammar.name == 'Cybin');
      editor.setGrammar(grammars[0]);
    }
  },

  undefinedIfWhitespace(str){
      return str === null || str.match(/^ *$/) !== null ? undefined : str;
  },

  startCybin(args) {
    var procOptions = {};

    procOptions.cwd = this.undefinedIfWhitespace(atom.config.get('cybin.workingDirectory'));
    if(procOptions.cwd == undefined) procOptions.cwd = path.dirname(atom.workspace.getActiveTextEditor().getPath());

    this.process = spawn( atom.config.get('cybin.cybinPath'),
                          args,
                          procOptions);

    this.process.stdout.on('data', (data) => {
      this.cybinView.message(data.toString());
    });

    this.process.stderr.on('data', (data) => {
      this.cybinView.message(data.toString());
    });

    this.process.on('exit', (code) => {
      this.softDeactivate();
    });
  },

  activate(state) {
    if(!this.activated) {
      if(this.cybinView == null) this.cybinView = new CybinView(state.cybinViewState);

      if(!this.rendering) this.startCybin([]);

      if(this.firstActivation) {
        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that boots this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
          'cybin:boot': () => this.boot(),
          'cybin:hush': () => this.evalString('function __process() return 0 end')
        }));

        this.subscriptions.add(atom.commands.add('atom-text-editor', {
          'cybin:eval': () => this.eval(),
          'cybin:evalBlock': () => this.evalBlock(),
          'cybin:render': () => this.render()
        }));

        this.firstActivation = false;
      }

      if(!this.rendering && atom.config.get('cybin.automaticallyConnectToJACK')) {
        this.evalString("os.execute('jack_connect cybin:audio-out_1 system:playback_1')");
        this.evalString("os.execute('jack_connect cybin:audio-out_2 system:playback_2')");
      }

      if(this.chooseBootFilePath()) {
        this.evalString("dofile('"+this.chooseBootFilePath()+"')");
      }

      this.activated = true;
    }
  },

  chooseBootFilePath() {
    var defaultBootFileName = 'boot.cybin';
    var editor = atom.workspace.getActiveTextEditor();
    var bootFilePath = path.join(path.dirname(editor.getPath()), defaultBootFileName);
    if(fs.existsSync(bootFilePath)) {
      return bootFilePath;
    }
    if(atom.config.get('cybin.workingDirectory')) {
      bootFilePath = path.join(atom.config.get('cybin.workingDirectory'), defaultBootFileName);
      if(fs.existsSync(bootFilePath)) return bootFilePath;
    }
    if(atom.config.get('cybin.defaultBootFile')) {
      bootFilePath = atom.config.get('cybin.defaultBootFile');
      if(fs.existsSync(bootFilePath)) return bootFilePath;
    }
    return null;
  },

  softDeactivate() {
    if(this.process != null) {
      this.process.kill();
      this.process = null;
    }
    this.activated = false;
  },

  deactivate() {
    this.softDeactivate();
    this.cybinView.destroy();
    this.subscriptions.dispose();
  },

  serialize() {
    return {
      cybinViewState: this.cybinView.serialize()
    };
  },

  boot() {
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

  // --- MAPPABLE ACTIONS --- //

  render() {
    if(this.rendering) return;
    var renderHelper = () => {
      this.rendering = true;
      var renderPath = this.undefinedIfWhitespace(atom.config.get('cybin.renderPath'));
      if(renderPath == undefined) renderPath = path.dirname(atom.workspace.getActiveTextEditor().getPath());
      var outPath = path.join(renderPath, path.basename(atom.workspace.getActiveTextEditor().getPath(),'.cybin')+'_'+moment().format('YYYY-MM-DD_HH-mm-ss')+'.wav');
      var renderDuration = parseFloat(atom.config.get('cybin.renderDuration'));
      if(renderDuration == NaN || renderDuration <= 0) renderDuration = 10;
      var args = [atom.workspace.getActiveTextEditor().getPath(), '--offline', outPath, '--duration', renderDuration.toString()];
      if(this.chooseBootFilePath()) args.unshift(this.chooseBootFilePath());
      this.startCybin(args);
      this.process.on('exit', (code) => {
        this.rendering = false;
        this.softDeactivate();
        if(code == 0) {
          open(outPath);
        }
      })
    };
    if(this.process) {
      this.process.on('exit', renderHelper);
      this.process.kill();
    } else {
      renderHelper();
    }
  },

  eval() {
    if(this.rendering) return;
    this.activate();
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
    if(this.rendering) return;
    this.activate();
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
    if(this.rendering) return;
    atom.notifications.addInfo("hush", {});
  }
};
