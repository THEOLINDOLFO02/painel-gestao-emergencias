import Draggable from "../components/Draggable";
import EditableText from "../components/EditableText";

export default function Header() {
  return (
    <Draggable id="header">
      <header className="hero-header">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="hero-copy">
          <div className="eyebrow">DEFESA CIVIL • OPERAÇÕES INTEGRADAS</div>
          <div className="main-title" role="heading" aria-level={1}>
            <EditableText>SISTEMA INTEGRADO DE GESTÃO DE EMERGÊNCIAS</EditableText>
          </div>
        </div>
        <div className="status-badge">
          <span className="status-dot" />
          PAINEL OPERACIONAL
        </div>
      </header>
    </Draggable>
  );
}
