#!/usr/bin/env sh
set -eu

if [ -z "${NPM_TOKEN:-}" ] && [ ! -f "$HOME/.npmrc" ]; then
  echo "error: no NPM_TOKEN and no ~/.npmrc — npm deprecate needs publish rights on @ferrlabs" >&2
  exit 1
fi

DRY_RUN=${DRY_RUN:-0}

for pair in \
  "@ferrlabs/mcp-vault:@ferrvault/mcp" \
  "@ferrlabs/mcp-track:@ferrtrack/mcp" \
  "@ferrlabs/mcp-growth:@ferrgrowth/mcp" \
  "@ferrlabs/mcp-fleet:@ferrfleet/mcp"
do
  old=${pair%%:*}
  new=${pair##*:}
  message="Renamed to $new. This name receives no further releases; install $new instead."
  if [ "$DRY_RUN" = "1" ]; then
    echo "would run: npm deprecate $old \"$message\""
  else
    echo "deprecating $old -> $new"
    npm deprecate "$old" "$message"
  fi
done
