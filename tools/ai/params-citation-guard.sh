#!/usr/bin/env bash
# PostToolUse (Edit|Write) hook: params files must carry citations.
# Verify-on-encode made mechanical: any file under the rules params
# directories must contain a gov.uk (or official assets) URL and a
# retrievedOn marker, or the edit is rejected back to the model.
set -euo pipefail

file_path=$(jq -r '.tool_input.file_path // empty')
case "$file_path" in
  */packages/entitlements/src/rules/*/params/*) ;;
  *) exit 0 ;;
esac
[ -f "$file_path" ] || exit 0

if grep -q "retrievedOn" "$file_path" && grep -Eq "gov\.uk|assets\.publishing\.service\.gov\.uk" "$file_path"; then
  exit 0
fi

echo "verify-on-encode: params files need a citation block (gov.uk URL + retrievedOn date). Run /verify-rule before encoding government figures." >&2
exit 2
