<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import ModeSwitcher from "$lib/components/local/ModeSwitcher.svelte";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { coursePlayer } from "$core/player";
  import { Tween } from "svelte/motion";
  import AppSidebar from "$lib/components/local/app-sidebar.svelte";

  let { children }: { children: Snippet } = $props();

  let currentProgress = $derived(
    new Tween(coursePlayer.course.progress, { duration: 400 }),
  );
</script>

<div class="absolute inset-0 z-10 h-0.5 w-screen overflow-hidden bg-background">
  <Progress
    value={currentProgress.current - 1}
    class="absolute h-0.5 rounded-none"
  />
</div>

<Sidebar.Provider>
  <AppSidebar variant="floating" />
  <Sidebar.Inset>
    <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <Sidebar.Trigger class="-ms-1" />

      <div>
        <h1 class="text-lg font-medium tracking-tight">
          {coursePlayer.activeSlide?.lessonTitle} - {coursePlayer.activeSlide
            ?.title}
        </h1>
      </div>

      <div class="flex-1"></div>
      <ModeSwitcher />
    </header>
    <main class="flex flex-1 flex-col gap-4 py-4">
      {@render children()}
    </main>
  </Sidebar.Inset>
</Sidebar.Provider>
