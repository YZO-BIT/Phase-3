export const SELECT_EVENT = "technieeeks:select-event";

export function selectEvent(id: string) {
  window.dispatchEvent(new CustomEvent<string>(SELECT_EVENT, { detail: id }));
}
