// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { h } from "preact";
/** @jsx h */

// eslint-disable-next-line @typescript-eslint/naming-convention
const Login = ({ imgSrc }: { imgSrc: string }): h.JSX.Element => (
  <div className="h-screen w-screen flex items-center justify-center">
    <img className="h-64 w-64" src={imgSrc} alt="qrcode" />
  </div>
);

export default Login;
