#!/bin/bash
# استعمال: bash push_github.sh TOKEN_ديالك

TOKEN=$1
REPO="https://temanchofo-spec:${TOKEN}@github.com/temanchofo-spec/bot-lkher.git"

if [ -z "$TOKEN" ]; then
  echo "❌ خاصك تعطي التوكن: bash push_github.sh TOKEN"
  exit 1
fi

echo "📦 جهّز الملفات..."
rm -rf /tmp/pushbot && mkdir /tmp/pushbot
cd /home/runner/workspace
cp -r . /tmp/pushbot/ 2>/dev/null
rm -rf /tmp/pushbot/.git /tmp/pushbot/node_modules

echo "🔧 git init..."
cd /tmp/pushbot
git init -q
git checkout -q -b main

cat > .gitignore << 'EOF'
node_modules/
*.log
.env
EOF

git add . -A
git commit -q -m "Nero Bot v2.5"

echo "🚀 رفع للـ GitHub..."
git remote add origin "$REPO"
git push origin main --force

if [ $? -eq 0 ]; then
  echo "✅ تم الرفع بنجاح!"
else
  echo "❌ فشل الرفع — تحقق من التوكن"
fi

cd /home/runner/workspace
rm -rf /tmp/pushbot
