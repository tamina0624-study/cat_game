# Supertonic browser inference

`helper.js` is vendored from https://github.com/supertone-inc/supertonic/blob/1e9799e964ea4c0dad7cde993b65c3c813a7b373/web/helper.js.
The inference change is importing `onnxruntime-web/wasm` instead of the default runtime. Repository hooks also normalize trailing whitespace and the final newline. Code is MIT licensed; see LICENSE.

The worker uses the official Supertone/supertonic-3 model revision `3cadd1ee6394adea1bd021217a0e650ede09a323` and preset F1, Japanese (`ja`). The model files (about 398 MB) are downloaded on demand and cached in the browser; they are not bundled in this repository.
Model license: https://huggingface.co/Supertone/supertonic-3/blob/3cadd1ee6394adea1bd021217a0e650ede09a323/LICENSE (OpenRAIL-M).

The app's wrapper, worker, cache, progress UI, and audio playback are separate from the vendored code. Synthesis uses five inference steps on WASM in a dedicated worker. Conversation generation still uses OpenRouter.
