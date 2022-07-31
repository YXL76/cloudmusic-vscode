export interface DescriptionProps {
  name: string;
  desc: readonly { ti: string; txt: string }[];
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Description = ({ name, desc }: DescriptionProps): JSX.Element => (
  <div className="flex flex-col items-center py-4">
    <div className="flex flex-col max-w-5xl">
      <h1 className="text-5xl">{name}</h1>
      {desc.map(({ ti, txt }) => (
        <div key={ti}>
          <h2 className="text-3xl">{ti}</h2>
          <p className="text-lg">{txt}</p>
        </div>
      ))}
    </div>
  </div>
);
