export interface TabsProps {
  title?: string;
  titles: readonly string[];
  selectd: number;
  switchTab: (index: number) => void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Tabs = ({ title, titles, selectd, switchTab }: TabsProps): JSX.Element => (
  <nav className="flex flex-row items-center mb-4">
    {title && (
      <div className="inline-block px-4 font-bold text-xl text-black dark:text-white">{title.toLocaleUpperCase()}</div>
    )}
    {titles.map((title, index) => (
      <button
        key={title}
        className={`inline-block bg-transparent tabs-button py-2 px-4 text-black dark:text-white hover:text-blue-600 font-medium text-lg focus:outline-none border-blue-600 border-solid border-0 cursor-pointer ${
          index === selectd ? "text-blue-600 border-b-2" : ""
        }`}
        onClick={() => switchTab(index)}
      >
        {title.toLocaleUpperCase()}
      </button>
    ))}
  </nav>
);
