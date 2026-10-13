#!/bin/bash
set -e

git add app components
git commit -m "fix: address code review feedback on sidebar prefetching and explicit cache invalidation"
