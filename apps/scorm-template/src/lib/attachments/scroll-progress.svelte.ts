import { coursePlayer } from "$core/player";
import { setContext } from "svelte";

const SCROLL_PROGRESS_MIN = 0;
const SCROLL_PROGRESS_MAX = 100;

export type ScrollProgress = { readonly value: number };

export function scrollProgress(): (node: HTMLElement) => () => void {
  const progress = $state({ value: SCROLL_PROGRESS_MIN });
  setContext<ScrollProgress>("scrollProgress", progress);



  return (node: HTMLElement) => {
    $effect(() => {
      if (coursePlayer.isNavigating) {
        // reset the scroll on the node to the top when navigating to a new slide
        // const node = node;
        node.scrollTop = 0;
      }
    })

    console.log("Initializing scroll progress for node:", node);
    function update() {
      const maxScrollable = node.scrollHeight - node.clientHeight;
      if (maxScrollable <= 0) {
        progress.value = SCROLL_PROGRESS_MAX;
        return;
      }
      progress.value = Math.min(
        SCROLL_PROGRESS_MAX,
        (node.scrollTop / maxScrollable) * SCROLL_PROGRESS_MAX,
      );
    }

    update();
    node.addEventListener("scroll", update);

    return () => {
      node.removeEventListener("scroll", update);
    };
  };
}
