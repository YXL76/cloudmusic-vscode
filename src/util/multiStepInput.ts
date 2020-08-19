import {
  Disposable,
  InputBox,
  QuickInput,
  QuickInputButtons,
  QuickPickItem,
  window,
} from "vscode";

enum InputFlowAction {
  back,
  forward,
  cancel,
  resume,
}

type InputStep = (input: MultiStepInput) => Promise<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
  title: string;
  step: number;
  totalSteps: number;
  items: T[];
  activeItems?: T[];
  placeholder?: string;
  unsave?: boolean;
  shouldResume?: () => Promise<boolean>;
}

interface InputBoxParameters {
  title: string;
  step: number;
  totalSteps: number;
  value?: string;
  prompt?: string;
  password?: boolean;
  unsave?: boolean;
  shouldResume?: () => Promise<boolean>;
}

export class MultiStepInput {
  static async run(start: InputStep): Promise<void> {
    const input = new MultiStepInput();
    return input.stepThrough(start);
  }

  private current?: QuickInput;
  private steps: InputStep[] = [];

  private async stepThrough(start: InputStep): Promise<void> {
    let step: InputStep | void = start;
    while (step) {
      this.steps.push(step);
      if (this.current) {
        this.current.enabled = false;
        this.current.busy = true;
      }
      try {
        step = await step(this);
      } catch (err) {
        if (err === InputFlowAction.back) {
          this.steps.pop();
          step = this.steps.pop();
        } else if (err === InputFlowAction.forward) {
        } else if (err === InputFlowAction.cancel) {
          step = undefined;
        } else if (err === InputFlowAction.resume) {
          step = this.steps.pop();
        }
      }
    }
    if (this.current) {
      this.current.dispose();
    }
  }

  async showQuickPick<T extends QuickPickItem>({
    title,
    step,
    totalSteps,
    items,
    activeItems,
    placeholder,
    unsave,
    shouldResume,
  }: QuickPickParameters<T>): Promise<T> {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<T>((resolve, reject) => {
        const input = window.createQuickPick<T>();
        input.title = title;
        input.step = step;
        input.totalSteps = totalSteps;
        input.placeholder = placeholder;
        input.items = items;
        if (activeItems) {
          input.activeItems = activeItems;
        }
        input.buttons = [
          ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
        ];
        disposables.push(
          input.onDidTriggerButton((item) => {
            if (item === QuickInputButtons.Back) {
              reject(InputFlowAction.back);
            } else {
              reject(InputFlowAction.forward);
            }
          }),
          input.onDidChangeSelection((items) => {
            if (unsave) {
              this.steps.pop();
            }
            resolve(items[0]);
          }),
          input.onDidHide(async () => {
            if (shouldResume && (await shouldResume())) {
              reject(InputFlowAction.resume);
            } else {
              reject(InputFlowAction.cancel);
            }
          })
        );
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

  async showInputBox(
    {
      title,
      step,
      totalSteps,
      value,
      prompt,
      password,
      unsave,
      shouldResume,
    }: InputBoxParameters,
    changeCallback?: (input: InputBox, value: string) => Promise<void>
  ): Promise<string> {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<string>((resolve, reject) => {
        const input = window.createInputBox();
        input.title = title;
        input.step = step;
        input.totalSteps = totalSteps;
        input.value = value || "";
        input.prompt = prompt;
        input.buttons = [
          ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
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
            input.enabled = false;
            input.busy = true;
            if (unsave) {
              this.steps.pop();
            }
            resolve(value);
            input.enabled = true;
            input.busy = false;
          }),
          input.onDidHide(async () => {
            if (shouldResume && (await shouldResume())) {
              reject(InputFlowAction.resume);
            } else {
              reject(InputFlowAction.cancel);
            }
          })
        );
        if (changeCallback) {
          disposables.push(
            input.onDidChangeValue(async (value) => {
              await changeCallback(input, value);
            })
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
