export type CardHandler = (card: HTMLElement) => void;

export function observeCards(root: HTMLElement, onCard: CardHandler): () => void {
  const classifiedIds = new Set<string>();
  const handleNode = (node: Node): void => {
    console.info("[checkpoint-5] MutationObserver received node", node);
    if (!(node instanceof HTMLElement)) return;
    const cards = node.matches(".content-card") ? [node] : Array.from(node.querySelectorAll<HTMLElement>(".content-card"));
    console.info("[checkpoint-6] observer relevant cards", cards.length);
    for (const card of cards) {
      const id = card.dataset.contentId;
      if (id && !classifiedIds.has(id)) {
        classifiedIds.add(id);
        console.info("[checkpoint-7] classification pipeline invoked", { id });
        onCard(card);
      }
    }
  };
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(handleNode);
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  console.info("[checkpoint-5] MutationObserver attached");
  return () => observer.disconnect();
}
