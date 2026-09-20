# Intentional dead code (Ainomics / DCA fixture)

These modules are **not imported** by `src/` application routes or `frontend/`.
They exist so a DCA run can classify them as unused / confirmed-unused and Ainomics
can show maintenance opportunity and utilisation metrics.

Do not wire them into production.
