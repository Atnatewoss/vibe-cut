import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const iconButtonVariants = cva(
  'grid size-7 place-items-center rounded transition-colors',
  {
    variants: {
      active: {
        true: 'bg-active text-fg',
        false: 'text-faint hover:bg-hovered hover:text-muted',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
)

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  label: string
}

function IconButton({ label, active, className, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ active }), className)}
      {...props}
    />
  )
}

export { IconButton, iconButtonVariants }
