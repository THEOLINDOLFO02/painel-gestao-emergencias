import EditableText from "./EditableText";

export default function PhaseLabel({
  number,
  title,
  align = "center",
}: {
  number: string;
  title: string;
  align?: "center" | "left";
}) {
  return (
    <div className={`phase-label phase-label--${align}`}>
      <span>FASE {number}</span>
      <strong role="heading" aria-level={2}>
        <EditableText>{title}</EditableText>
      </strong>
    </div>
  );
}
