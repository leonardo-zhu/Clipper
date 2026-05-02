# Agents Guidelines (Clipper · React Native / Expo)

## Decision Rule: Build vs Buy

### Core Principles
1. Prefer mature native components or established Expo/React Native libraries over custom implementations.
2. In this native app, prioritize native-powered interaction and rendering paths whenever possible for smoother UX.

### Default Order of Choice
1. React Native built-in component/API
2. Expo official module
3. Well-maintained community library (active, documented, production usage)
4. Custom implementation (only when 1-3 cannot meet requirements)

### When Custom Code Is Allowed
Custom implementation is allowed only if all conditions are met:
- No suitable native/built-in/library option exists, or
- Existing options cannot satisfy key product requirements after reasonable evaluation, and
- Trade-offs are documented in PR notes (why not using existing solution, risks, rollback plan).

## UX & Native Performance Standards

### Interaction
- Gestures (swipe, pan, drag, nested scroll) should use `react-native-gesture-handler` / native-backed solutions first.
- Long lists should use virtualization-capable list components (`FlatList`/`SectionList`) and avoid manual scroll constructs.
- Animations should prioritize `react-native-reanimated` or native-driver capable APIs.

### Scroll & Gesture Conflict
- Avoid hand-rolled gesture arbitration when mature components provide built-in coordination.
- For swipe-to-action rows, prefer library patterns (`Swipeable`/equivalent) over custom `PanResponder` logic.
- Prevent accidental taps during gesture states by using component lifecycle/state from gesture library first.

## Engineering Practice for This Repo

### i18n Is Mandatory
- This project is bilingual (`zh-CN`, `en-US`) and all user-facing copy must go through `src/i18n/index.ts`.
- Do not hardcode UI text directly in screen/component files (including temporary text).
- When adding a new message:
  1. add a key in `zh-CN`,
  2. add the same key in `en-US`,
  3. consume via `t()`/`tf()` in UI code.
- Existing hardcoded text should be treated as tech debt and migrated when touched.

### Checks and Their Limits
- The repository runs `check:all` in:
  - `prestart`
  - `preios`
  - `preandroid`
- `check:all` = `pnpm typecheck && pnpm check:i18n && pnpm check:state-flow`.
- `check:i18n` currently validates key alignment between `zh-CN` and `en-US`, but cannot detect hardcoded copy inside UI files.
- Therefore, passing checks does **not** mean i18n compliance is complete; reviewers/agents must still manually enforce "no hardcoded user-facing text".

### Commit Strategy (Mandatory)
- When many files are changed, commits must be split by functional scope (bugfix/feature/refactor/chore), not grouped into one large mixed commit.
- One commit should represent one coherent intent and be reviewable independently.
- Do not bundle unrelated fixes in a single commit unless they are tightly coupled and cannot be landed separately.
- Preferred sequencing:
  1. infra/chore (tooling, checks, docs),
  2. isolated bugfixes,
  3. feature changes.
- Each commit message should clearly state scope and intent.

### Implementation Checklist (before merge)
- Did we reuse an existing native/built-in/library solution?
- If not, is the reason explicitly documented?
- Is every new user-facing string i18n-based (no hardcoded copy)?
- Any gesture + scroll conflicts tested on real device?
- iOS and Android behavior both validated?
- Performance sanity check done for low-end devices / long lists?

### Dependency Policy
- Add libraries with `pnpm add` only.
- Prefer libraries with:
  - recent maintenance,
  - clear docs,
  - Expo compatibility,
  - stable API and community adoption.

### Anti-Patterns (avoid)
- Re-implementing common UI/gesture primitives already solved by RN ecosystem.
- Using heavy custom JS gesture logic where native-backed alternatives exist.
- Introducing custom behavior without real-device validation.

## Current Project Preference (Explicit)
- "Do not reinvent wheels" is the default policy.
- "Native-first UX" is the default implementation strategy.
- Any exception must be justified and documented.
