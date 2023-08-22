import type { Disposable, InputBox, QuickInput, QuickInputButton, QuickPick, QuickPickItem } from "vscode";
import { QuickInputButtons, ThemeIcon, window } from "vscode";
import i18n from "../i18n/index.js";

const enum InputFlowAction {
  back,
  forward,
  cancel,
}

export type InputStep = (input: MultiStepInput) => Promise<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
  title: string;
  step: number;
  totalSteps?: number;
  items: readonly T[];
  // activeItems?: readonly T[];
  placeholder?: string;
  changeCallback?: (input: QuickPick<T>, value: string) => void;
}

interface InputBoxParameters {
  title: string;
  step: number;
  totalSteps?: number;
  value?: string;
  prompt?: string;
  password?: boolean;
  changeCallback?: (input: InputBox, value: string) => void;
}

const pickButtons: {
  forward: QuickInputButton;
  previous: QuickInputButton;
  next: QuickInputButton;
  close: QuickInputButton;
} = {
  forward: { iconPath: new ThemeIcon("arrow-right"), tooltip: i18n.word.forward },
  previous: { iconPath: new ThemeIcon("arrow-up"), tooltip: i18n.word.previousPage },
  next: { iconPath: new ThemeIcon("arrow-down"), tooltip: i18n.word.nextPage },
  close: { iconPath: new ThemeIcon("close"), tooltip: i18n.word.close },
};

export const enum ButtonAction {
  previous,
  next,
}
interface ButtonOption {
  previous?: boolean;
  next?: boolean;
}

interface QuickPickOption extends ButtonOption {
  canSelectMany?: true;
}

export class MultiStepInput {
  #step = 0;

  #current?: QuickInput;

  readonly #steps: InputStep[] = [];

  static run(start: InputStep): Promise<void> {
    const input = new MultiStepInput();
    return input.#stepThrough(start);
  }

  stay(step?: InputStep): InputStep {
    --this.#step;
    if (step) this.#steps[this.#step] = step;
    return this.#steps[this.#step];
  }

  async showQuickPick<T extends QuickPickItem>(_: QuickPickParameters<T>): Promise<T>;
  async showQuickPick<T extends QuickPickItem>(
    _: QuickPickParameters<T> & { canSelectMany: true },
  ): Promise<readonly T[]>;
  async showQuickPick<T extends QuickPickItem>(
    _: QuickPickParameters<T> & Required<ButtonOption>,
  ): Promise<T | ButtonAction>;
  async showQuickPick<T extends QuickPickItem>(
    _: QuickPickParameters<T> & Required<QuickPickOption>,
  ): Promise<readonly T[] | ButtonAction>;

  showQuickPick<T extends QuickPickItem>({
    title,
    step,
    totalSteps,
    items,
    // activeItems,
    placeholder,
    changeCallback,
    canSelectMany,
    previous,
    next,
  }: QuickPickParameters<T> & QuickPickOption): Promise<readonly T[] | T | ButtonAction> {
    const disposables: Disposable[] = [];

    return new Promise<readonly T[] | T | ButtonAction>((resolve, reject) => {
      const input = window.createQuickPick<T>();
      input.canSelectMany = !!canSelectMany;
      input.matchOnDescription = true;
      input.matchOnDetail = true;
      input.ignoreFocusOut = true;
      input.title = title;
      input.step = step;
      input.totalSteps = Math.max(totalSteps || 1, this.#step, this.#steps.length);
      input.placeholder = placeholder;
      input.items = items;
      /* if (activeItems) {
            input.activeItems = activeItems;
          } */
      const button: QuickInputButton[] = [];
      if (previous) button.push(pickButtons.previous);
      if (next) button.push(pickButtons.next);
      input.buttons = [
        ...(this.#step > 1 ? [QuickInputButtons.Back] : []),
        ...button,
        ...(this.#step < this.#steps.length ? [pickButtons.forward] : []),
        pickButtons.close,
      ];
      disposables.push(
        input.onDidTriggerButton((item) => {
          switch (item) {
            case QuickInputButtons.Back:
              return reject(InputFlowAction.back);
            case pickButtons.forward:
              return reject(InputFlowAction.forward);
            case pickButtons.previous:
              return resolve(ButtonAction.previous);
            case pickButtons.next:
              return resolve(ButtonAction.next);
            default:
              return input.hide();
          }
        }),
        input.onDidAccept(() => resolve(canSelectMany ? input.selectedItems : input.selectedItems[0])),
        input.onDidHide(() => reject(InputFlowAction.cancel)),
      );
      if (changeCallback) disposables.push(input.onDidChangeValue((value) => changeCallback(input, value)));
      if (this.#current) this.#current.dispose();
      this.#current = input;
      this.#current.show();
    }).finally(() => disposables.forEach((d) => void d.dispose()));
  }

  showInputBox({
    title,
    step,
    totalSteps,
    value,
    prompt,
    password,
    changeCallback,
  }: InputBoxParameters): Promise<string> {
    const disposables: Disposable[] = [];

    return new Promise<string>((resolve, reject) => {
      const input = window.createInputBox();
      input.ignoreFocusOut = true;
      input.title = title;
      input.step = step;
      input.totalSteps = Math.max(totalSteps || 1, this.#step, this.#steps.length);
      input.value = value || "";
      input.prompt = prompt;
      input.buttons = [
        ...(this.#step > 1 ? [QuickInputButtons.Back] : []),
        ...(this.#step < this.#steps.length ? [pickButtons.forward] : []),
        pickButtons.close,
      ];
      input.password = password || false;
      disposables.push(
        input.onDidTriggerButton((item) => {
          switch (item) {
            case QuickInputButtons.Back:
              return reject(InputFlowAction.back);
            case pickButtons.forward:
              return reject(InputFlowAction.forward);
            default:
              return input.hide();
          }
        }),
        input.onDidAccept(() => resolve((value = input.value))),
        input.onDidHide(() => reject(InputFlowAction.cancel)),
      );
      if (changeCallback) disposables.push(input.onDidChangeValue((value) => changeCallback(input, value)));
      if (this.#current) this.#current.dispose();
      this.#current = input;
      this.#current.show();
    }).finally(() => disposables.forEach((d) => void d.dispose()));
  }

  async #stepThrough(start: InputStep): Promise<void> {
    let step: InputStep | void = start;
    ++this.#step;
    this.#steps.push(step);
    while (step) {
      if (this.#current) {
        this.#current.enabled = false;
        this.#current.busy = true;
      }
      try {
        step = await step(this);
        if (step) {
          while (this.#steps.length > this.#step) this.#steps.pop();
          ++this.#step;
          this.#steps.push(step);
        }
      } catch (err) {
        switch (err) {
          case InputFlowAction.back:
            --this.#step;
            step = this.#steps[this.#step - 1];
            break;
          case InputFlowAction.forward:
            ++this.#step;
            step = this.#steps[this.#step - 1];
            break;
          case InputFlowAction.cancel:
            step = undefined;
            break;
          default:
            step = undefined;
            console.error(err);
            break;
        }
      }
    }
    if (this.#current) this.#current.dispose();
  }
}
