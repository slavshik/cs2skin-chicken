# Commit conventions

Format: `<gitmoji> <type>(<scope>): <imperative description>`

```text
✨ feat(game): add the pause menu
🐛 fix(audio): keep sound muted while the tab is hidden
👷 build(make): add the typecheck to the build target
```

## Rules

- Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `style`, `revert`, `chore`.
- Choose the type from the actual diff. Read it before writing the message.
- Reach for `chore` only when no other type describes the change.
- Prefer a meaningful scope: the area (`game`, `audio`, `ui`, `make`, `deps`).
- Write the description in the imperative: "add", "fix", "remove".
- Keep each commit atomic: one logical change, understandable on its own, with unrelated changes split out.
- Write about the change and its reasoning. Leave tooling and authorship out of the message.

## Gitmoji

The subject opens with a [gitmoji](https://gitmoji.dev) matching the intent. The ones this repo uses most:

| Emoji | Intent                         |
| ----- | ------------------------------ |
| ✨    | Introduce a feature            |
| 🐛    | Fix a bug                      |
| ♻️    | Refactor code                  |
| ⚡️    | Improve performance or size    |
| 💄    | Update UI, animation or assets |
| 🔊    | Add or update logging          |
| 👷    | Update the build system        |
| 🔧    | Update configuration files     |
| 📝    | Update documentation           |
| 🤡    | Mock things                    |
| ⬆️    | Upgrade dependencies           |
| 🔥    | Remove code or files           |
