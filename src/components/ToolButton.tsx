import type { ReactNode } from "react";

export default function ToolButton({
  onClick,
  className = "",
  disabled = false,
  pressed,
  children,
}: {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`tool-control ${disabled ? "tool-control--disabled" : ""} ${className}`}
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
