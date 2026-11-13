// Shown inside a button while its action runs: a spinning circle and what is happening,
// e.g. "Placing order". The button should also be disabled and marked aria-busy.
export function ButtonSpinner({ label }) {
  return <span className="btn-busy"><span className="btn-spinner" aria-hidden="true" />{label}</span>;
}
