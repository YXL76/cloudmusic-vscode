// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { h } from "preact";
/** @jsx h */

interface RawScriptProps {
  content: string;
  nonce: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const RawScript = ({
  content,
  nonce,
}: RawScriptProps): h.JSX.Element => (
  // eslint-disable-next-line @typescript-eslint/naming-convention
  <script nonce={nonce} dangerouslySetInnerHTML={{ __html: content }}></script>
);

interface TabsProps {
  className?: string;
  titles: string[];
  selectd: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Tabs = ({
  className,
  titles,
  selectd,
}: TabsProps): h.JSX.Element => (
  <nav className={`flex flex-row ${className ?? ""}`} id="tabs">
    {titles.map((title, index) => (
      <button
        key={index}
        className={`inline-block bg-transparent tabs-button py-2 px-4 hover:text-blue-600 font-medium text-lg focus:outline-none border-blue-600 border-solid border-0 text-black dark:text-white cursor-pointer ${
          index === selectd ? "text-blue-600 dark:text-blue-600 border-b-2" : ""
        }`}
        data-index={index}
      >
        {title.toLocaleUpperCase()}
      </button>
    ))}
  </nav>
);
