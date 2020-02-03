'use babel';

import CybinView from './cybin-view';
import { CompositeDisposable } from 'atom';
const { spawn } = require('child_process');

export default {

  cybinView: null,
  modalPanel: null,
  subscriptions: null,
  cmd: null,

  activate(state) {
    this.cybinView = new CybinView(state.cybinViewState);
    this.cmd = spawn('ls', ['/']);

    this.cmd.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    this.cmd.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    this.cmd.on('exit', (code) => {
      console.log(`Child exited with code ${code}`);
    });
    /*
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.cybinView.getElement(),
      visible: false
    });
    */

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'cybin:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    //this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.cybinView.destroy();
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
  }

};
