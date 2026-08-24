import { Check } from "@phosphor-icons/react/dist/ssr";

const steps = ["Interesse eintragen", "E-Mail bestätigen", "Region bewerten"];

export function RegionProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="region-progress" aria-label="Fortschritt Regionswunsch">
      {steps.map((label, index) => {
        const step = index + 1;
        const completed = step < current;
        const active = step === current;
        return (
          <li key={label} className={completed ? "completed" : active ? "active" : undefined} aria-current={active ? "step" : undefined}>
            <span>{completed ? <Check size={13} weight="bold" aria-hidden="true" /> : step}</span>
            <small>{label}</small>
          </li>
        );
      })}
    </ol>
  );
}
