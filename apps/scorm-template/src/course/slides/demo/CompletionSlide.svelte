<script lang="ts">
  import { scormState } from '$lib/scorm/index.js'
</script>

<article>
  <h1>Completion</h1>
  <p>Status: {scormState.completion.status}</p>
  <p>Success: {scormState.completion.success}</p>
  <div>
    <button onclick={() => scormState.completion.setCompleted()}>Set Completed</button>
    <button onclick={() => scormState.completion.setIncomplete()}>Set Incomplete</button>
    <button onclick={() => scormState.completion.setPassed()}>Set Passed</button>
    <button onclick={() => scormState.completion.setFailed()}>Set Failed</button>
  </div>
</article>
