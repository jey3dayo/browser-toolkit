import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { cva, type VariantProps } from "class-variance-authority";

const scrollAreaRootVariants = cva("", {
  variants: {
    variant: {
      pattern: "pattern-scrollarea",
    },
  },
  defaultVariants: {
    variant: "pattern",
  },
});

const scrollAreaViewportVariants = cva("", {
  variants: {
    variant: {
      pattern: "pattern-list",
    },
  },
  defaultVariants: {
    variant: "pattern",
  },
});

const scrollAreaScrollbarVariants = cva("", {
  variants: {
    variant: {
      pattern: "pattern-scrollbar",
    },
  },
  defaultVariants: {
    variant: "pattern",
  },
});

const scrollAreaThumbVariants = cva("", {
  variants: {
    variant: {
      pattern: "pattern-thumb",
    },
  },
  defaultVariants: {
    variant: "pattern",
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
