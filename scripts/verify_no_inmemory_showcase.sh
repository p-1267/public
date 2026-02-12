#!/bin/bash
# G0: Runtime purity check - NO in-memory mocks/generators in runtime UI

set -e

RUNTIME_DIRS="src/components src/hooks src/lib src/contexts"
FORBIDDEN_PATTERNS=(
  "mockAIEngine"
  "scenarioGenerator"
  "showcaseSeeder"
  "richDataGenerator"
  "operationalDataGenerator"
  "showcaseDatabaseSeeder"
  "showcaseTaskSeeder"
  "simulationEngine"
  "scenarioRunner"
)

VIOLATIONS=0

echo "=== G0: Runtime Purity Check ==="

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  MATCHES=$(grep -r "$pattern" $RUNTIME_DIRS 2>/dev/null | grep -v "\.test\." | grep -v "\.spec\." || true)
  if [ ! -z "$MATCHES" ]; then
    echo "❌ FAIL: Found forbidden runtime import '$pattern'"
    echo "$MATCHES"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ $VIOLATIONS -eq 0 ]; then
  echo "✅ PASS: No forbidden runtime imports detected"
  exit 0
else
  echo "❌ FAIL: $VIOLATIONS violation(s) found"
  exit 1
fi
