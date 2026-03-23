<script lang="ts">
  import { scormState } from '$lib/scorm/index.js'
  import { coursePlayer } from '$lib/player/index.js'
</script>

<article>
  <h1>Welcome</h1>
  <dl>
    <dt>Student</dt>
    <dd>{scormState.student.name || '(unknown)'}</dd>
    <dt>Student ID</dt>
    <dd>{scormState.student.id || '(unknown)'}</dd>
    <dt>SCORM mode</dt>
    <dd>{scormState.mode}</dd>
    <dt>Session mode</dt>
    <dd>{scormState.session.mode}</dd>
    <dt>SCORM initialized</dt>
    <dd>{scormState.isInitialized ? 'Yes' : 'No'}</dd>
    <dt>Slide</dt>
    <dd>{(coursePlayer.activeSlide?.index ?? 0) + 1} of {coursePlayer.activeSlide?.total ?? 1}</dd>
  </dl>
</article>
