import type { ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { OrderMode } from "./types";

interface MainActionButtonProps {
  isApproving: boolean;
  isCreating: boolean;
  checkingApproval: boolean;
  isApproved: boolean;
  orderMode: OrderMode;
  disabled: boolean;
  onClick: () => void;
  testId: string;
  className: string;
}

const getButtonContent = ({
  isApproving,
  isCreating,
  checkingApproval,
  isApproved,
  orderMode,
}: Omit<MainActionButtonProps, "disabled" | "onClick" | "testId" | "className">): ReactNode => {
  if (isApproving) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Approving...
      </>
    );
  }

  if (isCreating) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Creating...
      </>
    );
  }

  if (checkingApproval) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking Approval...
      </>
    );
  }

  if (isApproved) {
    return (
      <>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        {orderMode === OrderMode.POSITION
          ? "Create Position Protection"
          : orderMode === OrderMode.BRACKET
            ? "Create Bracket Order"
            : "Create Order"}
      </>
    );
  }

  return "Approve Tokens";
};

export function MainActionButton({
  isApproving,
  isCreating,
  checkingApproval,
  isApproved,
  orderMode,
  disabled,
  onClick,
  testId,
  className,
}: MainActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={testId}
    >
      {getButtonContent({
        isApproving,
        isCreating,
        checkingApproval,
        isApproved,
        orderMode,
      })}
    </button>
  );
}
