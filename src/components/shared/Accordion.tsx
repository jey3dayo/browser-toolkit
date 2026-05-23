import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { cva, type VariantProps } from "class-variance-authority";
import { Textarea, type TextareaProps } from "@/components/shared/Textarea";

const accordionVariants = cva("mbu-accordion", {
  variants: {
    variant: {
      default: null,
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
const accordionMetaVariants = cva("mbu-accordion-meta");
const accordionNoteVariants = cva("mbu-accordion-note");
const accordionTextWrapperVariants = cva("mbu-accordion-text-wrapper");
const accordionTextVariants = cva("mbu-accordion-text");

export type AccordionProps = Omit<
  React.ComponentProps<typeof BaseAccordion.Root>,
  "children" | "className" | "defaultValue" | "value"
> &
  VariantProps<typeof accordionVariants> & {
    children: React.ReactNode;
    className?: string;
    defaultOpen?: boolean;
    itemValue?: string;
    title: React.ReactNode;
  };

export function Accordion({
  children,
  className,
  defaultOpen = true,
  itemValue = "item",
  title,
  variant,
  ...props
}: AccordionProps): React.JSX.Element {
  return (
    <BaseAccordion.Root
      className={accordionVariants({ className, variant })}
      defaultValue={defaultOpen ? [itemValue] : undefined}
      {...props}
    >
      <BaseAccordion.Item className="mbu-accordion-item" value={itemValue}>
        <BaseAccordion.Header className="mbu-accordion-header">
          <BaseAccordion.Trigger
            className="mbu-accordion-trigger"
            type="button"
          >
            <span className="mbu-accordion-title">{title}</span>
            <span aria-hidden="true" className="mbu-accordion-icon">
              ▾
            </span>
          </BaseAccordion.Trigger>
        </BaseAccordion.Header>
        <BaseAccordion.Panel className="mbu-accordion-panel">
          {children}
        </BaseAccordion.Panel>
      </BaseAccordion.Item>
    </BaseAccordion.Root>
  );
}

type AccordionPreviewBlockProps = React.ComponentPropsWithoutRef<"div">;

export function AccordionMeta({
  children,
  className,
  ...props
}: AccordionPreviewBlockProps): React.JSX.Element {
  return (
    <div className={accordionMetaVariants({ className })} {...props}>
      {children}
    </div>
  );
}

export function AccordionNote({
  children,
  className,
  ...props
}: AccordionPreviewBlockProps): React.JSX.Element {
  return (
    <div className={accordionNoteVariants({ className })} {...props}>
      {children}
    </div>
  );
}

export function AccordionTextWrapper({
  children,
  className,
  ...props
}: AccordionPreviewBlockProps): React.JSX.Element {
  return (
    <div className={accordionTextWrapperVariants({ className })} {...props}>
      {children}
    </div>
  );
}

export function AccordionText({
  className,
  ...props
}: TextareaProps): React.JSX.Element {
  return (
    <Textarea className={accordionTextVariants({ className })} {...props} />
  );
}
