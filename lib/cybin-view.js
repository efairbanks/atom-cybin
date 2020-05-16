'use babel';

export default class CybinView {

  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('cybin');
    this.element.setAttribute('style', 'overflow-y: scroll;')

    atom.workspace.open({
      element: this.element,
      getTitle: () => 'Cybin',
      getURI: () => 'atom://cybin/console-view',
      getDefaultLocation: () => 'bottom'
    }, {activatePane: false});
    atom.workspace.getBottomDock().show();
  }

  message(text) {
    // Create message element
    var message = document.createElement('pre');
    message.textContent = text;
    message.classList.add('message');
    message.setAttribute('style', 'margin: 10px;');
    this.element.appendChild(message);
    this.element.scrollTop = this.element.scrollHeight;
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
    atom.workspace.getBottomDock().hide();
  }

  getElement() {
    return this.element;
  }

}
