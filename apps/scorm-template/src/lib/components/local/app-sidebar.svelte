<script lang="ts">
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import {
    IconCheck,
    IconLock,
    IconBook,
    IconPlus,
    IconMinus,
  } from "@tabler/icons-svelte";
  import type { ComponentProps } from "svelte";
  import { course } from "../../../course.js";
  import { coursePlayer } from "$core/player/index.js";

  let {
    ref = $bindable(null),
    side,
    variant,
    collapsible,
  }: ComponentProps<typeof Sidebar.Root> = $props();

  function slidesForLesson(lessonId: string) {
    return coursePlayer.slides.filter((s) => s.lessonId === lessonId);
  }
</script>

<Sidebar.Root bind:ref {side} {variant} {collapsible}>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton size="lg" class="h-fit">
          {#snippet child({ props })}
            <div {...props}>
              <div
                class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary py-4 text-sidebar-primary-foreground"
              >
                <IconBook class="size-4" />
              </div>
              <div class="flex flex-col gap-0.5 leading-none">
                <span class="font-medium">{course.title}</span>
                {#if course.description}
                  <span class="text-xs">{course.description}</span>
                {/if}
              </div>
            </div>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.Menu>
        {#each course.lessons as lesson (lesson.id)}
          {@const lessonSlides = slidesForLesson(lesson.id)}
          {@const isActiveLesson =
            coursePlayer.activeSlide?.lessonId === lesson.id}
          <Collapsible.Root open={isActiveLesson} class="group/collapsible">
            <Sidebar.MenuItem>
              <Collapsible.Trigger>
                {#snippet child({ props })}
                  <Sidebar.MenuButton {...props} class="text-foreground/50">
                    {lesson.title}
                    <IconPlus
                      class="ms-auto group-data-[state=open]/collapsible:hidden"
                    />
                    <IconMinus
                      class="ms-auto group-data-[state=closed]/collapsible:hidden"
                    />
                  </Sidebar.MenuButton>
                {/snippet}
              </Collapsible.Trigger>
              <Collapsible.Content>
                <Sidebar.MenuSub>
                  {#each lessonSlides as slide (slide.id)}
                    {@const locked = coursePlayer.isLocked(slide)}
                    {@const status = coursePlayer.getSlideStatus(slide)}
                    <Sidebar.MenuSubItem>
                      <Sidebar.MenuSubButton
                        class="w-full p-4"
                        isActive={coursePlayer.activeSlide?.pathname ===
                          slide.pathname}
                      >
                        {#snippet child({ props })}
                          <button
                            {...props}
                            disabled={locked}
                            class:opacity-50={locked}
                            onclick={() => coursePlayer.goto(slide.pathname)}
                          >
                            {#if locked}
                              <IconLock class="size-3.5 shrink-0" />
                            {:else if status === "passed"}
                              <IconCheck class="size-3.5 shrink-0" />
                            {/if}
                            <span>{slide.title ?? slide.id}</span>
                          </button>
                        {/snippet}
                      </Sidebar.MenuSubButton>
                    </Sidebar.MenuSubItem>
                  {/each}
                </Sidebar.MenuSub>
              </Collapsible.Content>
            </Sidebar.MenuItem>
          </Collapsible.Root>
        {/each}
      </Sidebar.Menu>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Rail />
</Sidebar.Root>
