#!/bin/bash

# 루트 디렉토리에 .gitignore 파일 생성 및 패턴 추가 스크립트
GITIGNORE_FILE=".gitignore"

echo "🔒 보안 및 불필요한 파일 제외를 위해 .gitignore 설정을 시작합니다..."

# 추가할 Git 무시 패턴 목록
PATTERNS=(
    "# Environments"
    "*.env"
    "*.env.*"
    ""
    "# Python / Raspberry Pi"
    "venv/"
    "__pycache__/"
    "*.pyc"
    ""
    "# Node.js / Next.js / Web"
    "node_modules/"
    ".next/"
    "npm-debug.log*"
    "yarn-error.log*"
    ""
    "# OS files"
    ".DS_Store"
    "Thumbs.db"
)

# 파일이 없으면 새로 생성
if [ ! -f "$GITIGNORE_FILE" ]; then
    touch "$GITIGNORE_FILE"
    echo "📄 $GITIGNORE_FILE 파일을 새로 생성했습니다."
fi

# 패턴 추가 (이미 존재하는 패턴은 건너뛰기)
for pattern in "${PATTERNS[@]}"; do
    grep -qFx "$pattern" "$GITIGNORE_FILE" || echo "$pattern" >> "$GITIGNORE_FILE"
done

echo "✨ .gitignore 설정이 완료되었습니다! (추가된 패턴들이 안전하게 보호됩니다)"