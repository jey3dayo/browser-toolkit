import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { cva } from "class-variance-authority";

const separatorVariants = cva("mbu-separator");

export type SeparatorProps = Omit<
  React.ComponentProps<typeof BaseSeparator>,
  "className"
> & {
  className?: string;
};

export function Separator({
  className,
  ...props
}: SeparatorProps): React.JSX.Element {
  return (
    <BaseSeparator className={separatorVariants({ className })} {...props} />
  );
}
