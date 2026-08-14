import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { cva, type VariantProps } from "class-variance-authority";

const scrollAreaRootVariants = cva("", {
  defaultVariants: {
    variant: "pattern",
  },
  variants: {
    variant: {
      pattern: "pattern-scrollarea",
    },
  },
});

const scrollAreaViewportVariants = cva("", {
  defaultVariants: {
    variant: "pattern",
  },
  variants: {
    variant: {
      pattern: "pattern-list",
    },
  },
});

const scrollAreaScrollbarVariants = cva("", {
  defaultVariants: {
    variant: "pattern",
  },
  variants: {
    variant: {
      pattern: "pattern-scrollbar",
    },
  },
});

const scrollAreaThumbVariants = cva("", {
  defaultVariants: {
    variant: "pattern",
  },
  variants: {
    variant: {
      pattern: "pattern-thumb",
    },
  },
});

export type ScrollAreaProps = Omit<
  React.ComponentProps<typeof BaseScrollArea.Root>,
  "className"
> &
  VariantProps<typeof scrollAreaRootVariants> & {
    className?: string;
    contentClassName?: string;
    scrollbarClassName?: string;
    thumbClassName?: string;
    viewportClassName?: string;
  };

export function ScrollArea({
  children,
  className,
  contentClassName,
  scrollbarClassName,
  thumbClassName,
  variant,
  viewportClassName,
  ...props
}: ScrollAreaProps): React.JSX.Element {
  return (
    <BaseScrollArea.Root
      className={scrollAreaRootVariants({ className, variant })}
      {...props}
    >
      <BaseScrollArea.Viewport
        className={scrollAreaViewportVariants({
          className: viewportClassName,
          variant,
        })}
      >
        <BaseScrollArea.Content className={contentClassName}>
          {children}
        </BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <BaseScrollArea.Scrollbar
        className={scrollAreaScrollbarVariants({
          className: scrollbarClassName,
          variant,
        })}
      >
        <BaseScrollArea.Thumb
          className={scrollAreaThumbVariants({
            className: thumbClassName,
            variant,
          })}
        />
      </BaseScrollArea.Scrollbar>
    </BaseScrollArea.Root>
  );
}
