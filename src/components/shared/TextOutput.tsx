import {
  type TextSurfaceVariantProps,
  textSurfaceVariants,
} from "@/components/shared/textSurface";

export type TextOutputProps = Omit<
  React.HTMLAttributes<HTMLPreElement>,
  "className"
> &
  TextSurfaceVariantProps & {
    className?: string;
  };

export function TextOutput({
  className,
  size,
  variant,
  ...props
}: TextOutputProps): React.JSX.Element {
  return (
    <pre
      className={textSurfaceVariants({ className, size, variant })}
      {...props}
    />
  );
}
