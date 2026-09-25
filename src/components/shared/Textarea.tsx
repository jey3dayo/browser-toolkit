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
    ref?: React.Ref<HTMLTextAreaElement>;
  };

export function Textarea({
  className,
  ref,
  size,
  variant,
  ...props
}: TextareaProps): React.JSX.Element {
  return (
    <textarea
      className={textSurfaceVariants({ className, size, variant })}
      ref={ref}
      {...props}
    />
  );
}
