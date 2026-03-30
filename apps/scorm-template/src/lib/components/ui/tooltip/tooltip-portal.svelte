<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";

  let { to, disabled, children, ...restProps }: TooltipPrimitive.PortalProps =
    $props();
</script>

<TooltipPrimitive.Portal {to} {disabled} {...restProps} {children}
></TooltipPrimitive.Portal>
