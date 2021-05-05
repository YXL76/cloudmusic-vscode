import React from "react";

export interface LoginProps {
  imgSrc: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Login = ({ imgSrc }: LoginProps): JSX.Element => (
  <div className="h-screen w-screen flex items-center justify-center">
    <img className="h-64 w-64" src={imgSrc} alt="qrcode" />
  </div>
);
