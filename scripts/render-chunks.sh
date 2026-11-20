#!/bin/bash
cd /home/claude/build/e01
mkdir -p out/chunks
N=11445; C=1000
for ((s=0; s<N; s+=C)); do
  e=$((s+C-1)); if [ $e -ge $((N-1)) ]; then e=$((N-1)); fi
  f=$(printf "out/chunks/c_%05d.mp4" $s)
  if [ -f "$f" ]; then echo "skip $f"; continue; fi
  echo "$(date +%T) start $s-$e"
  npx remotion render src/index.ts E01 "$f.tmp.mp4" --frames=$s-$e --codec=h264 --crf=23 --muted --concurrency=2 --browser-executable=/usr/bin/google-chrome --gl=swangle > out/chunks/log_$s.txt 2>&1 && mv "$f.tmp.mp4" "$f"
  echo "$(date +%T) done $s-$e $(ls -la $f 2>/dev/null | awk '{print $5}')"
done
echo ALLDONE
