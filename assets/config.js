/* ============================================================================
   Mandarin Tone Perception Test — POST-TEST CONFIGURATION
   ----------------------------------------------------------------------------
   This is the POST-test repository (Tone-Perception-Post-Test).
   The pre-test repository is untouched and keeps its own config.js.

   ⚠️  READ THIS BEFORE YOU RUN ANYTHING
   ----------------------------------------------------------------------------
   The 8 + 40 "answer: [0, 0]" values below are PLACEHOLDERS, because the
   post-test uses a NEW set of words, so every answer key has to be written
   from scratch.

   While any answer is still 0, the page shows a red banner
   ("No answer key is set ... responses will be recorded but not scored")
   and every trial is saved as "Not scored". Data will still be uploaded,
   but you would have to mark it by hand afterwards — so fill the keys in
   first, then run the real sessions.

   Fill them in one of two ways:
     1. Give me the completed 「后测答案填写模板.tsv」 (or the word list) and I
        regenerate this file for you, or
     2. Edit the answer arrays by hand: answer: [t1, t2], t1 = tone of
        syllable 1, t2 = tone of syllable 2, each 1-4.

   STEP 0 — paste your NEW Apps Script Web App URL between the quotes below.
   It is the link that ends in /exec and answers {"ok":true,"testBuild":"post",...}
   Leave it "" and the page skips the upload (the CSV download still works).
   ========================================================================== */

window.TONE_TEST_ENDPOINT = "https://script.google.com/macros/s/AKfycbw79VIcIpIDw8RJdzTRlj57qCgG5LFBSs74IN92QwabRNVZtaoToqnG1xJGWboCFAZU/exec";

const SETTINGS = {
  /* How many times a single item may be replayed. Keep identical to the pre-test. */
  maxPlays: 2,

  /* true  = present the items in a random order each session
     false = present them in the order written below */
  shuffleItems: false,

  /* true  = the Next button stays locked until a tone is chosen */
  requireAnswerBeforeNext: true
};


const AUDIO_CONFIG = {

  /* --------------------------------------------------------------------
     PRACTICE  (8 items, part 1 of 2) — the post-test's own warm-up.
     Do NOT reuse the pre-test pilot files: those were already heard.
     -------------------------------------------------------------------- */
  "post-practice": [
    { audio: "audio/Post_Practice%20(1).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Practice%20(2).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Practice%20(3).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Practice%20(4).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Practice%20(5).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Practice%20(6).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Practice%20(7).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Practice%20(8).mp3", answer: [0, 0] }   // TODO: tone of syllable 1 and 2
  ],

  /* --------------------------------------------------------------------
     POST TEST  (40 items, part 2 of 2)
     -------------------------------------------------------------------- */
  "post": [
    { audio: "audio/Post_Test%20(1).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(2).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(3).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(4).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(5).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(6).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(7).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(8).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(9).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(10).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(11).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(12).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(13).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(14).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(15).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(16).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(17).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(18).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(19).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(20).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(21).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(22).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(23).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(24).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(25).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(26).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(27).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(28).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(29).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(30).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(31).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(32).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(33).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(34).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(35).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(36).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(37).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(38).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(39).mp3", answer: [0, 0] },   // TODO: tone of syllable 1 and 2
    { audio: "audio/Post_Test%20(40).mp3", answer: [0, 0] }   // TODO: tone of syllable 1 and 2
  ]
};
