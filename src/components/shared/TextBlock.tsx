import {
  type TextSurfaceVariantProps,
  textSurfaceVariants,
} from "@/components/shared/textSurface";

export type TextBlockProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "className"
> &
  TextSurfaceVariantProps & {
    className?: string;
  };

export function TextBlock({
  className,
  size,
  variant,
  ...props
}: TextBlockProps): React.JSX.Element {
  return (
    <div
      className={textSurfaceVariants({ className, size, variant })}
      {...props}
    />
  );
}
