#!/bin/zsh
# usage: perf/profile.sh <label> <Debug|Release>
set -u
cd "$(dirname $0)/.."
L=$1; C=$2; DD=build/P-$C
DEV=F96313F5-F366-5B4A-AA40-51E671A3AEB2; XID=00008130-000255423C43001C
xcodebuild -project ShakeViewer.xcodeproj -scheme ShakeViewer -configuration $C -destination id=$XID -derivedDataPath $DD \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=24PMG59X3P CODE_SIGN_STYLE=Automatic build 2>&1 | grep -E "\*\* BUILD|error: " | head -5
APP=$DD/Build/Products/$C-iphoneos/ShakeViewer.app
xcrun devicectl device install app --device $DEV $APP 2>&1 | grep -E "bundleID|rror" | head -2
rm -rf perf/$L.trace
for try in 1 2 3; do
  xcrun xctrace record --template 'Animation Hitches' --device $XID --time-limit 50s --output perf/$L.trace --launch -- com.shakeviewer.app -svBench YES 2>&1 | grep -E "saved|rror"
  [ -d perf/$L.trace ] && break
done
xcrun xctrace export --input perf/$L.trace --xpath '//table[@schema="hitches"]' --output perf/$L-hitches.xml >/dev/null
xcrun devicectl device copy from --device $DEV --domain-type appDataContainer --domain-identifier com.shakeviewer.app --source Documents/bench.json --destination perf/$L-bench.json 2>&1 | grep -iE "rror" | head -2
python3 perf_analyze.py perf/$L-hitches.xml perf/$L-bench.json
