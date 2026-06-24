# MagresView 2 Context

## Glossary

*This file captures the agreed-upon domain language for MagresView 2. It is intentionally free of implementation details.*

- **Session** — A snapshot of the current workspace. It captures enough state to reload the same model files and reproduce the same scientific visualization (camera, atom selection, and all visualization settings for MS, EFG, Dipolar, J-Coupling, Euler, and plots). It does not include UI chrome such as theme, active sidebar, open modals, or interaction mode. Advanced mode is a user preference, not workspace state.
