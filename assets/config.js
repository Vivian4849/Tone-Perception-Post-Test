/* ============================================================================
   Mandarin Tone Perception Test - POST-TEST CONFIGURATION
   ----------------------------------------------------------------------------
   Repository: Tone-Perception-Post-Test   (the pre-test repo is untouched)

   ANSWER KEYS: FILLED IN - 8 practice + 40 test items.
   Source: the 「声调组合」 column of 感知后测.xlsx (T1-T4 pairs), entered 2026-11-02.
   Each line ends with a comment showing item number, pinyin and tone pair, so you
   can eyeball every entry against the spreadsheet.

   AUDIO FILES (uploaded by you):
       audio/Perception_Post_Pilot (1-8).mp3    -> practice   (8 items)
       audio/Perception_Post (1-40).mp3         -> main test  (40 items)
   Spaces are written as %20 because a raw space breaks the URL on GitHub Pages
   (the pre-test uses the same convention). Parentheses stay as-is.

   Do not rename or re-number the recordings: audio/Perception_Post (7).mp3 must
   always be item 7 of the main test, or every answer key after it becomes wrong.
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
     PRACTICE  (8 items, part 1 of 2) - the post-test's own warm-up.
     -------------------------------------------------------------------- */
  "post-practice": [
    { audio: "audio/Perception_Post_Pilot%20(1).mp3", answer: [4, 1] },   // 练1 nù dāi T4T1
    { audio: "audio/Perception_Post_Pilot%20(2).mp3", answer: [3, 1] },   // 练2 kěn dēn T3T1
    { audio: "audio/Perception_Post_Pilot%20(3).mp3", answer: [3, 4] },   // 练3 zǎ sào T3T4
    { audio: "audio/Perception_Post_Pilot%20(4).mp3", answer: [2, 3] },   // 练4 lái gǎo T2T3
    { audio: "audio/Perception_Post_Pilot%20(5).mp3", answer: [1, 2] },   // 练5 gōu nóu T1T2
    { audio: "audio/Perception_Post_Pilot%20(6).mp3", answer: [2, 4] },   // 练6 pái cào T2T4
    { audio: "audio/Perception_Post_Pilot%20(7).mp3", answer: [4, 2] },   // 练7 nòu bín T4T2
    { audio: "audio/Perception_Post_Pilot%20(8).mp3", answer: [1, 3] }    // 练8 māi mǐ T1T3
  ],

  /* --------------------------------------------------------------------
     POST TEST  (40 items, part 2 of 2)
     -------------------------------------------------------------------- */
  "post": [
    { audio: "audio/Perception_Post%20(1).mp3", answer: [4, 3] },   // 1 pài lěi T4T3
    { audio: "audio/Perception_Post%20(2).mp3", answer: [1, 2] },   // 2 bēn nén T1T2
    { audio: "audio/Perception_Post%20(3).mp3", answer: [2, 4] },   // 3 kóu bàn T2T4
    { audio: "audio/Perception_Post%20(4).mp3", answer: [4, 2] },   // 4 kù tá T4T2
    { audio: "audio/Perception_Post%20(5).mp3", answer: [4, 2] },   // 5 pì bén T4T2
    { audio: "audio/Perception_Post%20(6).mp3", answer: [3, 4] },   // 6 lǔ dà T3T4
    { audio: "audio/Perception_Post%20(7).mp3", answer: [1, 2] },   // 7 sāo gán T1T2
    { audio: "audio/Perception_Post%20(8).mp3", answer: [3, 4] },   // 8 pǎn gèi T3T4
    { audio: "audio/Perception_Post%20(9).mp3", answer: [3, 3] },   // 9 nǎo kǔ T3T3
    { audio: "audio/Perception_Post%20(10).mp3", answer: [2, 2] },   // 10 pán nóu T2T2
    { audio: "audio/Perception_Post%20(11).mp3", answer: [2, 1] },   // 11 gén dōu T2T1
    { audio: "audio/Perception_Post%20(12).mp3", answer: [2, 2] },   // 12 kán kú T2T2
    { audio: "audio/Perception_Post%20(13).mp3", answer: [2, 2] },   // 13 bái lá T2T2
    { audio: "audio/Perception_Post%20(14).mp3", answer: [1, 4] },   // 14 bēn nào T1T4
    { audio: "audio/Perception_Post%20(15).mp3", answer: [4, 4] },   // 15 tù pù T4T4
    { audio: "audio/Perception_Post%20(16).mp3", answer: [2, 4] },   // 16 sén dàn T2T4
    { audio: "audio/Perception_Post%20(17).mp3", answer: [3, 1] },   // 17 děn kōu T3T1
    { audio: "audio/Perception_Post%20(18).mp3", answer: [3, 3] },   // 18 cǎo cǒu T3T3
    { audio: "audio/Perception_Post%20(19).mp3", answer: [1, 3] },   // 19 kā tǎn T1T3
    { audio: "audio/Perception_Post%20(20).mp3", answer: [4, 1] },   // 20 sù mī T4T1
    { audio: "audio/Perception_Post%20(21).mp3", answer: [3, 1] },   // 21 cǎn pēn T3T1
    { audio: "audio/Perception_Post%20(22).mp3", answer: [2, 1] },   // 22 pín pāo T2T1
    { audio: "audio/Perception_Post%20(23).mp3", answer: [4, 3] },   // 23 lì kǎn T4T3
    { audio: "audio/Perception_Post%20(24).mp3", answer: [1, 1] },   // 24 dān lāi T1T1
    { audio: "audio/Perception_Post%20(25).mp3", answer: [1, 2] },   // 25 cān nín T1T2
    { audio: "audio/Perception_Post%20(26).mp3", answer: [4, 3] },   // 26 dèi cěn T4T3
    { audio: "audio/Perception_Post%20(27).mp3", answer: [2, 3] },   // 27 páo lǒu T2T3
    { audio: "audio/Perception_Post%20(28).mp3", answer: [2, 3] },   // 28 mí fǔ T2T3
    { audio: "audio/Perception_Post%20(29).mp3", answer: [4, 1] },   // 29 làn cū T4T1
    { audio: "audio/Perception_Post%20(30).mp3", answer: [2, 1] },   // 30 péi zēn T2T1
    { audio: "audio/Perception_Post%20(31).mp3", answer: [4, 4] },   // 31 cà nèi T4T4
    { audio: "audio/Perception_Post%20(32).mp3", answer: [3, 2] },   // 32 mǎ léi T3T2
    { audio: "audio/Perception_Post%20(33).mp3", answer: [3, 2] },   // 33 nǎo fén T3T2
    { audio: "audio/Perception_Post%20(34).mp3", answer: [1, 3] },   // 34 nāo tǎn T1T3
    { audio: "audio/Perception_Post%20(35).mp3", answer: [3, 3] },   // 35 něi dǎi T3T3
    { audio: "audio/Perception_Post%20(36).mp3", answer: [1, 4] },   // 36 nāo zàn T1T4
    { audio: "audio/Perception_Post%20(37).mp3", answer: [4, 4] },   // 37 nào pèi T4T4
    { audio: "audio/Perception_Post%20(38).mp3", answer: [1, 1] },   // 38 zān nā T1T1
    { audio: "audio/Perception_Post%20(39).mp3", answer: [1, 1] },   // 39 dēn cāi T1T1
    { audio: "audio/Perception_Post%20(40).mp3", answer: [3, 4] }    // 40 tǒu nìn T3T4
  ]
};
