import type {
  Disposable,
  InputBox,
  QuickInput,
  QuickInputButton,
  QuickPick,
  QuickPickItem,
} from "vscode";
import { QuickInputButtons, ThemeIcon, window } from "vscode";
import i18n from "../i18n";

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
  forward: {
    iconPath: new ThemeIcon("arrow-right"),
    tooltip: i18n.word.forward,
  },
  previous: {
    iconPath: new ThemeIcon("arrow-up"),
    tooltip: i18n.word.previousPage,
  },
  next: {
    iconPath: new ThemeIcon("arrow-down"),
    tooltip: i18n.word.nextPage,
  },
  close: {
    iconPath: new ThemeIcon("close"),
    tooltip: i18n.word.close,
  },
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
  private _step = 0;

  private _current?: QuickInput;

  private readonly _steps: InputStep[] = [];

  static async run(start: InputStep): Promise<void> {
    const input = new MultiStepInput();
    return input.stepThrough(start);
  }

  stay(step?: InputStep): InputStep {
    --this._step;
    if (step) this._steps[this._step] = step;
    return this._steps[this._step];
  }

  async showQuickPick<T extends QuickPickItem>(
    _: QuickPickParameters<T>
  ): Promise<T>;
  async showQuickPick<T extends QuickPickItem>(
    _: QuickPickParameters<T> & { canSelectMany: true }
  ): Promise<readonly T[]>;
  async showQuickPick<T extends QuickPickItem>(
    _: QuickPickParameters<T> & Required<ButtonOption>
  ): Promise<T | ButtonAction>;
  async showQuickPick<T extends QuickPickItem>(
    _: QuickPickParameters<T> & Required<QuickPickOption>
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
  }: QuickPickParameters<T> & QuickPickOption): Promise<
    readonly T[] | T | ButtonAction
  > {
    const disposables: Disposable[] = [];

    return new Promise<readonly T[] | T | ButtonAction>((resolve, reject) => {
      const input = window.createQuickPick<T>();
      input.canSelectMany = !!canSelectMany;
      input.matchOnDescription = true;
      input.matchOnDetail = true;
      input.ignoreFocusOut = true;
      input.title = title;
      input.step = step;
      input.totalSteps = Math.max(
        totalSteps || 1,
        this._step,
        this._steps.length
      );
      input.placeholder = placeholder;
      input.items = items;
      /* if (activeItems) {
            input.activeItems = activeItems;
          } */
      const button: QuickInputButton[] = [];
      if (previous) button.push(pickButtons.previous);
      if (next) button.push(pickButtons.next);
      input.buttons = [
        ...(this._step > 1 ? [QuickInputButtons.Back] : []),
        ...button,
        ...(this._step < this._steps.length ? [pickButtons.forward] : []),
        pickButtons.close,
      ];
      disposables.push(
        input.onDidTriggerButton((item) => {
          switch (item) {
            case QuickInputButtons.Back:
              reject(InputFlowAction.back);
              break;
            case pickButtons.forward:
              reject(InputFlowAction.forward);
              break;
            case pickButtons.previous:
              resolve(ButtonAction.previous);
              break;
            case pickButtons.next:
              resolve(ButtonAction.next);
              break;
            default:
              input.hide();
          }
        }),
        input.onDidAccept(() =>
          resolve(canSelectMany ? input.selectedItems : input.selectedItems[0])
        ),
        input.onDidHide(() => reject(InputFlowAction.cancel))
      );
      if (changeCallback)
        disposables.push(
          input.onDidChangeValue((value) => changeCallback(input, value))
        );
      if (this._current) this._current.dispose();
      this._current = input;
      this._current.show();
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
      input.totalSteps = Math.max(
        totalSteps || 1,
        this._step,
        this._steps.length
      );
      input.value = value || "";
      input.prompt = prompt;
      input.buttons = [
        ...(this._step > 1 ? [QuickInputButtons.Back] : []),
        ...(this._step < this._steps.length ? [pickButtons.forward] : []),
        pickButtons.close,
      ];
      input.password = password || false;
      disposables.push(
        input.onDidTriggerButton((item) => {
          switch (item) {
            case QuickInputButtons.Back:
              reject(InputFlowAction.back);
              break;
            case pickButtons.forward:
              reject(InputFlowAction.forward);
              break;
            default:
              input.hide();
              break;
          }
        }),
        input.onDidAccept(() => {
          const value = input.value;
          resolve(value);
        }),
        input.onDidHide(() => reject(InputFlowAction.cancel))
      );
      if (changeCallback)
        disposables.push(
          input.onDidChangeValue((value) => changeCallback(input, value))
        );
      if (this._current) this._current.dispose();
      this._current = input;
      this._current.show();
    }).finally(() => disposables.forEach((d) => void d.dispose()));
  }

  private async stepThrough(start: InputStep): Promise<void> {
    let step: InputStep | void = start;
    ++this._step;
    this._steps.push(step);
    while (step) {
      if (this._current) {
        this._current.enabled = false;
        this._current.busy = true;
      }
      try {
        step = await step(this);
        if (step) {
          while (this._steps.length > this._step) this._steps.pop();
          ++this._step;
          this._steps.push(step);
        }
      } catch (err) {
        switch (err) {
          case InputFlowAction.back:
            --this._step;
            step = this._steps[this._step - 1];
            break;
          case InputFlowAction.forward:
            ++this._step;
            step = this._steps[this._step - 1];
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
    if (this._current) this._current.dispose();
  }
}
