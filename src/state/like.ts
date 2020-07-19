import { ButtonManager } from "../manager/buttonManager";

export class IsLike {
  private static state = false;

  static get(): boolean {
    return this.state;
  }

  static set(newValue: boolean): void {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        ButtonManager.buttonLike(true);
      } else {
        ButtonManager.buttonLike(false);
      }
    }
  }
}
