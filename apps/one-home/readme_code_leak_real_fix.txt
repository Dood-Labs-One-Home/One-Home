ONE HOME — REAL CODE LEAK FIX

Confirmed cause:
1. Two wallet scripts had a broken document.write() string. Later injected
   <script> blocks were inserted inside that unclosed string.
2. The remainder of the wallet JavaScript then appeared outside a script
   tag as visible text at the bottom of pages.
3. 35 later style/script blocks had also been appended after the document's
   closing </html> tag.

Exact repair:
- Rebuilt both broken document.write() lines as valid JavaScript.
- Restored the affected wallet scripts as complete script elements.
- Kept one clean copy of the independent profile/dashboard/media safety blocks.
- Moved all valid late styles/scripts back inside <body>.
- The file now ends cleanly with one real closing </body></html> sequence.

No visual redesign was made in this repair.
