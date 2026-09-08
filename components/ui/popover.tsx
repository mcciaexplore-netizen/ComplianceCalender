'use client';
import { Popover as Primitive } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';

export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export const PopoverTitle = Primitive.Title;
export const PopoverDescription = Primitive.Description;
export function PopoverContent({ className, ...props }: Primitive.Popup.Props) {
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        sideOffset={10}
        align="end"
        className="popover-positioner"
      >
        <Primitive.Popup
          className={cn('product-popover', className)}
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
