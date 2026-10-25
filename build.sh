#!/usr/bin/env bash

set -eo pipefail
SCRIPT_DIR=$(cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd)

###########################################################################
# CONFIGURATION
###########################################################################

BUILD_PROJECT_FILE="$SCRIPT_DIR/src/build/_build.csproj"
TEMP_DIRECTORY="$SCRIPT_DIR/.fallout/temp"

DOTNET_INSTALL_URL="https://dot.net/v1/dotnet-install.sh"
DOTNET_CHANNEL="10.0"

export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_NOLOGO=1

###########################################################################
# EXECUTION
###########################################################################

# Use the installed dotnet CLI only if it has an SDK that satisfies global.json;
# otherwise provision a local copy under .fallout/temp.
if [ -x "$(command -v dotnet)" ] && (cd "$SCRIPT_DIR" && dotnet --version) &>/dev/null; then
    export DOTNET_EXE="$(command -v dotnet)"
else
    DOTNET_INSTALL_FILE="$TEMP_DIRECTORY/dotnet-install.sh"
    DOTNET_DIRECTORY="$TEMP_DIRECTORY/dotnet-unix"
    mkdir -p "$TEMP_DIRECTORY"
    curl -Lsfo "$DOTNET_INSTALL_FILE" "$DOTNET_INSTALL_URL"
    chmod +x "$DOTNET_INSTALL_FILE"
    "$DOTNET_INSTALL_FILE" --install-dir "$DOTNET_DIRECTORY" --channel "$DOTNET_CHANNEL" --no-path
    export DOTNET_EXE="$DOTNET_DIRECTORY/dotnet"
    export PATH="$DOTNET_DIRECTORY:$PATH"
fi

cd "$SCRIPT_DIR"
echo "Microsoft (R) .NET SDK version $("$DOTNET_EXE" --version)"

"$DOTNET_EXE" build "$BUILD_PROJECT_FILE" -nologo -clp:NoSummary --verbosity quiet
"$DOTNET_EXE" run --project "$BUILD_PROJECT_FILE" --no-build -- "$@"
