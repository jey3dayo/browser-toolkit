import {
  type TextSurfaceVariantProps,
  textSurfaceVariants,
} from "@/components/shared/textSurface";

export type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
> &
  TextSurfaceVariantProps & {
    className?: string;
  };

export function Textarea({
  className,
  size,
  variant,
  ...props
}: TextareaProps): React.JSX.Element {
  return (
    <textarea
      className={textSurfaceVariants({ className, size, variant })}
      {...props}
    />
  );
}
