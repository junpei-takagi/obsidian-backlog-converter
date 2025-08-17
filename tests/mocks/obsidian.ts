// Mock implementation of Obsidian API for testing

export class Plugin {
  app: any;
  manifest: any;
  
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData(): Promise<any> {
    return {};
  }

  async saveData(data: any): Promise<void> {
    // Mock implementation
  }

  addRibbonIcon(icon: string, title: string, callback: (evt: MouseEvent) => void): any {
    return {};
  }

  addStatusBarItem(): any {
    return {
      setText: jest.fn(),
      addClass: jest.fn(),
      onclick: null,
    };
  }

  addCommand(command: any): void {
    // Mock implementation
  }

  addSettingTab(settingTab: any): void {
    // Mock implementation
  }
}

export class Editor {
  getValue(): string {
    return '';
  }

  setValue(value: string): void {
    // Mock implementation
  }
}

export class MarkdownView {
  editor: Editor = new Editor();
}

export class Modal {
  app: any;
  
  constructor(app: any) {
    this.app = app;
  }

  open(): void {
    // Mock implementation
  }

  close(): void {
    // Mock implementation
  }

  onOpen(): void {
    // Mock implementation
  }

  onClose(): void {
    // Mock implementation
  }
}

export class Notice {
  constructor(message: string) {
    // Mock implementation
  }
}

export class PluginSettingTab {
  app: any;
  plugin: any;

  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
  }

  display(): void {
    // Mock implementation
  }
}

export class Setting {
  constructor(containerEl: any) {
    // Mock implementation
  }

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  addText(callback: (text: any) => void): this {
    const mockText = {
      setPlaceholder: jest.fn().mockReturnThis(),
      setValue: jest.fn().mockReturnThis(),
      onChange: jest.fn().mockReturnThis(),
    };
    callback(mockText);
    return this;
  }

  addToggle(callback: (toggle: any) => void): this {
    const mockToggle = {
      setValue: jest.fn().mockReturnThis(),
      onChange: jest.fn().mockReturnThis(),
    };
    callback(mockToggle);
    return this;
  }

  addButton(callback: (button: any) => void): this {
    const mockButton = {
      setButtonText: jest.fn().mockReturnThis(),
      onClick: jest.fn().mockReturnThis(),
    };
    callback(mockButton);
    return this;
  }
}

export class Menu {
  addItem(callback: (item: any) => void): this {
    const mockItem = {
      setTitle: jest.fn().mockReturnThis(),
      setIcon: jest.fn().mockReturnThis(),
      onClick: jest.fn().mockReturnThis(),
    };
    callback(mockItem);
    return this;
  }

  addSeparator(): this {
    return this;
  }

  showAtMouseEvent(evt: MouseEvent): void {
    // Mock implementation
  }
}

export class App {
  workspace: any = {
    getActiveViewOfType: jest.fn(() => new MarkdownView()),
  };
  
  setting: any = {
    open: jest.fn(),
    openTabById: jest.fn(),
  };
}
