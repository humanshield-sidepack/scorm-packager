<script lang="ts">
  import { scormState } from '$lib/scorm/index.js'
</script>

<article>
  <h1>Summary</h1>
  <dl>
    <dt>Location</dt>
    <dd>{scormState.location || '(not set)'}</dd>
    <dt>Raw score</dt>
    <dd>{scormState.score.raw ?? 'not set'}</dd>
    <dt>Scaled score</dt>
    <dd>{scormState.score.scaled ?? 'not set'}</dd>
    <dt>Completion</dt>
    <dd>{scormState.completion.status}</dd>
    <dt>Success</dt>
    <dd>{scormState.completion.success}</dd>
  </dl>
</article>
