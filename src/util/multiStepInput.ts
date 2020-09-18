import {
  Disposable,
  InputBox,
  QuickInput,
  QuickInputButton,
  QuickInputButtons,
  QuickPick,
  QuickPickItem,
  ThemeIcon,
  window,
} from "vscode";
import { i18n } from "../i18n";

enum InputFlowAction {
  back,
  forward,
  cancel,
}

export type InputStep = (input: MultiStepInput) => Promise<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
  title: string;
  step: number;
  totalSteps?: number;
  items: T[];
  activeItems?: T[];
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

const forwordButton: QuickInputButton = {
  iconPath: new ThemeIcon("arrow-right"),
  tooltip: i18n.word.forword,
};

export class MultiStepInput {
  static async run(start: InputStep): Promise<void> {
    const input = new MultiStepInput();
    return input.stepThrough(start);
  }

  private step = 0;
  private current?: QuickInput;
  private steps: InputStep[] = [];

  private async stepThrough(start: InputStep): Promise<void> {
    let step: InputStep | void = start;
    ++this.step;
    this.steps.push(step);
    while (step) {
      if (this.current) {
        this.current.enabled = false;
        this.current.busy = true;
      }
      try {
        step = await step(this);
        if (step) {
          while (this.steps.length > this.step) {
            this.steps.pop();
          }
          ++this.step;
          this.steps.push(step);
        }
      } catch (err) {
        if (err === InputFlowAction.back) {
          --this.step;
          step = this.steps[this.step - 1];
        } else if (err === InputFlowAction.forward) {
          ++this.step;
          step = this.steps[this.step - 1];
        } else if (err === InputFlowAction.cancel) {
          step = undefined;
        }
      }
    }
    if (this.current) {
      this.current.dispose();
    }
  }

  pop(): InputStep | undefined {
    --this.step;
    return this.steps.pop();
  }

  async showQuickPick<T extends QuickPickItem>({}: QuickPickParameters<
    T
  >): Promise<T>;
  async showQuickPick<T extends QuickPickItem>(
    {}: QuickPickParameters<T>,
    canSelectMany: true
  ): Promise<readonly T[]>;

  async showQuickPick<T extends QuickPickItem>(
    {
      title,
      step,
      totalSteps,
      items,
      activeItems,
      placeholder,
      changeCallback,
    }: QuickPickParameters<T>,
    canSelectMany?: true
  ): Promise<readonly T[] | T> {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<readonly T[] | T>((resolve, reject) => {
        const input = window.createQuickPick<T>();
        input.canSelectMany = canSelectMany ?? false;
        input.matchOnDescription = true;
        input.matchOnDetail = true;
        input.title = title;
        input.step = step;
        input.totalSteps = Math.max(
          totalSteps || 1,
          this.step,
          this.steps.length
        );
        input.placeholder = placeholder;
        input.items = items;
        if (activeItems) {
          input.activeItems = activeItems;
        }
        input.buttons = [
          ...(this.step > 1 ? [QuickInputButtons.Back] : []),
          ...(this.step < this.steps.length ? [forwordButton] : []),
        ];
        disposables.push(
          input.onDidTriggerButton((item) => {
            if (item === QuickInputButtons.Back) {
              reject(InputFlowAction.back);
            } else {
              reject(InputFlowAction.forward);
            }
          }),
          input.onDidAccept(() => {
            resolve(
              canSelectMany ? input.selectedItems : input.selectedItems[0]
            );
          }),
          input.onDidHide(async () => {
            reject(InputFlowAction.cancel);
          })
        );
        if (changeCallback) {
          disposables.push(
            input.onDidChangeValue((value) => changeCallback(input, value))
          );
        }
        if (this.current) {
          this.current.dispose();
        }
        this.current = input;
        this.current.show();
      });
    } finally {
      disposables.forEach((d) => d.dispose());
    }
  }

  async showInputBox({
    title,
    step,
    totalSteps,
    value,
    prompt,
    password,
    changeCallback,
  }: InputBoxParameters): Promise<string> {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<string>((resolve, reject) => {
        const input = window.createInputBox();
        input.title = title;
        input.step = step;
        input.totalSteps = Math.max(
          totalSteps || 1,
          this.step,
          this.steps.length
        );
        input.value = value || "";
        input.prompt = prompt;
        input.buttons = [
          ...(this.step > 1 ? [QuickInputButtons.Back] : []),
          ...(this.step < this.steps.length ? [forwordButton] : []),
        ];
        input.password = password || false;
        disposables.push(
          input.onDidTriggerButton((item) => {
            if (item === QuickInputButtons.Back) {
              reject(InputFlowAction.back);
            } else {
              reject(InputFlowAction.forward);
            }
          }),
          input.onDidAccept(async () => {
            const value = input.value;
            resolve(value);
          }),
          input.onDidHide(async () => {
            reject(InputFlowAction.cancel);
          })
        );
        if (changeCallback) {
          disposables.push(
            input.onDidChangeValue((value) => changeCallback(input, value))
          );
        }
        if (this.current) {
          this.current.dispose();
        }
        this.current = input;
        this.current.show();
      });
    } finally {
      disposables.forEach((d) => d.dispose());
    }
  }
}
