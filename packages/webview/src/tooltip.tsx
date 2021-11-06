import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// https://github.com/microsoft/vscode/blob/main/src/vs/base/browser/markdownRenderer.ts#L323
// https://github.com/microsoft/vscode/blob/main/src/vs/base/browser/markdownRenderer.ts#L278
console.log(
  renderToStaticMarkup(
    <table>
      <tr>
        <th align="center">Title</th>
      </tr>
      <tr>
        <td align="center">Artist</td>
      </tr>
      <tr>
        <td align="center">
          <img src="" alt="" width={384}></img>
        </td>
      </tr>
      <tr>
        <td align="center">
          <a data-href=""></a>
        </td>
      </tr>
    </table>
  )
);
