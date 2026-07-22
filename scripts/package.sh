#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "${repo_dir}/manifest.json")"
output_dir="${repo_dir}/dist"
output_path="${output_dir}/youtube-latest-subscriptions-${version}.zip"
temp_dir="$(mktemp -d)"

cleanup() {
  rm -rf -- "${temp_dir}"
}
trap cleanup EXIT

mkdir -p "${output_dir}"

(
  cd "${repo_dir}"
  zip -X -q "${temp_dir}/extension.zip" \
    manifest.json \
    content.js \
    profile-registry.js \
    profiles/rich-grid-direct-items-v1.js \
    subscriptions.css \
    popup.html \
    popup.css \
    popup.js \
    report.html \
    report.css \
    report.js \
    report-client.js \
    support-config.js \
    icons/icon16.png \
    icons/icon32.png \
    icons/icon48.png \
    icons/icon128.png
)

install -m 0644 "${temp_dir}/extension.zip" "${output_path}"
unzip -tq "${output_path}"
echo "Created ${output_path}"
