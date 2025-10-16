import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { DocumentStatus } from "@/types";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        valid: "border-transparent bg-status-valid text-white hover:bg-status-valid/80",
        invalid: "border-transparent bg-status-invalid text-white hover:bg-status-invalid/80",
        revoked: "border-transparent bg-status-revoked text-white hover:bg-status-revoked/80",
        pending: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  status?: DocumentStatus;
}

function StatusBadge({ className, variant, status, children, ...props }: StatusBadgeProps) {
  // Auto-map status to variant if provided
  const badgeVariant = status || variant;

  const statusText = {
    valid: "VALID",
    invalid: "INVALID",
    revoked: "REVOKED",
    pending: "PENDING",
  };

  return (
    <div className={cn(badgeVariants({ variant: badgeVariant }), className)} {...props}>
      {children || (status && statusText[status])}
    </div>
  );
}

export { StatusBadge, badgeVariants };
