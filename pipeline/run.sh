#!/usr/bin/env sh
# Decompose input/source.rvt, rebuild it in a new project and compare the two. See README.md.
set -e
cd "$(dirname "$0")"
PYREVIT="/c/Program Files/pyRevit-Master/bin/pyrevit"
HERE="$(cygpath -w "$PWD")"
mkdir -p out

"$PYREVIT" run "$HERE\\extract.py" "$HERE\\input\\source.rvt" --revit=2027 --purge
"$PYREVIT" run "$HERE\\rebuild.py" "$HERE\\input\\source.rvt" --revit=2027 --purge
"$PYREVIT" run "$HERE\\extract.py" "$HERE\\out\\rebuilt.rvt" --revit=2027 --purge
python compare.py
